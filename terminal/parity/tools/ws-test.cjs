'use strict';
// Terminal canlı fiyat denemesi: /market/stream üzerinde SUBSCRIBE / UNSUBSCRIBE çalışıyor mu, kaç mesaj geliyor (yalnız okuma, 1 bağlantı).
const run = (url, label) => new Promise(res => {
  const ws = new WebSocket(url), cnt = {}, t0 = Date.now(); let resp = [];
  ws.onopen = () => { console.log(label, 'açıldı'); setTimeout(() => ws.send(JSON.stringify({ method: 'SUBSCRIBE', params: ['ethusdt@kline_1m', 'btcusdt@aggTrade'], id: 1 })), 1000);
    setTimeout(() => ws.send(JSON.stringify({ method: 'UNSUBSCRIBE', params: ['btcusdt@aggTrade'], id: 2 })), 5000); };
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { resp.push(m); return; } const k = (m.stream || m.e || '?') + (Date.now() - t0 > 6000 ? ' (sonra)' : ''); cnt[k] = (cnt[k] || 0) + 1; };
  ws.onerror = e => console.log(label, 'hata', e.message || e.type);
  ws.onclose = e => console.log(label, 'kapandı', e.code);
  setTimeout(() => { console.log(label, JSON.stringify(cnt), 'yanıtlar', JSON.stringify(resp)); ws.close(); res(); }, 10000);
});
(async () => { console.log('node', process.version, typeof WebSocket);
  await run('wss://fstream.binance.com/market/stream?streams=btcusdt@kline_1m', 'A(streams ile)');
  await run('wss://fstream.binance.com/market/stream', 'B(boş)'); })();
