// node tools/t-test.cjs → yerel web sunucusunun Terminal uçlarını dener (yalnız okuma + izleme ekle/sil denemesi), özet basar
const B = 'http://127.0.0.1:3200', sleep = ms => new Promise(r => setTimeout(r, ms));
const g = async (p, o) => { const t = Date.now(); const r = await fetch(B + p, o); let j = null; try { j = await r.json(); } catch (e) { } return { s: r.status, ms: Date.now() - t, j }; };
const cut = v => JSON.stringify(v).slice(0, 230);
(async () => {
  console.log('version', cut((await g('/api/version')).j));
  let r = await g('/api/t/tickers'); const rows = r.j && r.j.rows || {}; console.log('tickers', r.s, r.ms + 'ms', 'sembol', Object.keys(rows).length, 'BTC', cut(rows.BTCUSDT), 'AKE', cut(rows.AKEUSDT), r.j && r.j.error || '');
  for (const iv of ['5m', '15m', '1h', '4h', '1d', '1w', '1M']) { r = await g('/api/t/klines?symbol=AKEUSDT&interval=' + iv + '&limit=500'); console.log('klines', iv, r.s, r.ms + 'ms', Array.isArray(r.j) ? r.j.length + ' mum, son ' + cut(r.j[r.j.length - 1]) + ' ' + new Date(r.j[r.j.length - 1][0]).toISOString() : cut(r.j)); }
  r = await g('/api/t/klines?symbol=BTCUSDT&interval=1h&limit=3&end=' + (Date.now() - 30 * 864e5)); console.log('klines end', r.s, cut(r.j));
  for (const p of ['5m', '1h', '1d']) { r = await g('/api/t/oi?symbol=AKEUSDT&period=' + p); console.log('oi', p, r.s, r.ms + 'ms', Array.isArray(r.j) ? r.j.length + ' nokta, ilk ' + new Date(r.j[0][0]).toISOString() + ' son ' + cut(r.j[r.j.length - 1]) : cut(r.j)); }
  r = await g('/api/t/coin?symbol=AKEUSDT'); console.log('coin', r.s, cut(r.j));
  r = await g('/api/t/coin?symbol=YOKYOKUSDT'); console.log('coin yok', r.s, cut(r.j));
  r = await g('/api/t/izleme'); console.log('izleme', r.s, cut(r.j));
  const post = b => g('/api/t/izleme', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  r = await post({ action: 'ekle', symbol: 'AKEUSDT' }); console.log('ekle AKE', r.s, cut(r.j));
  r = await post({ action: 'ekle', symbol: 'YOKYOKUSDT' }); console.log('ekle yok', r.s, cut(r.j));
  r = await post({ action: 'sil', symbol: 'AKEUSDT' }); console.log('sil AKE', r.s, cut(r.j));
  r = await post({ action: 'ekle', symbol: 'AKEUSDT' }); console.log('ekle AKE', r.s, cut(r.j));
  r = await g('/api/messages?bot=all&sym=AKEUSDT&limit=5'); console.log('messages', r.s, r.j && r.j.items && r.j.items.length);
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
