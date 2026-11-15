'use strict';
// Araştırma: Visivero M1-A "Volume: x%" — saniye hassasiyetinde test. Binance'in herkese açık günlük aggTrades arşivinden
// (data.binance.vision) birkaç coin-gün indirir (data/arastirma/agg), Visivero mesaj anındaki alış/satış akışından adayları hesaplar.
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const DIR = path.join(__dirname, '..', 'data', 'arastirma', 'agg'); fs.mkdirSync(DIR, { recursive: true });
const DAYS = (process.argv[3] || '2026-10-28,2026-10-29').split(','), NSYM = Number(process.argv[2] || 10);
async function file(sym, day) {
  const csv = path.join(DIR, `${sym}-aggTrades-${day}.csv`); if (fs.existsSync(csv)) return csv;
  const url = `https://data.binance.vision/data/futures/um/daily/aggTrades/${sym}/${sym}-aggTrades-${day}.zip`, r = await fetch(url);
  if (!r.ok) { console.log('yok', url, r.status); return null; }
  const zip = path.join(DIR, `${sym}-${day}.zip`); fs.writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
  execFileSync('tar', ['-xf', zip, '-C', DIR]); try { fs.unlinkSync(zip); } catch { } return fs.existsSync(csv) ? csv : null;
}
async function load(csv) {
  const rl = require('node:readline').createInterface({ input: fs.createReadStream(csv), crlfDelay: Infinity });
  let cap = 1 << 20, T = new Float64Array(cap), B = new Float64Array(cap + 1), S = new Float64Array(cap + 1), Q = new Float64Array(cap + 1), P = new Float64Array(cap), k = 0;
  for await (const ln of rl) {
    const c = ln.split(','); if (c.length < 7 || !/^\d/.test(c[0])) continue;
    if (k + 1 >= cap) { cap *= 2; const T2 = new Float64Array(cap); T2.set(T); T = T2; const B2 = new Float64Array(cap + 1); B2.set(B); B = B2; const S2 = new Float64Array(cap + 1); S2.set(S); S = S2; const Q2 = new Float64Array(cap + 1); Q2.set(Q); Q = Q2; const P2 = new Float64Array(cap); P2.set(P); P = P2; }
    const q = +c[1] * +c[2], sell = c[6].trim() === 'true'; T[k] = +c[5]; P[k] = +c[1]; Q[k + 1] = Q[k] + +c[2]; B[k + 1] = B[k] + (sell ? 0 : q); S[k + 1] = S[k] + (sell ? q : 0); k++;
  }
  return { n: k, T, B, S, Q, P };
}
const idx = (D, t) => { let lo = 0, hi = D.n; while (lo < hi) { const m = (lo + hi) >> 1; if (D.T[m] < t) lo = m + 1; else hi = m; } return lo; };   // ilk T >= t
const flow = (D, a, b) => { const i = idx(D, a), j = idx(D, b); return { B: D.B[j] - D.B[i], S: D.S[j] - D.S[i], q: D.Q[j] - D.Q[i], first: D.P[i], last: D.P[j - 1] }; };
const vw = f => (f.B + f.S) / f.q;
(async () => {
  const IMP = {}; const imp = (k, net, obs, V) => { if (Math.abs(obs) < 0.3 || Math.sign(net) !== Math.sign(obs) || !(V > 0)) return; (IMP[k] ||= []).push(Math.log10(net * 100 / obs / V)); };
  const cand = {}; const add = (k, e, o) => { if (Number.isFinite(e)) (cand[k] ||= []).push([e, o]); };
  for (const day of DAYS) {
    const d0 = Date.parse(day + 'T00:00:00Z'), d1 = d0 + 864e5;
    const rows = (await pool.query(`SELECT symbol, created_at, message FROM vv_messages WHERE bot='m1' AND message LIKE '%Volume:%' AND created_at >= $1 AND created_at < $2`, [new Date(d0 + 120e3), new Date(d1)])).rows;
    const cnt = {}; for (const r of rows) cnt[r.symbol] = (cnt[r.symbol] || 0) + 1;
    const syms = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, NSYM).map(x => x[0]);
    for (const s of syms) {
      const csv = await file(s, day); if (!csv) continue; const D = await load(csv);
      const q24rows = (await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, qv FROM klines_5m WHERE symbol=$1 AND t >= $2 AND t < $3 ORDER BY t`, [s, new Date(d0 - 864e5), new Date(d1)])).rows.map(r => [Number(r.t), r.qv]);
      const q24 = t => { let a = 0; for (const [tt, q] of q24rows) if (tt < Math.floor(t / 300e3) * 300e3 && tt >= t - 864e5) a += q; return a; };
      let used = 0;
      for (const r of rows.filter(r => r.symbol === s)) {
        const v = r.message.match(/Volume:\s*([+-]?[\d.]+)%/); if (!v) continue; const obs = +v[1], t = r.created_at.getTime();
        const Q24 = q24(t);
        for (const off of [0, 1000, 3000]) {
          const te = t - off, m0 = Math.floor(te / 60e3) * 60e3, tag = ` [−${off / 1000}sn]`;
          const a = flow(D, m0, te), p = flow(D, m0 - 60e3, m0), w = flow(D, te - 60e3, te), w2 = flow(D, te - 120e3, te - 60e3);
          const net = a.B - a.S, tot = a.B + a.S, ptot = p.B + p.S;
          add('dk başından (A−S)/(A+S)' + tag, net / tot * 100, obs);
          add('dk başından (A−S)/önceki dk hacmi' + tag, net / ptot * 100, obs);
          add('dk başından (A−S)/24s hacim' + tag, net / Q24 * 100, obs);
          add('dk başından hacim/önceki dk −1' + tag, (tot / ptot - 1) * 100, obs);
          add('son 60sn (A−S)/(A+S)' + tag, (w.B - w.S) / (w.B + w.S) * 100, obs);
          add('son 60sn (A−S)/önceki 60sn hacmi' + tag, (w.B - w.S) / (w2.B + w2.S) * 100, obs);
          add('son 60sn hacim/önceki 60sn −1' + tag, ((w.B + w.S) / (w2.B + w2.S) - 1) * 100, obs);
          add('son 60sn (A−S)/24s hacim' + tag, (w.B - w.S) / Q24 * 100, obs);
          if (off === 1000) {
            const vol = (a0, b0) => { const f = flow(D, a0, b0); return f.B + f.S; };
            const impA = (k, num, V) => { if (Math.abs(obs) < 0.3 || !(V > 0) || !(num > 0)) return; (IMP['|V| ' + k] ||= []).push(Math.log10(num * 100 / Math.abs(obs) / V)); };
            const v60 = w.B + w.S, v30 = vol(te - 30e3, te), v10 = vol(te - 10e3, te);
            for (const [nk, nv] of [['dk hacmi', tot], ['60sn hacmi', v60], ['30sn hacmi', v30], ['10sn hacmi', v10]]) {
              impA(nk + ' / 24s', nv, Q24); impA(nk + ' / önceki dk', nv, ptot); impA(nk + ' / son 1s', nv, vol(te - 3600e3, te)); impA(nk + ' / son 15dk', nv, vol(te - 900e3, te)); impA(nk + ' / son 5dk', nv, vol(te - 300e3, te)); impA(nk + ' / gün başından', nv, vol(d0, te));
            }
            for (const [nk, nv] of [['dk başından', net], ['son 60sn', w.B - w.S], ['son 30sn', (() => { const f = flow(D, te - 30e3, te); return f.B - f.S; })()]]) {
              imp(nk + ' / önceki dk', nv, obs, ptot); imp(nk + ' / son 5dk', nv, obs, vol(te - 300e3, te)); imp(nk + ' / son 15dk', nv, obs, vol(te - 900e3, te));
              imp(nk + ' / son 1s', nv, obs, vol(te - 3600e3, te)); imp(nk + ' / son 4s', nv, obs, vol(te - 4 * 3600e3, te)); imp(nk + ' / 24s', nv, obs, Q24);
              imp(nk + ' / dk başından hacim', nv, obs, tot); imp(nk + ' / gün başından', nv, obs, vol(d0, te));
            }
          }
          const mm = r.message.match(/(?:Boost|Drop) Value:\s*([+-]?[\d.]+)%/), bst = mm ? +mm[1] : NaN;
          const sg = Math.sign(bst), volq = (a0, b0) => { const f = flow(D, a0, b0); return f.B + f.S; }, volb = (a0, b0) => flow(D, a0, b0).q, h0 = Math.floor(te / 3600e3) * 3600e3;
          add('H dk/önceki 60 kapanmış dk' + tag, sg * tot / volq(m0 - 3600e3, m0) * 100, obs);
          add('H dk/(59 kapanmış dk + şimdiki)' + tag, sg * tot / volq(m0 - 3540e3, te) * 100, obs);
          add('H dk/son 60 dk (te−1s→te)' + tag, sg * tot / volq(te - 3600e3, te) * 100, obs);
          add('H dk/1s mumu (saat başından)' + tag, sg * tot / volq(h0, te) * 100, obs);
          add('H base dk/önceki 60 dk' + tag, sg * volb(m0, te) / volb(m0 - 3600e3, m0) * 100, obs);
          add('H base dk/(59+şimdiki)' + tag, sg * volb(m0, te) / volb(m0 - 3540e3, te) * 100, obs);
          add('VWAP dk başından / önceki dk VWAP −1' + tag, (vw(a) / vw(p) - 1) * 100, obs);
          add('VWAP dk başından / dk açılış −1' + tag, (vw(a) / a.first - 1) * 100, obs);
          add('VWAP dk başından / önceki dk kapanış −1' + tag, (vw(a) / p.last - 1) * 100, obs);
          add('VWAP son 60sn / önceki 60sn VWAP −1' + tag, (vw(w) / vw(w2) - 1) * 100, obs);
          add('son fiyat / dk VWAP −1' + tag, (a.last / vw(a) - 1) * 100, obs);
          add('son fiyat / önceki dk VWAP −1' + tag, (a.last / vw(p) - 1) * 100, obs);
          add('önceki dk (A−S)/(A+S)' + tag, (p.B - p.S) / ptot * 100, obs);
        }
        used++;
      }
      console.log(day, s, 'işlem:', D.n, 'mesaj:', used);
    }
  }
  const corr = a => { const n = a.length, mx = a.reduce((s, x) => s + x[0], 0) / n, my = a.reduce((s, x) => s + x[1], 0) / n; let sxy = 0, sxx = 0, syy = 0; for (const [x, y] of a) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; } return sxy / Math.sqrt(sxx * syy); };
  const out = {}; for (const [k, a] of Object.entries(cand)) { const err = a.map(([e, o]) => Math.abs(e - o)).sort((x, y) => x - y); out[k] = { n: a.length, kor: +corr(a).toFixed(3), isaret: Math.round(100 * a.filter(([e, o]) => Math.sign(e) === Math.sign(o)).length / a.length) + '%', medHata: +err[Math.floor(err.length / 2)].toFixed(3), '±0.05': Math.round(100 * err.filter(e => e <= 0.05).length / err.length) + '%', '±0.5': Math.round(100 * err.filter(e => e <= 0.5).length / err.length) + '%' }; }
  console.table(Object.fromEntries(Object.entries(out).sort((a, b) => b[1].kor - a[1].kor)));
  const q = (a, x) => a[Math.floor(x * (a.length - 1))];
  console.log('\nÖrtük payda testi: log10(gerçek payda / aday payda) — IQR küçükse doğru payda, medyan 0 ise ölçek de doğru');
  console.table(Object.fromEntries(Object.entries(IMP).map(([k, a]) => { a.sort((x, y) => x - y); return [k, { n: a.length, medyan: +q(a, .5).toFixed(3), IQR: +(q(a, .75) - q(a, .25)).toFixed(3), p10: +q(a, .1).toFixed(2), p90: +q(a, .9).toFixed(2) }]; }).sort((x, y) => x[1].IQR - y[1].IQR)));
  const best = Object.entries(cand).sort((a, b) => corr(b[1]) - corr(a[1])).slice(0, 2);
  for (const [k, a] of best) console.log(k, JSON.stringify(a.filter((_, i) => i % Math.max(1, Math.floor(a.length / 30)) === 0).slice(0, 30).map(([e, o]) => [+e.toFixed(2), o])));
  await pool.end();
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
