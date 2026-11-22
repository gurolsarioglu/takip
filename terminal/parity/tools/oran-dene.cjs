'use strict';
// /api/t/oranlar ve kart.html gerçek sunucuda yanıt veriyor mu (salt okunur)
(async () => { for (const u of ['/api/t/oranlar?symbol=BTCUSDT', '/kart.html', '/api/version']) { const r = await fetch('http://127.0.0.1:3200' + u), b = await r.text(); console.log(r.status, u, b.slice(0, 160).replace(/\s+/g, ' ')); } })();
