'use strict';
// Tailnet adresinden site + canlı akış (SSE) denemesi.
const U = 'https://desktop-8neu41n.tailf6fb9a.ts.net';
(async () => {
  for (const u of ['/api/version', '/terminal.html', '/api/t/evren']) { try { const r = await fetch(U + u); console.log(r.status, u, (await r.text()).length, 'bayt'); } catch (e) { console.log('HATA', u, e.cause?.code || e.message); } }
  try { const ac = new AbortController(), r = await fetch(U + '/api/t/canli?symbol=BTCUSDT', { signal: ac.signal }), rd = r.body.getReader(); let n = 0, t0 = Date.now();
    while (Date.now() - t0 < 6000) { const { value, done } = await rd.read(); if (done) break; n += value.length; } ac.abort(); console.log('canlı akış', r.status, n, 'bayt / 6 sn'); } catch (e) { console.log('SSE', e.name === 'AbortError' ? 'tamam' : e.message); }
})();
