'use strict';
// Live V3 recorder: closed 1m kline volumes (websocket) + 24h ticker (REST at :00.2) for all USDⓈ-M perps.
// Output data/flow/v3live-YYYYMMDD.jsonl: {t: minuteStartOfClosedBar, v1m:{SYM:[vol,quoteVol]}, v24:{SYM:[volume,quoteVolume,closeTime]}, tickerAt}
const fs = require('node:fs'); const path = require('node:path');
const { getJson, ROOT, sleep } = require('../../lib/net.cjs');
const DIR = path.join(ROOT, 'flow'); fs.mkdirSync(DIR, { recursive: true });
const minutes = Number(process.argv[2] || 180);
const closed = new Map(); // minute -> {sym:[v,q]}
const tick = new Map();
const tk = new Map(); // sym -> {v, E}
const snap = new Map(); // minute -> {sym: {before:[v,E], after:[v,E]}}
let nmsg = 0; setInterval(() => console.log(new Date().toISOString(), 'msgs', nmsg, 'pending', closed.size), 30000);
function connect(streams, idx) {
  const ws = new WebSocket(process.env.V3WS || process.argv[3] || 'wss://fstream.binance.com/market/stream');
  ws.onopen = () => { console.log('open', idx); ws.send(JSON.stringify({ method: 'SUBSCRIBE', params: streams, id: idx })); };
  ws.onmessage = ev => {
    try {
      const m = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString()); nmsg++; if (nmsg < 6) console.log('raw', String(ev.data).slice(0, 200)); const k = m.data && m.data.k; if (!k) return; // keep latest update per bar (close event can lag for illiquid symbols)
      const o = closed.get(k.t) || {}; o[m.data.s] = [+k.v, +k.q, m.data.E, k.x ? 1 : 0]; closed.set(k.t, o);
    } catch {}
  };
  ws.onclose = (e) => { console.log('close', idx, e.code, e.reason); setTimeout(() => connect(streams, idx), 2000); };
  ws.onerror = (e) => console.log('err', idx, e.message || e.type);
}
function connectTicker() {
  const ws = new WebSocket(process.argv[3] || 'wss://fstream.binance.com/market/stream');
  ws.onopen = () => ws.send(JSON.stringify({ method: 'SUBSCRIBE', params: ['!ticker@arr'], id: 999 }));
  ws.onmessage = ev => {
    try {
      const m = JSON.parse(String(ev.data)); if (!Array.isArray(m.data)) return;
      for (const x of m.data) {
        const prev = tk.get(x.s); const cur = [+x.v, x.E];
        const minute = Math.floor(x.E / 60000) * 60000;
        if (prev && Math.floor(prev[1] / 60000) * 60000 < minute) { const o = snap.get(minute) || {}; o[x.s] = { before: prev, after: cur }; snap.set(minute, o); }
        tk.set(x.s, cur);
      }
    } catch {}
  };
  ws.onclose = () => setTimeout(connectTicker, 2000); ws.onerror = () => {};
}
(async () => {
  connectTicker();
  console.log('start', typeof WebSocket);
  const info = await getJson('https://fapi.binance.com/fapi/v1/exchangeInfo');
  const syms = info.symbols.filter(s => (s.contractType === 'PERPETUAL' || s.contractType === 'TRADIFI_PERPETUAL') && s.status === 'TRADING').map(s => s.symbol.toLowerCase());
  for (let i = 0; i < syms.length; i += 180) connect(syms.slice(i, i + 180).map(s => s + '@kline_1m'), i);
  const end = Date.now() + minutes * 60000;
  (async function tickers() {
    while (Date.now() < end) {
      const now = Date.now(); const next = Math.ceil((now - 200) / 60000) * 60000 + 200; await sleep(next - now);
      try { const a = await getJson('https://fapi.binance.com/fapi/v1/ticker/24hr'); const d = {}; for (const x of a) d[x.symbol] = [+x.volume, +x.quoteVolume, x.closeTime, x.openTime]; tick.set(next - 200, { at: Date.now(), d }); } catch (e) { console.error(e.message); }
    }
  })();
  while (Date.now() < end + 60000) {
    await sleep(1000);
    for (const [t, v] of closed) {
      if (Date.now() - (t + 60000) < 4000) continue;
      const tkk = tick.get(t + 60000); const sn = snap.get(t + 60000) || null;
      fs.appendFileSync(path.join(DIR, 'v3live-' + new Date(t).toISOString().slice(0, 10).replace(/-/g, '') + '.jsonl'), JSON.stringify({ t, n: Object.keys(v).length, v1m: v, tickerAt: tkk && tkk.at, v24: tkk && tkk.d, ws: sn }) + '\n');
      closed.delete(t); tick.delete(t + 60000); snap.delete(t + 60000);
    }
  }
  process.exit(0);
})();
