'use strict';
// web/terminal.cjs testleri — ağ ve veritabanı YOK: sahte fetch, sahte q, sahte saat (sleep saati ileri sarar).
// Çalıştır: node db/test-terminal.cjs   → her denetim bir satır, sonunda "hepsi TAMAM" (hata varsa çıkış kodu 1).
const { _test } = require('../web/terminal.cjs');

let fails = 0, passes = 0;
const ok = (c, m) => { if (c) { passes++; console.log('  ✓', m); } else { fails++; console.log('  ✗', m); } };
const section = s => console.log('\n' + s);

// ---------- yardımcılar ----------
function env(o = {}) {
  let T = o.t0 || Date.UTC(2026, 10, 15, 12, 0, 10);
  const calls = [];
  const clock = { now: () => T, sleep: async ms => { T += ms; await null; }, add: ms => { T += ms; } };
  const resp = (status, body, headers = {}) => ({ status, ok: status >= 200 && status < 300, headers: { get: k => headers[k.toLowerCase()] ?? null }, text: async () => typeof body === 'string' ? body : JSON.stringify(body) });
  const route = o.route || (url => {
    const u = new URL(url);
    if (u.pathname === '/fapi/v1/klines') { const n = Number(u.searchParams.get('limit')); return resp(200, Array.from({ length: Math.min(n, 3) }, (_, i) => [1e12 + i * 300e3, '1.5', '2', '1', '1.75', '10', 1e12 + i * 300e3 + 299999, '17.5', 5, '4', '7', '0'])); }
    if (u.pathname === '/futures/data/openInterestHist') return resp(200, [{ symbol: 'X', sumOpenInterest: '20', sumOpenInterestValue: '40', timestamp: 2000 }, { symbol: 'X', sumOpenInterest: '10', sumOpenInterestValue: '20', timestamp: 1000 }]);
    if (u.pathname === '/fapi/v1/openInterest') return resp(200, { openInterest: '1000', symbol: 'X', time: 1 });
    if (u.pathname === '/fapi/v1/premiumIndex') return resp(200, { symbol: 'X', markPrice: '2.5', lastFundingRate: '-0.00012', nextFundingTime: 1763222400000 });
    if (u.pathname === '/fapi/v1/ticker/24hr') return resp(200, [{ symbol: 'BTCUSDT', lastPrice: '95000.1', priceChangePercent: '1.20', quoteVolume: '12345678.9', closeTime: T }, { symbol: 'ETHUSDT', lastPrice: '3500', priceChangePercent: '-0.5', quoteVolume: '9000', closeTime: T }, { symbol: 'SOLUSDT', lastPrice: '150', priceChangePercent: '2', quoteVolume: '500', closeTime: T }, { symbol: 'BTCUSDC', lastPrice: '1', priceChangePercent: '0', quoteVolume: '1', closeTime: T }, { symbol: 'OLDUSDT', lastPrice: '1', priceChangePercent: '0', quoteVolume: '1', closeTime: T - 30 * 864e5 }, ...Array.from({ length: 120 }, (_, i) => ({ symbol: `C${i}USDT`, lastPrice: '1', priceChangePercent: '0', quoteVolume: '1', closeTime: T }))]);
    if (/^\/futures\/data\/(top|global)LongShort/.test(u.pathname)) return resp(200, [{ symbol: 'X', longAccount: '0.60', timestamp: Math.floor(T / 900e3) * 900e3 - 900e3 }, { symbol: 'X', longAccount: '0.65', timestamp: Math.floor(T / 900e3) * 900e3 }]);
    if (u.pathname === '/fapi/v1/fundingRate') return resp(200, [{ symbol: 'X', fundingRate: '0.00010000', fundingTime: T - 16 * 3600e3 }, { symbol: 'X', fundingRate: '-0.00020000', fundingTime: T - 8 * 3600e3 }]);
    if (u.pathname === '/fapi/v1/depth') return resp(200, { bids: [['10', '3'], ['9', '2']], asks: [['11', '1']] });
    if (u.pathname === '/fapi/v1/exchangeInfo') return resp(200, { symbols: [
      { symbol: 'BTCUSDT', contractType: 'PERPETUAL', quoteAsset: 'USDT', status: 'TRADING', deliveryDate: 4133404800000, onboardDate: 1569398400000 },
      { symbol: 'BTCUSDC', contractType: 'PERPETUAL', quoteAsset: 'USDC', status: 'TRADING', deliveryDate: 4133404800000, onboardDate: 1 },
      { symbol: 'GIDIYORUSDT', contractType: 'PERPETUAL', quoteAsset: 'USDT', status: 'TRADING', deliveryDate: T + 2 * 864e5, onboardDate: 1 },
      { symbol: 'GITTIUSDT', contractType: 'PERPETUAL', quoteAsset: 'USDT', status: 'SETTLING', deliveryDate: T - 3600e3, onboardDate: 1 },
      { symbol: 'ESKIUSDT', contractType: 'PERPETUAL', quoteAsset: 'USDT', status: 'SETTLING', deliveryDate: T - 5 * 864e5, onboardDate: 1 },
      { symbol: 'BTCUSDT_261225', contractType: 'CURRENT_QUARTER', quoteAsset: 'USDT', status: 'TRADING', deliveryDate: T + 30 * 864e5, onboardDate: 1 },
      { symbol: 'IRENUSDT', contractType: 'TRADIFI_PERPETUAL', quoteAsset: 'USDT', status: 'TRADING', deliveryDate: 4133404800000, onboardDate: 1 },
      { symbol: 'BTCBUSD', contractType: 'PERPETUAL', quoteAsset: 'BUSD', status: 'TRADING', deliveryDate: 4133404800000, onboardDate: 1 }] });
    return resp(404, { code: -1, msg: 'yok' });
  });
  const fetch = async (url, init) => { calls.push({ url, at: T, path: new URL(url).pathname }); const r = route(url, init, calls.length); return r instanceof Promise ? r : r; };
  const logs = [];
  const inst = _test.create({ now: clock.now, sleep: clock.sleep, timeoutMs: o.timeoutMs });
  const deps = { fetch, q: o.q || (async () => { throw new Error('db yok'); }), log: (...a) => logs.push(a.join(' ')), readBody: async req => req.body,
    send: (res, code, obj) => res.done({ code, obj }) };
  const call = (path, method = 'GET', body) => new Promise(done => {
    const u = new URL(path, 'http://x'), res = { done };
    const m = inst.handle({ method, body }, res, u, deps);
    if (m === false) done({ code: 'eslesmedi' });
  });
  return { inst, calls, clock, call, deps, logs, resp };
}
function fakeDb(o = {}) {
  const rows = []; let seq = 0, exists = !!o.exists; const log = [];
  const q = async (sql, args) => {
    log.push(sql);
    if (o.down) throw new Error('bağlantı reddedildi');
    if (sql.startsWith('SELECT to_regclass')) return [{ r: exists ? 'izleme' : null }];
    if (sql.startsWith('CREATE TABLE IF NOT EXISTS izleme')) { exists = true; return []; }
    if (sql.startsWith('INSERT INTO izleme')) { if (!rows.some(r => r.symbol === args[0])) rows.push({ symbol: args[0], sira: ++seq }); return []; }
    if (sql.startsWith('SELECT symbol FROM izleme')) return [...rows].sort((a, b) => a.sira - b.sira).map(r => ({ symbol: r.symbol }));
    if (sql === 'DELETE FROM izleme WHERE symbol = $1') { const i = rows.findIndex(r => r.symbol === args[0]); if (i >= 0) rows.splice(i, 1); return []; }
    throw new Error('beklenmeyen SQL: ' + sql);
  };
  return { q, rows, log };
}

