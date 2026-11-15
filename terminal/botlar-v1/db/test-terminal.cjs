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
    ok(k.code === 200 && k.obj.length === 3 && JSON.stringify(k.obj[0]) === JSON.stringify([1e12, 1.5, 2, 1, 1.75, 17.5]), 'klines → [t,o,h,l,c,qv], qv = 8. alan, sayılar Number');
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
  console.log(`\n${passes} geçti, ${fails} kaldı`);
  if (fails) { console.log('BAŞARISIZ'); process.exit(1); } else console.log('hepsi TAMAM');
})().catch(e => { console.error('TEST ÇÖKTÜ', e); process.exit(1); });
