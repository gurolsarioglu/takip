'use strict';
// Araştırma (salt okunur): Visivero M1-A "Volume: x%" satırı neyi ölçüyor? Visivero mesajlarındaki değerleri
// Binance 1 dk mumlarından üretilen adaylarla karşılaştırır. Mumlar doğrudan Binance'ten (yavaş, 650 ms aralık) çekilir.
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let last = 0;
async function get(u) { for (let a = 0; a < 6; a++) { const w = last + 650 - Date.now(); if (w > 0) await sleep(w); last = Date.now(); const r = await fetch(u); if (r.status === 429 || r.status === 418) { await sleep(Number(r.headers.get('retry-after') || 30) * 1000); continue; } if (r.ok) return r.json(); await sleep(3000); } throw new Error('fetch ' + u); }
(async () => {
  const bots = (await pool.query(`SELECT bot, count(*)::int n, min(created_at) a, max(created_at) b FROM vv_messages GROUP BY 1 ORDER BY 1`)).rows; console.table(bots);
  const NSYM = Number(process.argv[2] || 30);
  const rows = (await pool.query(`SELECT symbol, created_at, message FROM vv_messages WHERE message LIKE '%Volume:%' AND message LIKE '%Previous Price%' AND created_at >= '2026-10-26' ORDER BY created_at`)).rows;
  console.log('Volume satırlı mesaj:', rows.length); console.log('örnek:', JSON.stringify(rows.slice(-2).map(r => r.message)));
  const P = rows.map(r => { const m = r.message, num = re => { const x = m.match(re); return x ? Number(x[1]) : null; };
    return { s: r.symbol, t: r.created_at.getTime(), vol: num(/Volume:\s*([+-]?[\d.]+)%/), boost: num(/(?:Boost|Drop) Value:\s*([+-]?[\d.]+)%/), cur: num(/Current Price:\s*([\d.]+)/), prev: num(/Previous Price:\s*([\d.]+)/) }; }).filter(x => x.vol != null && x.s);
  console.log('ayrıştırılan:', P.length, 'Volume dağılımı (yüzdelik 5/25/50/75/95):', [0.05, 0.25, 0.5, 0.75, 0.95].map(q => P.map(x => x.vol).sort((a, b) => a - b)[Math.floor(q * (P.length - 1))]));
  const cnt = {}; for (const x of P) cnt[x.s] = (cnt[x.s] || 0) + 1;
  const syms = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, NSYM).map(x => x[0]);
  const cand = {}, AG = []; const add = (k, est, obs) => { if (!Number.isFinite(est)) return; (cand[k] ||= []).push([est, obs]); };
  for (const s of syms) {
    const msgs = P.filter(x => x.s === s); const t0 = Math.floor(msgs[0].t / 60e3) * 60e3 - 1500 * 60e3, t1 = msgs[msgs.length - 1].t + 120e3;
    const K = new Map(); let from = t0;
    while (from < t1) { const k = await get(`https://fapi.binance.com/fapi/v1/klines?symbol=${s}&interval=1m&startTime=${from}&limit=1500`); if (!k.length) break; for (const x of k) K.set(x[0], { o: +x[1], c: +x[4], v: +x[5], q: +x[7], tb: +x[9], tbq: +x[10] }); from = k[k.length - 1][0] + 60e3; if (k.length < 1500) break; }
    const sum = (m, n, f) => { let a = 0; for (let i = 0; i < n; i++) { const b = K.get(m - i * 60e3); if (!b) return NaN; a += f(b); } return a; };
    for (const x of msgs) {
      const m = Math.floor(x.t / 60e3) * 60e3, cur = K.get(m), pv = K.get(m - 60e3), pv2 = K.get(m - 120e3); if (!cur || !pv || !pv2) continue;
      const pc = v => (v - 1) * 100;
      const net = b => 2 * b.tbq - b.q, q24 = sum(m - 60e3, 1440, b => b.q);
      add('NET(alış−satış) dk / 24s q ×100', net(cur) / q24 * 100, x.vol);
      add('NET dk / önceki dk q ×100', net(cur) / pv.q * 100, x.vol);
      add('NET dk / dk q ×100', net(cur) / cur.q * 100, x.vol);
      add('NET 5dk / 24s q ×100', sum(m, 5, net) / q24 * 100, x.vol);
      add('NET 1s / 24s q ×100', sum(m, 60, net) / q24 * 100, x.vol);
      if (Math.random() < 0.02 && (AG.length < 400)) AG.push({ ...x, m, q24, pq: pv.q });
      add('1dk hacim (canlı) / önceki 1dk −1', pc(cur.q / pv.q), x.vol);
      add('önceki 1dk / ondan önceki 1dk −1', pc(pv.q / pv2.q), x.vol);
      add('24s q: dahil şimdiki dk / bir önceki', pc(sum(m, 1440, b => b.q) / sum(m - 60e3, 1440, b => b.q)), x.vol);
      add('24s q: kapanmış / bir önceki', pc(sum(m - 60e3, 1440, b => b.q) / sum(m - 120e3, 1440, b => b.q)), x.vol);
      add('24s base: dahil şimdiki dk / bir önceki', pc(sum(m, 1440, b => b.v) / sum(m - 60e3, 1440, b => b.v)), x.vol);
      add('alıcı payı (taker buy) − %50', (cur.tb / cur.v - 0.5) * 100, x.vol);
      add('şimdiki dk q / 24s q ×100', cur.q / sum(m, 1440, b => b.q) * 100, x.vol);
      add('1s q şimdi / 1s q önce', pc(sum(m, 60, b => b.q) / sum(m - 60e3, 60, b => b.q)), x.vol);
      add('5dk q / önceki 5dk q', pc(sum(m, 5, b => b.q) / sum(m - 5 * 60e3, 5, b => b.q)), x.vol);
      add('24s q şimdi / 24s q 1 saat önce', pc(sum(m, 1440, b => b.q) / sum(m - 60 * 60e3, 1440, b => b.q)), x.vol);
    }
    process.stderr.write(s + ' ');
  }
  // canlı dakikanın sinyal anına kadarki kısmı: Binance aggTrades
  for (const x of (process.argv[3] === 'agg' ? AG : [])) {
    let B = 0, S = 0, B60 = 0, S60 = 0, from = x.t - 60e3;
    for (let page = 0; page < 20 && from < x.t; page++) {
      const a = await get(`https://fapi.binance.com/fapi/v1/aggTrades?symbol=${x.s}&startTime=${from}&endTime=${x.t}&limit=1000`); if (!a.length) break;
      for (const tr of a) { const qq = +tr.p * +tr.q, sell = tr.m; if (tr.T >= x.m) { if (sell) S += qq; else B += qq; } if (sell) S60 += qq; else B60 += qq; }
      from = a[a.length - 1].T + 1; if (a.length < 1000) break;
    }
    const pre = 'aggTr ';
    add(pre + 'dk başından: (A−S)/(A+S) ×100', (B - S) / (B + S) * 100, x.vol);
    add(pre + 'dk başından: (A−S)/24s q ×100', (B - S) / x.q24 * 100, x.vol);
    add(pre + 'dk başından: (A−S)/önceki dk q ×100', (B - S) / x.pq * 100, x.vol);
    add(pre + 'dk başından: (A+S)/önceki dk q −1', ((B + S) / x.pq - 1) * 100, x.vol);
    add(pre + 'son 60 sn: (A−S)/(A+S) ×100', (B60 - S60) / (B60 + S60) * 100, x.vol);
    add(pre + 'son 60 sn: (A−S)/24s q ×100', (B60 - S60) / x.q24 * 100, x.vol);
    add(pre + 'son 60 sn: (A−S)/önceki dk q ×100', (B60 - S60) / x.pq * 100, x.vol);
  }
  const corr = a => { const n = a.length, mx = a.reduce((s, x) => s + x[0], 0) / n, my = a.reduce((s, x) => s + x[1], 0) / n; let sxy = 0, sxx = 0, syy = 0; for (const [x, y] of a) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; } return sxy / Math.sqrt(sxx * syy); };
  const out = {}; for (const [k, a] of Object.entries(cand)) { const err = a.map(([e, o]) => Math.abs(e - o)).sort((x, y) => x - y); out[k] = { n: a.length, korelasyon: +corr(a).toFixed(3), isaret: Math.round(100 * a.filter(([e, o]) => Math.sign(e) === Math.sign(o)).length / a.length) + '%', medyanHata: +err[Math.floor(err.length / 2)].toFixed(3), '±0.05 içinde': Math.round(100 * err.filter(e => e <= 0.05).length / err.length) + '%' }; }
  console.log(); console.table(out);
  for (const k of Object.keys(cand).filter(k => k.startsWith('aggTr'))) console.log(k, JSON.stringify(cand[k].slice(0, 20).map(([e, o]) => [+e.toFixed(2), o])));
  const best = Object.entries(cand).sort((a, b) => corr(b[1]) - corr(a[1]))[0]; console.log('en iyi aday örnekleri (tahmin, gerçek):', best[0], JSON.stringify(best[1].slice(0, 25).map(([e, o]) => [+e.toFixed(2), o])));
  await pool.end();
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
