'use strict';
// Kayan yazı ön denemesi (yalnız okuma, 1 bağlantı, 25 sn): /market/stream'de !forceOrder@arr (tüm piyasa tasfiyeleri) geliyor mu,
// aggTrade'de alıcı/satıcı tarafı (m) var mı.
const ws = new WebSocket('wss://fstream.binance.com/market/stream'), t0 = Date.now(); let fo = 0, foEx = null, ag = 0, agEx = null, buy = 0, sell = 0; const resp = [];
ws.onopen = () => ws.send(JSON.stringify({ method: 'SUBSCRIBE', params: ['!forceOrder@arr', 'btcusdt@aggTrade'], id: 1 }));
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { resp.push(m); return; } const d = m.data || {};
  if (d.e === 'forceOrder') { fo++; if (!foEx) foEx = m; } else if (d.e === 'aggTrade') { ag++; if (!agEx) agEx = d; const v = d.p * d.q; if (d.m) sell += v; else buy += v; } };
ws.onerror = e => console.log('hata', e.message || e.type);
setTimeout(() => { console.log(JSON.stringify({ sn: (Date.now() - t0) / 1000, yanit: resp, tasfiye: fo, tasfiyeOrnek: foEx, aggTrade: ag, aggOrnek: agEx, piyasaAlis: Math.round(buy), piyasaSatis: Math.round(sell) }, null, 1)); ws.close(); }, 25000);