(async () => {
  section('Doğrulama');
  {
    const E = env();
    ok((await E.call('/api/t/klines?symbol=B&interval=5m')).code === 400, 'tek harfli sembol → 400');
    ok((await E.call('/api/t/klines?symbol=!!!&interval=5m')).code === 400, 'harfsiz sembol → 400');
    ok((await E.call('/api/t/klines?symbol=' + 'A'.repeat(31) + '&interval=5m')).code === 400, '31 karakter sembol → 400');
    ok((await E.call('/api/t/klines?symbol=BTCUSDT&interval=2m')).code === 400, 'interval 2m → 400');
    ok((await E.call('/api/t/klines?symbol=BTCUSDT')).code === 400, 'interval yok → 400');
    ok((await E.call('/api/t/klines?symbol=BTCUSDT&interval=5m&end=abc')).code === 400, 'end sayı değil → 400');
    ok((await E.call('/api/t/oi?symbol=BTCUSDT&period=1w')).code === 400, 'oi period 1w → 400');
    ok((await E.call('/api/t/coin?symbol=')).code === 400, 'coin sembolsüz → 400');
    ok(E.calls.length === 0, 'geçersiz isteklerde Binance\'e gidilmedi');
    await E.call('/api/t/klines?symbol=btc-usdt&interval=1M&limit=5000');
    ok(/symbol=BTCUSDT&interval=1M&limit=1000$/.test(E.calls[0].url), 'sembol temizlendi (btc-usdt → BTCUSDT), limit 5000 → 1000');
    await E.call('/api/t/klines?symbol=BTCUSDT&interval=5m&limit=0'); ok(/limit=1$/.test(E.calls[1].url), 'limit 0 → 1');
    await E.call('/api/t/klines?symbol=BTCUSDT&interval=5m&limit=xyz'); ok(/limit=500$/.test(E.calls[2].url), 'limit geçersiz → varsayılan 500');
    await E.call('/api/t/klines?symbol=BTCUSDT&interval=1h&end=1700000000000'); ok(/endTime=1700000000000$/.test(E.calls[3].url), 'end → endTime');
    await E.call('/api/t/oi?symbol=BTCUSDT&period=4h&limit=900'); ok(E.calls[4].url === 'https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=4h&limit=500', 'oi limit 900 → 500, doğru adres');
    ok((await E.call('/api/t/yok')).code === 'eslesmedi', 'bilinmeyen yol → false');
    ok((await E.call('/api/t/izleme', 'PUT')).code === 'eslesmedi', 'izleme PUT → false');
  }
  section('Dönüşümler');
  {
    const E = env();
    const k = await E.call('/api/t/klines?symbol=BTCUSDT&interval=5m&limit=3');
    ok(k.code === 200 && k.obj.length === 3 && JSON.stringify(k.obj[0]) === JSON.stringify([1e12, 1.5, 2, 1, 1.75, 17.5, 7]), 'klines → [t,o,h,l,c,qv,alış], qv = 8., alış = 11. alan, sayılar Number');
    ok(k.obj.every(r => r.every(v => typeof v === 'number')), 'bütün alanlar number');
    const o = await E.call('/api/t/oi?symbol=BTCUSDT&period=5m');
    ok(JSON.stringify(o.obj) === JSON.stringify([[1000, 10, 20], [2000, 20, 40]]), 'oi → [[t, adet, usd]] eskiden yeniye');
    const c = await E.call('/api/t/coin?symbol=BTCUSDT');
    ok(c.code === 200 && c.obj.oi === 1000 && c.obj.oiUsd === 2500 && c.obj.mark === 2.5 && Math.abs(c.obj.funding + 0.012) < 1e-12 && c.obj.nextFunding === 1763222400000, 'coin → oi, oiUsd = oi × mark, funding yüzde, nextFunding');
    const t = await E.call('/api/t/tickers');
    ok(t.code === 200 && t.obj.rows.BTCUSDT[0] === 95000.1 && t.obj.rows.BTCUSDT[1] === 1.2 && t.obj.rows.BTCUSDT[2] === 12345678.9, 'tickers → [last, chgPct, quoteVol]');
    ok(t.obj.rows.BTCUSDC && !t.obj.rows.OLDUSDT && typeof t.obj.at === 'number', 'USDT + USDC; 2 gündür işlem görmeyen atıldı');
    const tv = await E.call('/api/t/turev?symbol=BTCUSDT&tf=1h&from=1'), TV = tv.obj;
    ok(tv.code === 200 && !TV.db && TV.eksik.length === 1 && /veritabanı/.test(TV.eksik[0]), 'turev: veritabanı yoksa Binance kısmıyla döner');
    ok(TV.ls.length === 2 && Math.abs(TV.ls[1][1] - 65) < 1e-9 && Math.abs(TV.son.glob - 65) < 1e-9 && TV.lsStep === 3600e3, 'turev: oranlar yüzde, son değer');
    ok(TV.fr.length === 2 && Math.abs(TV.fr[1][1] + 0.02) < 1e-12 && TV.frIv === 8, 'turev: funding yüzde, aralık 8 sa');
    const ob = await E.call('/api/t/ozet?symbol=BTCUSDT'); ok(ob.code === 200 && ob.obj.bid === 48 && ob.obj.ask === 11, 'ozet: emir defteri alış/satış tutarı');
    ok((await E.call('/api/t/turev?symbol=BTCUSDT&tf=3m')).code === 400, 'turev: geçersiz dilim → 400');
    const ev = await E.call('/api/t/evren'), R = ev.obj.rows;
    ok(ev.code === 200 && ev.obj.n === 4 && R.IRENUSDT && R.BTCUSDT[0] === 1 && R.BTCUSDT[1] === 0 && R.BTCUSDC, 'evren → PERPETUAL USDT/USDC TRADING, delist yoksa 0');
    ok(R.GIDIYORUSDT[1] > 0 && R.GITTIUSDT && R.GITTIUSDT[0] === 0 && !R.ESKIUSDT && !R.BTCUSDT_261225 && !R.BTCBUSD, 'evren → delist tarihi, yeni kapanan görünür, eski/vadeli/BUSD atılır');
  }
  section('Önbellek ve uçuştaki istek');
  {
    const E = env();
    await E.call('/api/t/klines?symbol=BTCUSDT&interval=5m'); await E.call('/api/t/klines?symbol=BTCUSDT&interval=5m');
    ok(E.calls.length === 1, 'aynı istek 4 sn içinde ikinci kez Binance\'e gitmedi');
    E.clock.add(4100); await E.call('/api/t/klines?symbol=BTCUSDT&interval=5m'); ok(E.calls.length === 2, '4 sn sonra yeniden istendi');
    await E.call('/api/t/klines?symbol=BTCUSDT&interval=5m&end=1700000000000'); E.clock.add(200e3); await E.call('/api/t/klines?symbol=BTCUSDT&interval=5m&end=1700000000000');
    ok(E.calls.length === 3, 'end ile: 200 sn sonra hâlâ önbellekten');
    E.clock.add(101e3); await E.call('/api/t/klines?symbol=BTCUSDT&interval=5m&end=1700000000000'); ok(E.calls.length === 4, 'end ile: 5 dk sonra yeniden');
    const r = await Promise.all([1, 2, 3].map(() => E.call('/api/t/oi?symbol=ETHUSDT&period=1h')));
    ok(E.calls.length === 5 && r.every(x => x.code === 200), 'uçuşta aynı anahtar: 3 eşzamanlı istek → 1 Binance isteği');
    await Promise.all([E.call('/api/t/coin?symbol=SOLUSDT'), E.call('/api/t/coin?symbol=SOLUSDT')]); ok(E.calls.length === 7, 'coin: 2 eşzamanlı → openInterest + premiumIndex birer kez');
    for (let i = 0; i < 420; i++) await E.call(`/api/t/klines?symbol=C${i}USDT&interval=5m&limit=1`);
    ok(E.inst.cache.size === 400, 'önbellek en çok 400 kayıt');
  }
  section('Kuyruk aralıkları');
  {
    const E = env();
    await Promise.all(['A', 'B', 'C', 'D', 'E'].map(s => E.call(`/api/t/klines?symbol=${s}XUSDT&interval=5m`)));
    const d = E.calls.slice(1).map((c, i) => c.at - E.calls[i].at);
    ok(E.calls.length === 5 && d.every(x => x >= 150), 'art arda 5 istek arası ≥150 ms (' + d.join(', ') + ')');
    E.calls.length = 0;
    await Promise.all(['A', 'B', 'C'].map(s => E.call(`/api/t/oi?symbol=${s}XUSDT&period=5m`)));
    const d2 = E.calls.slice(1).map((c, i) => c.at - E.calls[i].at);
    ok(d2.length === 2 && d2.every(x => x >= 700), '/futures/data/ arası ≥700 ms (' + d2.join(', ') + ')');
    E.calls.length = 0;
    await Promise.all([E.call('/api/t/oi?symbol=QXUSDT&period=5m'), E.call('/api/t/klines?symbol=QXUSDT&interval=5m'), E.call('/api/t/oi?symbol=QYUSDT&period=5m')]);
    ok(E.calls[1].at - E.calls[0].at >= 150 && E.calls[2].at - E.calls[0].at >= 700, 'karışık: fapi 150 ms sonra, sonraki futures/data 700 ms sonra');
  }
  section('429 / 418 / ağırlık');
  {
    let n = 0; const E = env({ route: (url) => { n++; return n === 2 ? E.resp(429, { code: -1003, msg: 'Too many requests' }, { 'retry-after': '7' }) : E.resp(200, [], { 'x-mbx-used-weight-1m': '20' }); } });
    const r = await Promise.all(['A', 'B', 'C', 'D'].map(s => E.call(`/api/t/klines?symbol=${s}XUSDT&interval=5m`)));
    ok(r[0].code === 200 && r[1].code === 503 && r[1].obj.retryAfter === 12, '429 → 503, retryAfter = retry-after + 5 sn (12)');
    ok(r[2].code === 503 && r[3].code === 503 && E.calls.length === 2, 'kuyrukta bekleyenler 503 aldı, Binance\'e gitmedi');
    ok(E.logs.some(l => /HTTP 429/.test(l)), '429 log\'a yazıldı');
    E.clock.add(11e3); const b = await E.call('/api/t/klines?symbol=ZZUSDT&interval=5m');
    ok(b.code === 503 && b.obj.retryAfter === 1 && E.calls.length === 2, '11 sn sonra hâlâ istek yok (503)');
    E.clock.add(1100); const c = await E.call('/api/t/klines?symbol=ZZUSDT&interval=5m');
    ok(c.code === 200 && E.calls.length === 3, 'süre dolunca istek atıldı; yeniden deneme yok (toplam 3 istek)');
  }
  {
    const E = env({ route: () => E.resp(418, { code: -1003, msg: 'banned' }, { 'retry-after': '120' }) });
    const r = await E.call('/api/t/tickers');
    ok(r.code === 503 && r.obj.retryAfter === 120 && E.calls.length === 1, '418 → 503 retryAfter 120, tek istek');
    ok(E.logs.some(l => /HTTP 418/.test(l)), '418 log\'a yazıldı');
    E.clock.add(119e3); ok((await E.call('/api/t/tickers')).code === 503 && E.calls.length === 1, '418: 119 sn sonra hâlâ istek yok');
  }
  {
    const E = env({ route: () => E.resp(429, 'x', {}) });
    const r = await E.call('/api/t/tickers'); ok(r.code === 503 && r.obj.retryAfter === 35, '429 retry-after yoksa 30 + 5 sn');
  }
  {
    let k = 0; const E = env({ t0: Date.UTC(2026, 10, 15, 12, 0, 20), route: () => E.resp(200, [], { 'x-mbx-used-weight-1m': ++k === 1 ? '1501' : '30' }) });
    await E.call('/api/t/klines?symbol=AXUSDT&interval=5m'); await E.call('/api/t/klines?symbol=BXUSDT&interval=5m');
    ok(E.calls[1].at >= Date.UTC(2026, 10, 15, 12, 1, 0), 'ağırlık 1501 → sonraki istek dakika sonuna kadar bekledi (' + ((E.calls[1].at - E.calls[0].at) / 1000) + ' sn)');
    E.calls.length = 0; await E.call('/api/t/klines?symbol=CXUSDT&interval=5m'); await E.call('/api/t/klines?symbol=DXUSDT&interval=5m');
    ok(E.calls[1].at - E.calls[0].at < 1000, 'ağırlık 30 → bekleme yok');
  }
  {
    const E = env({ route: () => E.resp(400, { code: -1121, msg: 'Invalid symbol.' }) });
    const r = await E.call('/api/t/klines?symbol=FOOUSDT&interval=5m'); ok(r.code === 502 && /Invalid symbol/.test(r.obj.error), 'Binance 400 → 502 + Binance mesajı');
  }
  section('Kuyruk taşması ve zaman aşımı');
  {
    let release; const gate = new Promise(r => release = r);
    const E = env({ route: () => gate.then(() => E.resp(200, [])) });
    const ps = Array.from({ length: 41 }, (_, i) => E.call(`/api/t/klines?symbol=S${i}USDT&interval=5m`));
    await new Promise(r => setTimeout(r, 10));
    ok(E.inst.B.queue.length === 40, '1 uçuşta + 40 bekleyen kabul edildi');
    const over = await E.call('/api/t/klines?symbol=OVERUSDT&interval=5m');
    ok(over.code === 503 && over.obj.retryAfter > 0, '41. bekleyen → 503');
    release(); const all = await Promise.all(ps); ok(all.every(x => x.code === 200), 'kuyruk boşalınca bekleyenler yanıt aldı');
  }
  {
    const E = env({ timeoutMs: 50, route: (u, init) => new Promise((_, no) => init.signal.addEventListener('abort', () => no(new Error('aborted')))) });
    const r = await E.call('/api/t/tickers'); ok(r.code === 502 && /yanıt vermedi/.test(r.obj.error), 'zaman aşımı (AbortController) → 502');
  }
  section('İzleme listesi');
  {
    const db = fakeDb(), E = env({ q: db.q });
    let r = await E.call('/api/t/izleme'); ok(r.code === 200 && JSON.stringify(r.obj) === '["BTCUSDT","ETHUSDT"]', 'ilk açılış: tablo kuruldu, BTCUSDT + ETHUSDT');
    ok(db.log.includes(_test.SQL.create), 'CREATE TABLE IF NOT EXISTS çalıştı');
    r = await E.call('/api/t/izleme', 'POST', { action: 'ekle', symbol: 'solusdt' }); ok(r.code === 200 && r.obj.join() === 'BTCUSDT,ETHUSDT,SOLUSDT', 'ekle SOLUSDT (önce tickers dolduruldu)');
    ok(E.calls.filter(c => c.path === '/fapi/v1/ticker/24hr').length === 1, 'tickers bir kez istendi');
    r = await E.call('/api/t/izleme', 'POST', { action: 'ekle', symbol: 'SOLUSDT' }); ok(r.code === 200 && r.obj.length === 3, 'tekrar ekleme çift kayıt yapmaz');
    r = await E.call('/api/t/izleme', 'POST', { action: 'ekle', symbol: 'FOOUSDT' }); ok(r.code === 400 && /listesinde yok/.test(r.obj.error), 'tanınmayan sembol → 400');
    r = await E.call('/api/t/izleme', 'POST', { action: 'ekle', symbol: 'YOKUSDC' }); ok(r.code === 400, 'listede olmayan sembol → 400');
    r = await E.call('/api/t/izleme', 'POST', { action: 'sil', symbol: 'ETHUSDT' }); ok(r.code === 200 && r.obj.join() === 'BTCUSDT,SOLUSDT', 'sil ETHUSDT');
    ok(db.log.filter(s => s.startsWith('DELETE')).every(s => s === 'DELETE FROM izleme WHERE symbol = $1'), 'silme tek satırlık parametreli DELETE');
    r = await E.call('/api/t/izleme', 'POST', { action: 'ekle', symbol: 'ETHUSDT' }); ok(r.obj.join() === 'BTCUSDT,SOLUSDT,ETHUSDT', 'silinen yeniden eklenebilir (sona)');
    r = await E.call('/api/t/izleme', 'POST', { action: 'uc', symbol: 'ETHUSDT' }); ok(r.code === 400, 'bilinmeyen işlem → 400');
    r = await E.call('/api/t/izleme', 'POST', { action: 'ekle', symbol: '' }); ok(r.code === 400, 'boş sembol → 400');
    for (let i = 0; i < 97; i++) await E.call('/api/t/izleme', 'POST', { action: 'ekle', symbol: `C${i}USDT` });
    r = await E.call('/api/t/izleme'); ok(r.obj.length === 100, 'liste 100 oldu');
    r = await E.call('/api/t/izleme', 'POST', { action: 'ekle', symbol: 'C100USDT' }); ok(r.code === 400 && /100/.test(r.obj.error), '101. coin → 400');
    const E2 = env({ q: db.q }); r = await E2.call('/api/t/izleme'); ok(r.obj.length === 100 && r.obj[0] === 'BTCUSDT', 'tablo varken yeniden açılış: BTC/ETH tekrar eklenmez, liste korunur');
    const E3 = env({ q: fakeDb({ exists: true }).q }); r = await E3.call('/api/t/izleme'); ok(r.code === 200 && r.obj.length === 0, 'tablo var ve boş: boş liste (kullanıcı hepsini silmiş)');
    const E4 = env({ q: fakeDb({ down: true }).q }); r = await E4.call('/api/t/izleme'); ok(r.code === 503 && /veritabanı/.test(r.obj.error), 'veritabanı yok → 503');
    r = await E4.call('/api/t/izleme', 'POST', { action: 'sil', symbol: 'BTCUSDT' }); ok(r.code === 503, 'veritabanı yok, sil → 503');
    r = await E4.call('/api/t/klines?symbol=BTCUSDT&interval=5m'); ok(r.code === 200, 'veritabanı yokken grafik uçları çalışır');
  }
  section('Canlı fiyat (SSE + tek WebSocket)');
  {
    const socks = [];
    class FakeWS { constructor(url) { this.url = url; this.readyState = 0; this.out = []; socks.push(this); } send(m) { this.out.push(JSON.parse(m)); } close() { this.readyState = 3; this.onclose && this.onclose(); } }
    const inst = _test.create({ WebSocket: FakeWS, wsUrl: 'wss://x/market/stream' }), EventEmitter = require('node:events');
    const mk = () => { const req = new EventEmitter(), res = new EventEmitter(); res.chunks = []; res.writeHead = (c, h) => { res.code = c; res.h = h; }; res.write = x => res.chunks.push(x); res.end = x => { res.ended = x; }; return { req, res }; };
    const open = sym => { const c = mk(); inst.handle(c.req, c.res, new URL('http://h/api/t/canli?symbol=' + sym), {}); return c; };
    const a = open('btcusdt'); ok(a.res.code === 200 && /event-stream/.test(a.res.h['Content-Type']) && socks.length === 1, 'SSE açıldı, tek WebSocket kuruldu');
    const w = socks[0]; w.readyState = 1; w.onopen();
    ok(w.out.length === 2 && w.out[0].params.join() === '!forceOrder@arr' && w.out[1].method === 'SUBSCRIBE' && w.out[1].params.join() === 'btcusdt@aggTrade,btcusdt@markPrice@1s,btcusdt@ticker', 'açılınca SUBSCRIBE: piyasa tasfiyeleri + işlem + funding + 24s özet');
    const b = open('ETHUSDT'), b2 = open('ETHUSDT'); ok(socks.length === 1 && w.out.length === 3 && w.out[2].params.length === 3 && w.out[2].params[0] === 'ethusdt@aggTrade', 'ikinci coin aynı bağlantıya eklendi, aynı coin tekrar abone olmaz');
    const tr = (s, p, q, T, m) => w.onmessage({ data: JSON.stringify({ stream: s.toLowerCase() + '@aggTrade', data: { e: 'aggTrade', s, p: String(p), q: String(q), T, m: !!m } }) });
    tr('BTCUSDT', 100, 1, 1); tr('BTCUSDT', 103, 2, 2, true); tr('BTCUSDT', 99, 200, 3); tr('ETHUSDT', 10, 5, 4); tr('SOLUSDT', 5, 1, 5);
    clearTimeout(inst.L.timer); inst.lflush();
    const msgs = r => r.chunks.filter(x => x.startsWith('data: ')).map(x => JSON.parse(x.slice(6)));
    const pk = r => msgs(r).filter(m => !m.typ);   // yalnız fiyat paketleri
    const ma = msgs(a.res);
    ok(ma.length === 1 && ma[0].c === 99 && ma[0].h === 103 && ma[0].l === 99 && ma[0].q === 100 + 206 + 19800 && ma[0].n === 3 && ma[0].T === 3, '100 ms paketi: son / en yüksek / en düşük / hacim / işlem sayısı');
    ok(ma[0].qb === 100 + 19800 && ma[0].qs === 206 && ma[0].big.length === 1 && ma[0].big[0].join() === '3,99,19800,1', 'piyasa alış / satış ayrımı ve ≥10 bin $ büyük işlem');
    ok(pk(b.res).length === 1 && pk(b2.res).length === 1 && pk(b.res)[0].c === 10 && msgs(b.res).some(m => m.typ === 'g') && !ma.some(m => m.s !== 'BTCUSDT'), 'her izleyen yalnız kendi coinini alır; abone olunmayan coin atılır');
    w.onmessage({ data: JSON.stringify({ stream: 'btcusdt@markPrice@1s', data: { e: 'markPriceUpdate', s: 'BTCUSDT', p: '100.5', r: '-0.00012500', T: 1800 } }) });
    w.onmessage({ data: JSON.stringify({ stream: 'btcusdt@ticker', data: { e: '24hrTicker', s: 'BTCUSDT', c: '99', P: '-1.25', q: '123456.7' } }) });
    w.onmessage({ data: JSON.stringify({ stream: '!forceOrder@arr', data: { e: 'forceOrder', o: { s: 'BTCUSDT', S: 'SELL', q: '2', p: '90', ap: '95', z: '2', T: Date.now() } } }) });
    w.onmessage({ data: JSON.stringify({ stream: '!forceOrder@arr', data: { e: 'forceOrder', o: { s: 'XRPUSDT', S: 'BUY', q: '1000', p: '1', ap: '1', z: '1000', T: Date.now() } } }) });
    const lq = msgs(a.res).filter(m => m.typ === 'l'), gs = inst.liqSum();
    ok(lq.length === 1 && lq[0].k === 'L' && lq[0].usd === 190, 'seçili coinin tasfiyesi iletildi (SELL = long tasfiyesi), başka coininki iletilmedi');
    ok(gs.h1.L === 190 && gs.h1.S === 1000 && gs.m5.S === 1000 && gs.top[0][0] === 'XRPUSDT' && gs.since > 0, 'piyasa tasfiye özeti: 5 dk / 1 sa, en çok tasfiye olan');
    const mm = msgs(a.res).filter(m => m.typ === 'm' || m.typ === 't');
    ok(mm.length === 2 && mm[0].typ === 'm' && Math.abs(mm[0].r + 0.0125) < 1e-12 && mm[0].T === 1800 && mm[1].typ === 't' && mm[1].P === -1.25 && mm[1].q === 123456.7, 'funding (%) ve 24s özet hemen iletilir');
    b.req.emit('close'); ok(w.out.length === 3, 'aynı coinde izleyen kaldıkça abonelik sürer');
    b2.req.emit('close'); ok(w.out.length === 4 && w.out[3].method === 'UNSUBSCRIBE' && w.out[3].params.length === 3, 'son izleyen gidince UNSUBSCRIBE');
    const bad = open('!!'); ok(bad.res.code === 400, 'geçersiz sembol → 400');
    a.req.emit('close'); clearInterval(inst.L.tick); inst.L.tick = null;
    ok(inst.L.subs.size === 0, 'izleyen kalmadı');
  }
  section('Tarama (liste sütunları)');
  {
    const socks = [];
    class FakeWS { constructor(url) { this.url = url; this.readyState = 1; socks.push(this); } send() { } close() { this.readyState = 3; } }
    const E = env();
    const T0 = Date.now(), inst2 = _test.create({ WebSocket: FakeWS, wsUrl: 'wss://x/market/stream', now: () => T0 });
    const call = async p => { let out; const res = {}; await new Promise(r => { inst2.handle({ method: 'GET' }, res, new URL('http://h' + p), { fetch: E.deps.fetch, log: () => { }, send: (_, c, o) => { out = { code: c, obj: o }; r(); } }); }); return out; };
    let r = await call('/api/t/tarama');
    ok(r.code === 200 && socks.length === 1 && /streams=!markPrice@arr@1s\/!forceOrder@arr\/btcusdt@kline_1m/.test(socks[0].url) && !/gidiyor|gitti|_261225|busd/i.test(socks[0].url.replace('gidiyorusdt@kline_1m', '')), 'işlem gören evren coinleri + funding + tasfiye akışı tek sokette');
    const w = socks[0], kl = (s, t, o, c, q, Q) => w.onmessage({ data: JSON.stringify({ stream: s.toLowerCase() + '@kline_1m', data: { e: 'kline', s, k: { t, o: String(o), c: String(c), q: String(q), Q: String(Q) } } }) });
    for (let i = 0; i < 7; i++) kl('BTCUSDT', i * 60e3, 100 + i, 101 + i, 1000, 600);
    kl('BTCUSDT', 6 * 60e3, 106, 110, 2000, 1500);   // canlı mumun güncellemesi
    w.onmessage({ data: JSON.stringify({ stream: '!markPrice@arr@1s', data: [{ e: 'markPriceUpdate', s: 'BTCUSDT', r: '-0.00050000' }] }) });
    w.onmessage({ data: JSON.stringify({ stream: '!forceOrder@arr', data: { e: 'forceOrder', o: { s: 'BTCUSDT', S: 'BUY', q: '1', p: '100', ap: '100', z: '1', T: T0 } } }) });
    inst2.Z.out = null; r = await call('/api/t/tarama'); const R = r.obj.rows.BTCUSDT;
    ok(R && R[0] === Math.round((110 / 102 - 1) * 1e4) / 100 && R[2] === 6000 && R[1] === Math.round(3900 / 6000 * 1e4) / 100, '5 dk: son 5 mum (canlı dahil), fiyat %, alış %, hacim');
    ok(R[3] === -0.05 && R[4] === 0 && R[5] === 100, 'funding % ve 1 sa tasfiye (short)');
    ok(r.obj.rows.BTCUSDC && r.obj.rows.BTCUSDC[0] === null, 'verisi henüz gelmeyen coin: null');
    const db2 = async (sql, a) => { if (sql.includes('buyuk_islem')) return [{ t: 1000, fiyat: 5, usd: 30000, yon: 'S' }]; if (sql.includes('akis_kapsam')) return [{ d15: 15, d60: 60, son: 2000 }]; if (sql.includes('FROM tasfiye WHERE symbol')) return [{ t: 900, yon: 'L', usd: 1200 }]; if (sql.includes('GROUP BY symbol')) return [{ symbol: 'BTCUSDT', l: 500, s: 7 }]; throw new Error('?'); };
    const call2 = async p => { let out; await new Promise(r => { inst2.handle({ method: 'GET' }, {}, new URL('http://h' + p), { q: db2, fetch: E.deps.fetch, log: () => { }, send: (_, c, o) => { out = { code: c, obj: o }; r(); } }); }); return out; };
    const ak = await call2('/api/t/akis?symbol=BTCUSDT');
    ok(ak.code === 200 && ak.obj.big[0].join() === '1000,5,30000,-1' && ak.obj.liq[0].join() === '900,L,1200' && ak.obj.kapsam.d15 === 15, 'akis: büyük işlem (satış = −1), tasfiye, kapsam');
    inst2.Z.dbLiqAt = 0; const tz = await call2('/api/t/tarama'); ok(tz.obj.liqDb === true && tz.obj.rows.BTCUSDT[4] === 500 && tz.obj.rows.BTCUSDT[5] === 7, 'tarama: tasfiye sütunu veritabanından');
    ok((await call2('/api/t/akis?symbol=!!')).code === 400, 'akis: geçersiz sembol → 400');
    inst2.zstop(); ok(inst2.Z.socks.length === 0 && socks[0].readyState === 3, 'durdurunca soketler kapanır');
  }
  console.log(`\n${passes} geçti, ${fails} kaldı`);
  if (fails) { console.log('BAŞARISIZ'); process.exit(1); } else console.log('hepsi TAMAM');
})().catch(e => { console.error('TEST ÇÖKTÜ', e); process.exit(1); });
