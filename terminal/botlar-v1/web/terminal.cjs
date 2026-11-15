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
      return raw.map(k => [Number(k[0]), Number(k[1]), Number(k[2]), Number(k[3]), Number(k[4]), Number(k[7])]);
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
  // Binance'ten küçük parçalar: 3 oran ucu (15m × 96) + openInterestHist 5m × 500 (OI paneliyle aynı anahtar) → coin başına 5 dk'da 4 /futures/data isteği.
  // Funding geçmişi /fapi/v1/fundingRate (1.000 olay, 10 dk önbellek). Binance kısmı başarısız olursa veritabanı kısmı yine döner (eksik alanında neden).
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
    try {
      const ser = [];
      for (const [k, ep] of RATIO) { const path = `/futures/data/${ep}?symbol=${sym}&period=15m&limit=96`; ser.push([k, await cached('r|' + path, 300e3, path, { fetch: f, log: lg }, raw => { if (!Array.isArray(raw)) throw err(502, 'Binance oran yanıtı beklenen biçimde değil'); return raw.map(x => [Number(x.timestamp), num(x.longAccount != null ? x.longAccount : x.longPosition)]).filter(x => Number.isFinite(x[0])).sort((a, b) => a[0] - b[0]); })]); }
      const m = new Map(), col = { top: 1, glob: 2, pos: 3 };
      for (const [k, rows] of ser) for (const [ts, v] of rows) { let r = m.get(ts); if (!r) m.set(ts, r = [ts, null, null, null]); r[col[k]] = v == null ? null : v * 100; }
      const live = [...m.values()].sort((a, b) => a[0] - b[0]), lastDb = out.ls.length ? out.ls[out.ls.length - 1][0] : -1;
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

  function handle(req, res, u, deps) {
    const p = u.pathname, d = deps || {};
    const route = p === '/api/t/klines' ? () => klines(u.searchParams, d) : p === '/api/t/oi' ? () => oi(u.searchParams, d)
      : p === '/api/t/coin' ? () => coin(u.searchParams, d) : p === '/api/t/tickers' ? () => tickers(d) : p === '/api/t/evren' ? () => evren(d) : p === '/api/t/turev' ? () => turev(u.searchParams, d) : p === '/api/t/ozet' ? () => ozet(u.searchParams, d)
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
  return { handle, B, cache, inflight, SQL };
}

const def = create();
module.exports = { handle: (req, res, u, deps) => def.handle(req, res, u, deps), _test: { create, cleanSym, clampInt, SQL } };
