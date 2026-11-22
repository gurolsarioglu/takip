'use strict';
// Terminal sayfasının (web/public/terminal.html) sunucu tarafı: /api/t/* uçları, tek Binance istek kuyruğu, önbellek, izleme listesi.
// server.cjs içinden çağrılır: terminal.handle(req, res, u, { q, send, readBody, log, fetch? }) → yol eşleşmezse false.
// Binance sınırları (GOREV-TERMINAL.md §4): istekler sırayla, aralık ≥150 ms (/futures/data/* ≥700 ms), ağırlık >1.500 → dakika sonuna kadar
// bekleme, 429/418 → yeniden deneme yok, süre boyunca 503. Tarayıcı Binance'e hiç bağlanmaz. Testler: node db/test-terminal.cjs
const FAPI = 'https://fapi.binance.com';
const IVS = new Set(['5m', '15m', '1h', '4h', '1d', '1w', '1M']);
const PERIODS = new Set(['5m', '15m', '1h', '4h', '1d']);
const GAP_MS = 150, FD_GAP_MS = 700, WEIGHT_LIM = 1500, MAX_PENDING = 40, CACHE_MAX = 400, LIST_MAX = 100;
const SQL = {
  reg: "SELECT to_regclass('izleme') AS r",
  create: 'CREATE TABLE IF NOT EXISTS izleme (symbol text PRIMARY KEY, sira serial, eklendi timestamptz NOT NULL DEFAULT now())',
  list: 'SELECT symbol FROM izleme ORDER BY sira',
  add: 'INSERT INTO izleme (symbol) VALUES ($1) ON CONFLICT (symbol) DO NOTHING',
  del: 'DELETE FROM izleme WHERE symbol = $1',
  // alt paneller: db/turev.cjs'nin tabloları (6 saatte bir dolar). Kova başına SON değer, zaman = kovadaki son kaydın zamanı (ileriye bakma olmasın).
  ls: `SELECT (extract(epoch FROM max(l.t)) * 1000)::float8 AS t, (array_agg(l.top_long ORDER BY l.t DESC))[1] AS a, (array_agg(l.global_long ORDER BY l.t DESC))[1] AS g,
       (array_agg(p.top_pos_long ORDER BY l.t DESC))[1] AS p FROM ls_15m l LEFT JOIN lsp_15m p ON p.symbol = l.symbol AND p.t = l.t
       WHERE l.symbol = $1 AND l.t >= $2 GROUP BY date_bin($3::interval, l.t, timestamptz 'epoch') ORDER BY 1`,
  // akış toplayıcının (db/akis.cjs) tabloları
  akisBig: `SELECT (extract(epoch FROM t) * 1000)::float8 AS t, fiyat, usd, yon FROM buyuk_islem WHERE symbol = $1 AND t > now() - interval '15 minutes' ORDER BY t`,
  akisLiq: `SELECT (extract(epoch FROM t) * 1000)::float8 AS t, yon, usd FROM tasfiye WHERE symbol = $1 AND t > now() - interval '60 minutes' ORDER BY t`,
  akisKap: `SELECT count(*) FILTER (WHERE t > now() - interval '16 minutes' AND bagli = toplam AND toplam > 0)::int AS d15,
       count(*) FILTER (WHERE bagli = toplam AND toplam > 0)::int AS d60, (extract(epoch FROM max(t)) * 1000)::float8 AS son FROM akis_kapsam WHERE t > now() - interval '61 minutes'`,
  liq1h: `SELECT symbol, coalesce(sum(usd) FILTER (WHERE yon = 'L'), 0)::float8 AS l, coalesce(sum(usd) FILTER (WHERE yon = 'S'), 0)::float8 AS s FROM tasfiye WHERE t > now() - interval '1 hour' GROUP BY symbol`,
  oi: `SELECT (extract(epoch FROM max(t)) * 1000)::float8 AS t, (array_agg(oi_usd ORDER BY t DESC))[1] AS v FROM oi_5m
       WHERE symbol = $1 AND t >= $2 GROUP BY date_bin($3::interval, t, timestamptz 'epoch') ORDER BY 1`,
};
const TF_SEC = { '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400, '1w': 86400, '1M': 86400 };
// Trader Positioning = büyük hesapların hesap oranı, Market Exposure = tüm hesaplar (rules/four-s.cjs ile aynı tanım), Long/short positions = büyük hesapların pozisyon oranı
const RATIO = [['top', 'topLongShortAccountRatio'], ['glob', 'globalLongShortAccountRatio'], ['pos', 'topLongShortPositionRatio']];
const err = (code, msg, extra) => Object.assign(new Error(msg), { code }, extra || {});
const cleanSym = v => { const s = String(v == null ? '' : v).toUpperCase().replace(/[^A-Z0-9]/g, ''); return s.length >= 2 && s.length <= 30 ? s : null; };
const clampInt = (v, lo, hi, def) => { if (v == null || v === '') return def; const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : null; };

function create(opt = {}) {
  const now = opt.now || Date.now, sleep = opt.sleep || (ms => new Promise(r => setTimeout(r, ms))), timeoutMs = opt.timeoutMs || 10e3;
  // ---------- Binance kuyruğu ----------
  const B = { queue: [], busy: false, lastAt: -1e15, lastFdAt: -1e15, weight: 0, weightUntil: 0, blockUntil: 0, blockWhy: '', sent: 0 };
  const retryAfter = () => Math.max(1, Math.ceil((B.blockUntil - now()) / 1000));
  const blockedErr = () => err(503, `Binance sınırı: ${retryAfter()} sn bekleniyor (${B.blockWhy})`, { retryAfter: retryAfter() });
  function binance(path, fetchFn, logFn) {
    if (now() < B.blockUntil) return Promise.reject(blockedErr());
    if (B.queue.length >= MAX_PENDING) return Promise.reject(err(503, 'Terminal istek kuyruğu dolu; birazdan yeniden denenecek', { retryAfter: 3 }));
    return new Promise((resolve, reject) => { B.queue.push({ path, fd: path.startsWith('/futures/data/'), fetchFn, logFn, resolve, reject }); pump(); });
  }
  async function pump() {
    if (B.busy) return; B.busy = true;
    try {
      while (B.queue.length) {
        if (now() < B.blockUntil) { const e = blockedErr(); for (const j of B.queue.splice(0)) j.reject(e); break; }
        if (now() < B.weightUntil) { await sleep(B.weightUntil - now()); continue; }
        const j = B.queue[0];
        const wait = Math.max(B.lastAt + GAP_MS, j.fd ? B.lastFdAt + FD_GAP_MS : 0) - now();
        if (wait > 0) { await sleep(wait); continue; }   // döngü başına dön: bu arada blok/ağırlık durumu değişmiş olabilir
        B.queue.shift(); B.lastAt = now(); if (j.fd) B.lastFdAt = B.lastAt; B.sent++;
        try { j.resolve(await send1(j)); } catch (e) { j.reject(e); }
      }
    } finally { B.busy = false; }
  }
  async function send1(j) {
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), timeoutMs);
    let r;
    try { r = await j.fetchFn(FAPI + j.path, { signal: ac.signal, headers: { accept: 'application/json' } }); }
    catch (e) { throw err(502, ac.signal.aborted ? `Binance ${timeoutMs / 1000} sn içinde yanıt vermedi` : 'Binance\'e ulaşılamadı: ' + e.message); }
    finally { clearTimeout(tm); }
    const h = k => (r.headers && typeof r.headers.get === 'function' ? r.headers.get(k) : null);
    const w = Number(h('x-mbx-used-weight-1m'));
    if (Number.isFinite(w) && w > 0) { B.weight = w; if (w > WEIGHT_LIM) { B.weightUntil = Math.max(B.weightUntil, (Math.floor(now() / 60e3) + 1) * 60e3); j.logFn(`terminal: Binance ağırlığı ${w} > ${WEIGHT_LIM}, kuyruk dakika sonuna kadar bekliyor`); } }
    if (r.status === 429 || r.status === 418) {
      const ra = Number(h('retry-after')), sec = Number.isFinite(ra) && ra > 0 ? ra : (r.status === 429 ? 30 : 120);
      B.blockUntil = Math.max(B.blockUntil, now() + sec * 1000 + (r.status === 429 ? 5000 : 0)); B.blockWhy = 'HTTP ' + r.status;
      j.logFn(`terminal: Binance HTTP ${r.status} (retry-after ${sec} sn) — ${retryAfter()} sn hiç istek atılmayacak`);
      throw blockedErr();
    }
    let body = null, txt = '';
    try { txt = await r.text(); body = txt ? JSON.parse(txt) : null; } catch { body = null; }
    if (!r.ok) throw err(502, `Binance hatası (HTTP ${r.status})${body && body.msg ? ': ' + body.msg : txt ? ': ' + txt.slice(0, 120) : ''}`);
    if (body == null) throw err(502, 'Binance yanıtı okunamadı');
    return body;
  }
  // ---------- Önbellek + uçuştaki istekler ----------
  const cache = new Map(), inflight = new Map();
  function cached(key, ttl, path, deps, tf) {
    const c = cache.get(key); if (c && now() - c.at < ttl) return Promise.resolve(c.data);
    if (inflight.has(key)) return inflight.get(key);
    const p = binance(path, deps.fetch || globalThis.fetch, deps.log || console.log).then(raw => {
      const data = tf ? tf(raw) : raw;
      cache.delete(key); cache.set(key, { at: now(), data });
      while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
      return data;
    }).finally(() => inflight.delete(key));
    inflight.set(key, p); return p;
  }
  // ---------- Uçlar ----------
  let lastTickers = null;
  const tickers = deps => cached('tickers', 20e3, '/fapi/v1/ticker/24hr', deps, raw => {
    if (!Array.isArray(raw)) throw err(502, 'Binance ticker yanıtı beklenen biçimde değil');
    const rows = {}, t = now();
    for (const x of raw) {
      if (!x || typeof x.symbol !== 'string' || !/USD[TC]$/.test(x.symbol)) continue;   // motorun evreni: USDT + USDC
      if (Number.isFinite(Number(x.closeTime)) && t - Number(x.closeTime) > 2 * 864e5) continue; // 2 gündür işlem görmeyen (kaldırılmış) sembol
      rows[x.symbol] = [num(x.lastPrice), num(x.priceChangePercent), num(x.quoteVolume)];
    }
    return (lastTickers = { at: t, rows });
  });
  // Evren: motorun taradığı liste (engine/market.cjs ile aynı süzgeç: PERPETUAL, USDT|USDC, TRADING) + delist bilgisi.
  // Binance, delist duyurusundan sonra exchangeInfo'daki deliveryDate'i kapanış zamanına çeker (normalde 2100 yılı). Ağırlık 1, önbellek 5 dk.
  const evren = deps => cached('evren', 300e3, '/fapi/v1/exchangeInfo', deps, raw => {
    if (!raw || !Array.isArray(raw.symbols)) throw err(502, 'Binance exchangeInfo yanıtı beklenen biçimde değil');
    const rows = {}, t = now(), far = t + 5 * 365 * 864e5; let n = 0;
    for (const x of raw.symbols) {
      if (!x || typeof x.symbol !== 'string' || !/PERPETUAL/.test(String(x.contractType)) || (x.quoteAsset !== 'USDT' && x.quoteAsset !== 'USDC')) continue;
      const dd = Number(x.deliveryDate), delist = Number.isFinite(dd) && dd > 0 && dd < far ? dd : 0, tr = x.status === 'TRADING';
      if (!tr && !(delist && t - delist < 864e5)) continue;   // işlem görmeyenlerden yalnız son 24 saatte kapananlar (uyarı görünsün diye)
      rows[x.symbol] = [tr ? 1 : 0, delist, num(x.onboardDate) || 0]; if (tr) n++;
    }
    return { at: t, n, rows };
  });
  async function klines(p, deps) {
    const sym = cleanSym(p.get('symbol')); if (!sym) throw err(400, 'Geçersiz sembol');
    const iv = p.get('interval') || ''; if (!IVS.has(iv)) throw err(400, 'Geçersiz zaman dilimi (5m 15m 1h 4h 1d 1w 1M)');
    const limit = clampInt(p.get('limit'), 1, 1000, 500), endS = p.get('end');
    let end = null; if (endS != null && endS !== '') { end = Math.round(Number(endS)); if (!Number.isFinite(end) || end <= 0) throw err(400, 'Geçersiz end'); }
    const path = `/fapi/v1/klines?symbol=${sym}&interval=${iv}&limit=${limit}${end ? `&endTime=${end}` : ''}`;
    return cached('k|' + path, end ? 300e3 : 4e3, path, deps, raw => {
      if (!Array.isArray(raw)) throw err(502, 'Binance mum yanıtı beklenen biçimde değil');
      return raw.map(k => [Number(k[0]), Number(k[1]), Number(k[2]), Number(k[3]), Number(k[4]), Number(k[7]), Number(k[10])]);   // 7. alan: piyasa ALIŞ tutarı (USDT) → CVD
    });
  }
  const oiTf = raw => { if (!Array.isArray(raw)) throw err(502, 'Binance OI yanıtı beklenen biçimde değil'); return raw.map(x => [Number(x.timestamp), num(x.sumOpenInterest), num(x.sumOpenInterestValue)]).filter(x => Number.isFinite(x[0])).sort((a, b) => a[0] - b[0]); };
  async function oi(p, deps) {
    const sym = cleanSym(p.get('symbol')); if (!sym) throw err(400, 'Geçersiz sembol');
    const period = p.get('period') || ''; if (!PERIODS.has(period)) throw err(400, 'Geçersiz dönem (5m 15m 1h 4h 1d)');
    const limit = clampInt(p.get('limit'), 1, 500, 500);
    const path = `/futures/data/openInterestHist?symbol=${sym}&period=${period}&limit=${limit}`;
    return cached('o|' + path, 60e3, path, deps, oiTf);
  }
  // Grafik alt panelleri (Market Exposure, Funding, OI, Trader Positioning). Geçmiş veritabanından; veritabanının bittiği yerden bugüne
  // Binance'ten küçük parçalar: 3 oran ucu (5m × 288) + openInterestHist 5m × 500 (OI paneliyle aynı anahtar) → coin başına 5 dk'da 4 /futures/data isteği.
  // Funding geçmişi /fapi/v1/fundingRate (1.000 olay, 10 dk önbellek). Binance kısmı başarısız olursa veritabanı kısmı yine döner (eksik alanında neden).
  // Binance'in 5 dk'lık üç long/short oranı (son 24 sa) → [[t, top, glob, pos] …] (%). Önbellek 5 dk, anahtarlar turev ile ortak.
  async function ratiosLive(sym, f, lg) {
    const ser = [];
    for (const [k, ep] of RATIO) { const path = `/futures/data/${ep}?symbol=${sym}&period=5m&limit=288`; ser.push([k, await cached('r|' + path, 300e3, path, { fetch: f, log: lg }, raw => { if (!Array.isArray(raw)) throw err(502, 'Binance oran yanıtı beklenen biçimde değil'); return raw.map(x => [Number(x.timestamp), num(x.longAccount != null ? x.longAccount : x.longPosition)]).filter(x => Number.isFinite(x[0])).sort((a, b) => a[0] - b[0]); })]); }
    const m = new Map(), col = { top: 1, glob: 2, pos: 3 };
    for (const [k, rows] of ser) for (const [ts, v] of rows) { let r = m.get(ts); if (!r) m.set(ts, r = [ts, null, null, null]); r[col[k]] = v == null ? null : v * 100; }
    return [...m.values()].sort((a, b) => a[0] - b[0]);
  }
  // V1.19.0: GET /api/t/oranlar?symbol → { son: { t, top, glob, pos } } — coin kartı penceresi için (veritabanı/OI/funding yok)
  async function oranlar(p, deps) {
    const sym = cleanSym(p.get('symbol')); if (!sym) throw err(400, 'Geçersiz sembol');
    const L = await ratiosLive(sym, deps.fetch || globalThis.fetch, deps.log || console.log);
    if (!L.length) return { son: null };
    const last = c => { for (let i = L.length - 1; i >= 0; i--) if (L[i][c] != null) return L[i][c]; return null; };
    return { son: { t: L[L.length - 1][0], top: last(1), glob: last(2), pos: last(3) } };
  }
  async function turev(p, deps) {
    const sym = cleanSym(p.get('symbol')); if (!sym) throw err(400, 'Geçersiz sembol');
    const tf = p.get('tf') || ''; if (!TF_SEC[tf]) throw err(400, 'Geçersiz zaman dilimi');
    const t = now(), from = Math.max(t - 200 * 864e5, clampInt(p.get('from'), 0, t, t - 30 * 864e5)), lb = Math.max(900, TF_SEC[tf]), ob = Math.max(300, TF_SEC[tf]);
    const out = { ls: [], oi: [], fr: [], lsStep: lb * 1000, oiStep: ob * 1000, son: null, frIv: null, db: false, eksik: [] };
    const miss = (what, e) => { out.eksik.push(what + ': ' + ((e && e.message) || e)); if (e && e.retryAfter) out.retryAfter = Math.max(out.retryAfter || 0, e.retryAfter); };
    if (deps.q) try {
      const [a, b] = await Promise.all([deps.q(SQL.ls, [sym, new Date(from), lb + ' seconds']), deps.q(SQL.oi, [sym, new Date(from), ob + ' seconds'])]);
      const pc = v => v == null ? null : Number(v) * 100;
      out.ls = a.map(r => [Number(r.t), pc(r.a), pc(r.g), pc(r.p)]); out.oi = b.map(r => [Number(r.t), num(r.v)]); out.db = true;
    } catch (e) { miss('veritabanı', e); }
    const f = deps.fetch || globalThis.fetch, lg = deps.log || console.log;
    // oranlar: veritabanının son kaydından sonrası
    // oranlar 5 dk'lık: Binance bunları 5 dk'da bir hesaplar (daha sık değer yok); 288 × 5 dk = 24 sa
    try {
      const live = await ratiosLive(sym, f, lg), lastDb = out.ls.length ? out.ls[out.ls.length - 1][0] : -1;
      for (const r of live) if (r[0] > lastDb && r[0] >= from) out.ls.push(r);
    } catch (e) { miss('long/short', e); }
    // son değerler: üç uç farklı anlarda güncellenebilir → her alan için en yeni dolu değer
    if (out.ls.length) { const L = out.ls, last = c => { for (let i = L.length - 1; i >= 0; i--) if (L[i][c] != null) return L[i][c]; return null; }; out.son = { t: L[L.length - 1][0], top: last(1), glob: last(2), pos: last(3) }; }
    try {
      const path = `/futures/data/openInterestHist?symbol=${sym}&period=5m&limit=500`, rows = await cached('o|' + path, 300e3, path, { fetch: f, log: lg }, oiTf), lastDb = out.oi.length ? out.oi[out.oi.length - 1][0] : -1;
      for (const r of rows) if (r[0] > lastDb && r[0] >= from && r[2] != null) out.oi.push([r[0], r[2]]);
    } catch (e) { miss('OI', e); }
    try {
      const path = `/fapi/v1/fundingRate?symbol=${sym}&limit=1000`, rows = await cached('f|' + path, 600e3, path, { fetch: f, log: lg }, raw => { if (!Array.isArray(raw)) throw err(502, 'Binance funding yanıtı beklenen biçimde değil'); return raw.map(x => [Number(x.fundingTime), num(x.fundingRate) == null ? null : num(x.fundingRate) * 100]).filter(x => Number.isFinite(x[0]) && x[1] != null).sort((a, b) => a[0] - b[0]); });
      out.fr = rows.filter(r => r[0] >= from - 864e5);
      if (rows.length >= 2) out.frIv = Math.round((rows[rows.length - 1][0] - rows[rows.length - 2][0]) / 3600e3);
    } catch (e) { miss('funding', e); }
    return out;
  }
  // Emir defteri: ilk 100 kademede alış / satış tutarı (ağırlık 5, 10 sn önbellek)
  async function ozet(p, deps) {
    const sym = cleanSym(p.get('symbol')); if (!sym) throw err(400, 'Geçersiz sembol');
    return cached('d|' + sym, 10e3, `/fapi/v1/depth?symbol=${sym}&limit=100`, deps, raw => {
      if (!raw || !Array.isArray(raw.bids) || !Array.isArray(raw.asks)) throw err(502, 'Binance emir defteri yanıtı beklenen biçimde değil');
      const s = a => a.reduce((x, r) => x + Number(r[0]) * Number(r[1]), 0); return { bid: s(raw.bids), ask: s(raw.asks), t: now() };
    });
  }
  async function coin(p, deps) {
    const sym = cleanSym(p.get('symbol')); if (!sym) throw err(400, 'Geçersiz sembol');
    const [o, pi] = await Promise.all([cached('ci|' + sym, 10e3, `/fapi/v1/openInterest?symbol=${sym}`, deps), cached('cp|' + sym, 10e3, `/fapi/v1/premiumIndex?symbol=${sym}`, deps)]);
    const oiN = num(o && o.openInterest), mark = num(pi && pi.markPrice), fr = num(pi && pi.lastFundingRate), nf = num(pi && pi.nextFundingTime);
    return { oi: oiN, oiUsd: oiN != null && mark != null ? oiN * mark : null, mark, funding: fr != null ? fr * 100 : null, nextFunding: nf || null };
  }
  // ---------- İzleme listesi (veritabanı) ----------
  let ready = null, lock = Promise.resolve();
  const dbErr = e => err(503, 'İzleme listesi veritabanına ulaşılamadı: ' + (e && e.message || e));
  function ensure(q) {
    if (!ready) ready = (async () => {
      const r = await q(SQL.reg, []);
      if (r && r[0] && r[0].r) return;
      await q(SQL.create, []);
      for (const s of ['BTCUSDT', 'ETHUSDT']) await q(SQL.add, [s]);   // ilk açılış: tablo yeni kurulduysa
    })().catch(e => { ready = null; throw e; });
    return ready;
  }
  const serial = fn => { const r = lock.then(fn, fn); lock = r.catch(() => { }); return r; };
  async function list(q) { try { await ensure(q); return (await q(SQL.list, [])).map(r => r.symbol); } catch (e) { throw e.code ? e : dbErr(e); } }
  async function izlemePost(b, deps) {
    const sym = cleanSym(b && b.symbol); if (!sym) throw err(400, 'Geçersiz sembol');
    if (b.action === 'ekle') {
      const tk = lastTickers || await tickers(deps);
      if (!tk.rows[sym]) throw err(400, `${sym} Binance vadeli listesinde yok`);
      return serial(async () => {
        const cur = await list(deps.q); if (cur.includes(sym)) return cur;
        if (cur.length >= LIST_MAX) throw err(400, `İzleme listesi en çok ${LIST_MAX} coin alır`);
        try { await deps.q(SQL.add, [sym]); } catch (e) { throw dbErr(e); }
        return list(deps.q);
      });
    }
    if (b.action === 'sil') return serial(async () => { await list(deps.q); try { await deps.q(SQL.del, [sym]); } catch (e) { throw dbErr(e); } return list(deps.q); });
    throw err(400, "Bilinmeyen işlem (ekle | sil)");
  }

  // ---------- Canlı fiyat (V1.10.0) ----------
  // Sayfa GET /api/t/canli?symbol=X ile SSE (text/event-stream) açar. Sunucu Binance'e TEK WebSocket bağlantısı tutar
  // (wss://fstream.binance.com/market/stream; motorla aynı yol), yalnız izlenen coinlerin <sym>@aggTrade akışına SUBSCRIBE olur,
  // işlemleri 100 ms'lik paketlerde toplar: { s, T (son işlem zamanı), c, h, l, q (USDT hacim), n (işlem sayısı) }.
  // V1.12.0: aynı bağlantıdan <sym>@markPrice@1s → { s, typ: 'm', r (tahmini funding %), T (sonraki ödeme), p (mark) } ve
  // <sym>@ticker (1 sn) → { s, typ: 't', c, P (24s %), q (24s USDT hacim) } doğrudan iletilir.
  // V1.13.0 (kayan yazı): paket ayrıca qb / qs (piyasa ALIŞ / SATIŞ tutarı; aggTrade m=true → agresif taraf satıcı) ve
  // big = [[T, fiyat, USD, 1 alış | -1 satış]] (≥ 10.000 USD tek işlemler, paket başına en çok 20) taşır.
  // Tüm piyasanın tasfiyeleri (!forceOrder@arr; Binance coin başına saniyede en fazla 1 tasfiye bildirir → toplamlar ALT SINIRDIR)
  // 60 dk tutulur: seçili coinin tasfiyesi { s, typ: 'l', k: 'L' long | 'S' short, usd, p, T }, piyasa özeti 15 sn'de bir ve bağlanınca
  // { typ: 'g', since, m5: {L, S}, h1: {L, S}, top: [[sembol, USD]] } (izleyen yokken ölçülmez; since = ölçüm başlangıcı).
  // REST ağırlığı yok. Bağlantı 45 sn sessiz kalırsa kapatılıp 3 sn sonra yeniden açılır; izleyen kalmayınca 60 sn sonra kapanır.
  const WSURL = opt.wsUrl || 'wss://fstream.binance.com/market/stream', WS = opt.WebSocket || globalThis.WebSocket, PACK_MS = 100, MAX_SSE = 20;
  const L = { liq: [], liqSince: 0, gliq: false, subs: new Map(), ws: null, live: new Set(), id: 0, lastMsg: 0, idleAt: 0, opened: 0, msgs: 0, sent: 0, err: '', acc: new Map(), timer: null, tick: null };
  function lsend(m) { try { if (L.ws && L.ws.readyState === 1) L.ws.send(JSON.stringify(m)); } catch { } }
  const streams = s => [s.toLowerCase() + '@aggTrade', s.toLowerCase() + '@markPrice@1s', s.toLowerCase() + '@ticker'];
  const lpush = (s, o) => { const set = L.subs.get(s); if (!set) return; const line = 'data: ' + JSON.stringify(o) + '\n\n'; for (const r of set) { try { r.write(line); L.sent++; } catch { } } };
  function lsync() {
    if (!L.ws || L.ws.readyState !== 1) return;
    if (!L.gliq) { lsend({ method: 'SUBSCRIBE', params: ['!forceOrder@arr'], id: ++L.id }); L.gliq = true; if (!L.liqSince) L.liqSince = now(); }
    const add = [...L.subs.keys()].filter(s => !L.live.has(s)), rem = [...L.live].filter(s => !L.subs.has(s));
    if (add.length) { lsend({ method: 'SUBSCRIBE', params: add.flatMap(streams), id: ++L.id }); add.forEach(s => L.live.add(s)); }
    if (rem.length) { lsend({ method: 'UNSUBSCRIBE', params: rem.flatMap(streams), id: ++L.id }); rem.forEach(s => L.live.delete(s)); }
  }
  function lflush() {
    L.timer = null;
    for (const [s, a] of L.acc) { const set = L.subs.get(s); if (!set) continue; const line = 'data: ' + JSON.stringify(a) + '\n\n'; for (const r of set) { try { r.write(line); L.sent++; } catch { } } }
    L.acc.clear();
  }
  function lconnect() {
    if (L.ws || !WS) return;
    let ws; try { ws = new WS(WSURL); } catch (e) { L.err = String(e && e.message || e); return; }
    L.ws = ws; L.live.clear(); L.gliq = false; L.lastMsg = now(); L.opened++;
    ws.onopen = () => { L.err = ''; lsync(); };
    ws.onmessage = e => {
      L.lastMsg = now(); let m; try { m = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data)); } catch { return; }
      const d = m && m.data; if (!d) return;
      if (d.e === 'markPriceUpdate') { L.msgs++; const r = num(d.r); if (L.subs.has(d.s)) lpush(d.s, { s: d.s, typ: 'm', r: r == null ? null : r * 100, T: num(d.T), p: num(d.p) }); return; }
      if (d.e === 'forceOrder' && d.o) {
        L.msgs++; const o = d.o, px = num(o.ap) || num(o.p), qt = num(o.z) || num(o.q), usd = px && qt ? px * qt : null; if (!usd) return;
        const T = num(o.T) || now(), k = o.S === 'SELL' ? 'L' : 'S'; L.liq.push([T, o.s, k, usd]);
        const lim = now() - 3600e3; while (L.liq.length && (L.liq[0][0] < lim || L.liq.length > 50000)) L.liq.shift();
        if (L.subs.has(o.s)) lpush(o.s, { s: o.s, typ: 'l', k, usd, p: px, T }); return;
      }
      if (d.e === '24hrTicker') { L.msgs++; if (L.subs.has(d.s)) lpush(d.s, { s: d.s, typ: 't', c: num(d.c), P: num(d.P), q: num(d.q) }); return; }
      if (d.e !== 'aggTrade') return; L.msgs++;
      const s = d.s, p = Number(d.p), q = Number(d.q); if (!L.subs.has(s) || !(p > 0)) return;
      const v = p * q, sell = !!d.m; let a = L.acc.get(s);
      if (a) { a.c = p; if (p > a.h) a.h = p; if (p < a.l) a.l = p; a.q += v; a.n++; a.T = d.T; } else L.acc.set(s, a = { s, T: d.T, c: p, h: p, l: p, q: v, n: 1, qb: 0, qs: 0, big: [] });
      if (sell) a.qs += v; else a.qb += v; if (v >= 1e4 && a.big.length < 20) a.big.push([d.T, p, Math.round(v), sell ? -1 : 1]);
      if (!L.timer) L.timer = setTimeout(lflush, PACK_MS);
    };
    ws.onerror = e => { L.err = String(e && e.message || 'WebSocket hatası'); };
    ws.onclose = () => { if (L.ws === ws) { L.ws = null; L.live.clear(); } if (L.subs.size) setTimeout(lconnect, 3000); };
  }
  function liqSum() {
    const t = now(), m5 = { L: 0, S: 0 }, h1 = { L: 0, S: 0 }, by = new Map();
    for (const [T, s, k, usd] of L.liq) { if (T < t - 3600e3) continue; h1[k] += usd; if (T >= t - 300e3) m5[k] += usd; by.set(s, (by.get(s) || 0) + usd); }
    return { typ: 'g', since: L.liqSince, m5, h1, top: [...by].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, v]) => [s, Math.round(v)]) };
  }
  function lbroadcast() { if (!L.liqSince) return; const line = 'data: ' + JSON.stringify(liqSum()) + '\n\n'; for (const set of L.subs.values()) for (const r of set) { try { r.write(line); } catch { } } }
  function lwatch() {
    const t = now(); lbroadcast();
    for (const set of L.subs.values()) for (const r of set) { try { r.write(': canli\n\n'); } catch { } }   // tarayıcı/vekil bağlantıyı kapatmasın
    if (L.ws && L.subs.size && t - L.lastMsg > 45e3) { try { L.ws.close(); } catch { } L.ws = null; L.live.clear(); lconnect(); }
    if (!L.subs.size) { if (L.ws && t - L.idleAt > 60e3) { const w = L.ws; L.ws = null; L.live.clear(); L.liq = []; L.liqSince = 0; try { w.close(); } catch { } } if (!L.ws) { clearInterval(L.tick); L.tick = null; } }
  }
  function canli(req, res, u) {
    const sym = cleanSym(u.searchParams.get('symbol'));
    if (!sym) { res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ error: 'Geçersiz sembol' })); return; }
    let total = 0; for (const s of L.subs.values()) total += s.size;
    if (total >= MAX_SSE || !WS) { res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ error: WS ? 'Çok fazla canlı bağlantı' : 'WebSocket yok' })); return; }
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 3000\n: açık\n\n');
    let set = L.subs.get(sym); if (!set) L.subs.set(sym, set = new Set()); set.add(res);
    const bye = () => { const st = L.subs.get(sym); if (st) { st.delete(res); if (!st.size) L.subs.delete(sym); } if (!L.subs.size) L.idleAt = now(); lsync(); };
    req.on('close', bye); res.on('error', bye);
    if (!L.tick) L.tick = setInterval(lwatch, 15e3);
    if (!L.ws) lconnect(); else lsync();
    if (L.liqSince) { try { res.write('data: ' + JSON.stringify(liqSum()) + '\n\n'); } catch { } }
  }
  // ---------- Tarama (V1.15.0): izleme listesinin sütunları, bütün evren için ----------
  // GET /api/t/tarama istendiği sürece (son istekten 90 sn sonra kapanır) Binance'e en çok 200 akışlık birkaç WebSocket açılır
  // (motorla aynı yöntem; REST ağırlığı yok): her coin <sym>@kline_1m (1 dk mumda piyasa ALIŞ tutarı Q var) + !markPrice@arr@1s (funding)
  // + !forceOrder@arr (tasfiye). Coin başına son 6 dakikalık mum tutulur. Dönen satır: [5dk fiyat %, 5dk alış %, 5dk hacim $, funding %, 1 sa long tasfiye $, 1 sa short tasfiye $].
  const Z = { socks: [], k: new Map(), fr: new Map(), liq: [], since: 0, lastReq: 0, tick: null, syms: [], msgs: 0, out: null, outAt: 0 };
  function zstop() { for (const s of Z.socks) { s.dead = true; try { s.ws && s.ws.close(); } catch { } } Z.socks = []; Z.k.clear(); Z.fr.clear(); Z.liq = []; Z.since = 0; Z.out = null; if (Z.tick) { clearInterval(Z.tick); Z.tick = null; } }
  function zsock(streams) {
    const so = { streams, ws: null, last: 0, dead: false };
    const open = () => {
      if (so.dead || !WS) return; let ws; try { ws = new WS(WSURL + '?streams=' + streams.join('/')); } catch { setTimeout(open, 5000); return; }
      so.ws = ws; so.last = now();
      ws.onmessage = e => {
        so.last = now(); let m; try { m = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data)); } catch { return; } const d = m && m.data; if (!d) return; Z.msgs++;
        if (Array.isArray(d)) { for (const x of d) if (x && x.e === 'markPriceUpdate') { const r = num(x.r); if (r != null) Z.fr.set(x.s, r * 100); } return; }
        if (d.e === 'kline' && d.k) {
          const k = d.k, t = Number(k.t); let a = Z.k.get(d.s); if (!a) Z.k.set(d.s, a = []);
          const row = [t, Number(k.o), Number(k.c), Number(k.q), Number(k.Q)], L = a.length;
          if (L && a[L - 1][0] === t) a[L - 1] = row; else if (!L || a[L - 1][0] < t) { a.push(row); if (a.length > 6) a.shift(); }
          return;
        }
        if (d.e === 'forceOrder' && d.o) { const o = d.o, px = num(o.ap) || num(o.p), qt = num(o.z) || num(o.q); if (px && qt) { Z.liq.push([num(o.T) || now(), o.s, o.S === 'SELL' ? 0 : 1, px * qt]); const lim = now() - 3600e3; while (Z.liq.length && (Z.liq[0][0] < lim || Z.liq.length > 50000)) Z.liq.shift(); } }
      };
      ws.onclose = () => { if (so.ws === ws) so.ws = null; if (!so.dead) setTimeout(open, 3000); };
      ws.onerror = () => { };
    };
    open(); return so;
  }
  function zstart(syms) {
    Z.syms = syms; Z.since = now();
    const st = syms.map(s => s.toLowerCase() + '@kline_1m'), groups = [];
    for (let i = 0; i < st.length; i += 200) groups.push(st.slice(i, i + 200));
    if (!groups.length) groups.push([]);
    groups[0] = ['!markPrice@arr@1s', '!forceOrder@arr'].concat(groups[0]);
    Z.socks = groups.map(zsock);
    Z.tick = setInterval(() => {
      const t = now(); if (t - Z.lastReq > 90e3) { zstop(); return; }
      for (const so of Z.socks) if (so.ws && t - so.last > 45e3) { try { so.ws.close(); } catch { } }   // sessiz bağlantıyı yenile
    }, 15e3);
  }
  function zrows() {
    const t = now(); if (Z.out && t - Z.outAt < 2000) return Z.out;
    let lq = Z.dbLiq; if (!lq) { lq = new Map(); for (const [T, s, k, u] of Z.liq) { if (T < t - 3600e3) continue; let x = lq.get(s); if (!x) lq.set(s, x = [0, 0]); x[k] += u; } }
    const rows = {}, r1 = v => v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100;
    for (const s of Z.syms) {
      const a = Z.k.get(s), fr = Z.fr.get(s), l = lq.get(s); let m5 = null, b5 = null, v5 = null;
      if (a && a.length) { const w = a.slice(-5), q = w.reduce((x, r) => x + r[3], 0), Q = w.reduce((x, r) => x + r[4], 0); m5 = w[0][1] ? (w[w.length - 1][2] / w[0][1] - 1) * 100 : null; v5 = q; b5 = q > 0 ? Q / q * 100 : null; }
      rows[s] = [r1(m5), r1(b5), v5 == null ? null : Math.round(v5), fr == null ? null : Math.round(fr * 1e4) / 1e4, l ? Math.round(l[0]) : 0, l ? Math.round(l[1]) : 0];
    }
    Z.out = { at: t, since: Z.dbLiq ? Math.min(Z.since, t - 3600e3) : Z.since, liqDb: !!Z.dbLiq, bagli: Z.socks.filter(s => s.ws && s.ws.readyState === 1).length, soket: Z.socks.length, rows }; Z.outAt = t; return Z.out;
  }
  async function tarama(d) {
    Z.lastReq = now();
    if (d.q && now() - (Z.dbLiqAt || 0) > 15e3) { Z.dbLiqAt = now(); try { const m = new Map(); for (const r of await d.q(SQL.liq1h, [])) m.set(r.symbol, [Number(r.l), Number(r.s)]); Z.dbLiq = m; Z.out = null; } catch { Z.dbLiq = null; } }
    if (!Z.socks.length) { if (!WS) throw err(503, 'WebSocket yok'); const ev = await evren(d); zstart(Object.keys(ev.rows).filter(s => ev.rows[s][0])); }
    return zrows();
  }
  // GET /api/t/akis?symbol → akış toplayıcının kaydettiği son 15 dk büyük işlem + 1 sa tasfiye; kapsam: son 15/60 dk'nın kaçı tam toplandı.
  async function akis(p, deps) {
    const sym = cleanSym(p.get('symbol')); if (!sym) throw err(400, 'Geçersiz sembol'); if (!deps.q) throw err(503, 'Veritabanı yok');
    try {
      const [b, l, k] = await Promise.all([deps.q(SQL.akisBig, [sym]), deps.q(SQL.akisLiq, [sym]), deps.q(SQL.akisKap, [])]);
      const kp = k[0] || {};
      return { big: b.map(r => [Number(r.t), Number(r.fiyat), Number(r.usd), r.yon === 'S' ? -1 : 1]), liq: l.map(r => [Number(r.t), r.yon, Number(r.usd)]), kapsam: { d15: Number(kp.d15) || 0, d60: Number(kp.d60) || 0, son: kp.son ? Number(kp.son) : null } };
    } catch (e) { throw err(503, 'Akış kaydı okunamadı: ' + (e.message || e)); }
  }
  const canliDurum = () => ({ bagli: !!(L.ws && L.ws.readyState === 1), coin: [...L.subs.keys()], izleyen: [...L.subs.values()].reduce((a, s) => a + s.size, 0), acilis: L.opened, mesaj: L.msgs, gonderilen: L.sent, hata: L.err || null, tarama: { soket: Z.socks.length, bagli: Z.socks.filter(x => x.ws && x.ws.readyState === 1).length, coin: Z.k.size, funding: Z.fr.size, mesaj: Z.msgs, tasfiye1s: Z.liq.length } });

  function handle(req, res, u, deps) {
    const p = u.pathname, d = deps || {};
    if (p === '/api/t/canli') { canli(req, res, u); return true; }
    if (p === '/api/t/canli-durum') { d.send(res, 200, canliDurum()); return true; }
    const route = p === '/api/t/klines' ? () => klines(u.searchParams, d) : p === '/api/t/oi' ? () => oi(u.searchParams, d)
      : p === '/api/t/coin' ? () => coin(u.searchParams, d) : p === '/api/t/tickers' ? () => tickers(d) : p === '/api/t/evren' ? () => evren(d) : p === '/api/t/turev' ? () => turev(u.searchParams, d) : p === '/api/t/ozet' ? () => ozet(u.searchParams, d) : p === '/api/t/oranlar' ? () => oranlar(u.searchParams, d) : p === '/api/t/tarama' ? () => tarama(d) : p === '/api/t/akis' ? () => akis(u.searchParams, d)
        : p === '/api/t/izleme' && req.method === 'GET' ? () => list(d.q)
          : p === '/api/t/izleme' && req.method === 'POST' ? () => d.readBody(req).catch(() => { throw err(400, 'Gövde JSON değil'); }).then(b => izlemePost(b, d)) : null;
    if (!route) return false;
    Promise.resolve().then(route).then(data => d.send(res, 200, data), e => {
      const code = e && e.code ? e.code : 500, o = { error: (e && e.message) || 'hata' };
      if (e && e.retryAfter) o.retryAfter = e.retryAfter;
      if (code === 500) (d.log || console.log)('terminal hata:', e && e.stack || e);
      d.send(res, code, o);
    });
    return true;
  }
  return { handle, B, cache, inflight, SQL, L, lflush, lwatch, liqSum, Z, zstop };
}

const def = create();
module.exports = { handle: (req, res, u, deps) => def.handle(req, res, u, deps), _test: { create, cleanSym, clampInt, SQL } };
