'use strict';
// Araştırma (salt okunur): kendi Hammer #W1 kuralımız, Visivero arşivindeki orijinal #W1'lere (hammer-pro) karşı.
// Kural adayı: kapanan 1 dk mumda WaveTrend(10,21,4) kesişimi, wt2 aşırı bölgede, son 5 mumda itki (Boost) ve RSI ucu,
// 24 sa aralık ve haftalık pivot kapıları, yön nöbeti (aynı yönde ikinci sinyal için önce ters yön).
// Ölçülenler: (1) aynı olayı yakalama (aynı coin + yön, ±3 dk), (2) sinyal sonrası sonuç (1 dk mumlarla),
// (3) eşleşen / fazladan / kaçan grupların özellik farkı. node db/hammer-w1.cjs [başlangıç] [bitiş]
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const FROM = Date.parse(process.argv[2] || '2026-10-20T08:00:00Z'), TO = Date.parse(process.argv[3] || '2026-10-30T14:00:00Z'), MIN = 60e3, TOL = 3 * MIN;
const ema = (a, n) => { const k = 2 / (n + 1), o = new Float64Array(a.length); let p = NaN; for (let i = 0; i < a.length; i++) { const v = a[i]; p = Number.isFinite(p) ? (Number.isFinite(v) ? v * k + p * (1 - k) : p) : v; o[i] = p; } return o; };
function features(K) {                       // K: [{t,o,h,l,c}] kesintisiz olmayabilir
  const n = K.length, ap = K.map(b => (b.h + b.l + b.c) / 3), esa = ema(ap, 10), d = ema(ap.map((v, i) => Math.abs(v - esa[i])), 10);
  const ci = ap.map((v, i) => d[i] ? (v - esa[i]) / (0.015 * d[i]) : NaN), wt1 = ema(ci, 21), wt2 = new Float64Array(n).fill(NaN);
  for (let i = 3; i < n; i++) wt2[i] = (wt1[i] + wt1[i - 1] + wt1[i - 2] + wt1[i - 3]) / 4;
  const ag = new Float64Array(n), al = new Float64Array(n), rsi = new Float64Array(n).fill(NaN);
  for (let i = 1; i < n; i++) { const ch = K[i].c - K[i - 1].c, g = Math.max(ch, 0), l = Math.max(-ch, 0); if (i <= 14) { ag[i] = ag[i - 1] + g / 14; al[i] = al[i - 1] + l / 14; } else { ag[i] = (ag[i - 1] * 13 + g) / 14; al[i] = (al[i - 1] * 13 + l) / 14; } if (i >= 14) rsi[i] = al[i] === 0 ? 100 : 100 - 100 / (1 + ag[i] / al[i]); }
  const rsiAt = (i, p) => { const ch = p - K[i - 1].c, g = (ag[i - 1] * 13 + Math.max(ch, 0)) / 14, l = (al[i - 1] * 13 + Math.max(-ch, 0)) / 14; return l === 0 ? 100 : 100 - 100 / (1 + g / l); };
  return { wt1, wt2, rsi, rsiAt };
}
function outcome(K, i, sg) {                  // giriş: i. mumun kapanışı
  const p = K[i].c; if (i + 60 >= K.length || K[i + 60].t - K[i].t !== 60 * MIN) return null;
  let hi = -Infinity, lo = Infinity, first = 0, mfe15 = 0;
  for (let j = i + 1; j <= i + 60; j++) { hi = Math.max(hi, K[j].h); lo = Math.min(lo, K[j].l); if (!first) { const up = K[j].h >= p * 1.01, dn = K[j].l <= p * 0.99; if (up && dn) first = 2; else if (up) first = sg; else if (dn) first = -sg; } if (j === i + 15) mfe15 = sg > 0 ? (hi / p - 1) * 100 : (1 - lo / p) * 100; }
  const r = j => sg * (K[j].c / p - 1) * 100;
  return { r5: r(i + 5), r15: r(i + 15), r60: r(i + 60), mfe: sg > 0 ? (hi / p - 1) * 100 : (1 - lo / p) * 100, mae: sg > 0 ? (lo / p - 1) * 100 : (1 - hi / p) * 100, mfe15, first };
}
(async () => {
  const vv = (await pool.query(`SELECT symbol, created_at, message FROM vv_messages WHERE bot='hammer-pro' AND message LIKE '%Strategy: #W1%' AND created_at >= $1 AND created_at < $2 ORDER BY symbol, created_at`, [new Date(FROM), new Date(TO)])).rows
    .map(r => ({ symbol: r.symbol, t: r.created_at.getTime(), sg: r.message.startsWith('🟢') ? 1 : -1, boost: Number((r.message.match(/Boost Value: \+?([\d.]+)/) || [])[1]), stars: (r.message.split('\n')[0].match(/⭐/g) || []).length }));
  const vvBy = new Map(); for (const v of vv) { if (!vvBy.has(v.symbol)) vvBy.set(v.symbol, []); vvBy.get(v.symbol).push(v); }
  const syms = (await pool.query(`SELECT symbol, count(*)::int n FROM klines_1m WHERE t >= $1 AND t < $2 GROUP BY 1 HAVING count(*) > 5000`, [new Date(FROM - 8 * 3600e3), new Date(TO)])).rows.map(r => r.symbol);
  console.log('Visivero #W1 mesajı:', vv.length, '| 1 dk mumu olan coin:', syms.length, '| dönem', new Date(FROM).toISOString().slice(0, 16), '→', new Date(TO).toISOString().slice(0, 16));
  const C = [], MISS = []; let vvIn = 0;
  for (const sym of syms) {
    const K = (await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, o, h, l, c FROM klines_1m WHERE symbol=$1 AND t >= $2 AND t < $3 ORDER BY t`, [sym, new Date(FROM - 8 * 3600e3), new Date(TO + 2 * 3600e3)])).rows.map(r => ({ t: Number(r.t), o: r.o, h: r.h, l: r.l, c: r.c }));
    if (K.length < 600) continue;
    const k5 = (await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, h, l, c FROM klines_5m WHERE symbol=$1 AND t >= $2 AND t < $3 ORDER BY t`, [sym, new Date(FROM - 16 * 864e5), new Date(TO)])).rows.map(r => ({ t: Number(r.t), h: r.h, l: r.l, c: r.c }));
    // haftalık (Pzt 00:00 UTC) H/L/C → Fibonacci pivot; 24 sa aralık için 5 dk önek taraması
    const wk = new Map(); for (const b of k5) { const d = new Date(b.t), w = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); let x = wk.get(w); if (!x) wk.set(w, x = { h: -Infinity, l: Infinity, c: 0 }); x.h = Math.max(x.h, b.h); x.l = Math.min(x.l, b.l); x.c = b.c; }
    const pivD = (t, price) => { const d = new Date(t), w = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)) - 7 * 864e5, p = wk.get(w); if (!p) return NaN; const P = (p.h + p.l + p.c) / 3, r = p.h - p.l; return Math.min(...[P, P + .382 * r, P - .382 * r, P + .618 * r, P - .618 * r, P + r, P - r].map(v => Math.abs(price - v) / price * 100)); };
    let p5 = 0; const range24 = t => { while (p5 < k5.length && k5[p5].t < t - 864e5) p5++; let hi = -Infinity, lo = Infinity; for (let j = p5; j < k5.length && k5[j].t < t; j++) { hi = Math.max(hi, k5[j].h); lo = Math.min(lo, k5[j].l); } return hi > 0 ? (hi / lo - 1) * 100 : NaN; };
    const F = features(K), V = (vvBy.get(sym) || []).map(v => ({ ...v, hit: false })); vvIn += V.length;
    for (let i = 30; i < K.length; i++) {
      const t = K[i].t + MIN; if (t < FROM || t >= TO) continue;                   // sinyal anı = mum kapanışı
      const a1 = F.wt1[i - 1], b1 = F.wt2[i - 1], a = F.wt1[i], b = F.wt2[i]; if (![a1, b1, a, b].every(Number.isFinite)) continue;
      const D = a1 <= b1 && a > b ? 1 : a1 >= b1 && a < b ? -1 : 0; if (!D) continue;
      const zone = D === 1 ? -b : b; if (zone < 40) continue;                      // geniş aday havuzu: wt2 ±40 ötesi
      let boost = 0, minExt = 99;
      for (let j = i - 4; j <= i; j++) { const x = K[j], v = D === 1 ? (x.o - x.l) / x.l * 100 : (x.h - x.o) / x.o * 100; if (v > boost) boost = v; const r = F.rsiAt(j, D === 1 ? x.l : x.h); minExt = Math.min(minExt, D === 1 ? r : 100 - r); }
      const c = { sym, t, i, D, zone, boost, minExt, rsi: D === 1 ? F.rsi[i] : 100 - F.rsi[i], range24: range24(t), piv: pivD(t, K[i].c), out: outcome(K, i, D), match: null };
      const m = V.find(v => v.sg === D && Math.abs(v.t - t) <= TOL); if (m) { c.match = m; m.hit = true; }
      C.push(c);
    }
    for (const v of V) if (!v.hit) { let i = -1; for (let j = K.length - 1; j >= 0; j--) if (K[j].t + MIN <= v.t) { i = j; break; } MISS.push({ ...v, out: i > 0 ? outcome(K, i, v.sg) : null }); }
    if (C.length % 1 === 0 && syms.indexOf(sym) % 100 === 99) console.error(syms.indexOf(sym) + 1, '/', syms.length);
  }
  console.log('aday (WT kesişimi, wt2 ±40 ötesi):', C.length, '| bu coinlerdeki Visivero #W1:', vvIn);
  const avg = (a, f) => { const v = a.map(f).filter(Number.isFinite); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : NaN; }, pc = (a, f) => a.length ? Math.round(100 * a.filter(f).length / a.length) : 0, f2 = x => Number.isFinite(x) ? (x > 0 ? '+' : '') + x.toFixed(2) : '-';
  const days = (TO - FROM) / 864e5;
  // yön nöbeti: aynı coin + aynı yönde art arda sinyal yok
  const toggle = list => { const last = new Map(), o = []; for (const c of [...list].sort((x, y) => x.t - y.t)) { if (last.get(c.sym) === c.D) continue; last.set(c.sym, c.D); o.push(c); } return o; };
  const stat = (name, list) => { const hit = new Set(list.filter(c => c.match).map(c => c.match.symbol + c.match.t)); const o = list.filter(c => c.out).map(c => c.out), up = list.filter(c => c.D === 1 && c.out).map(c => c.out), dn = list.filter(c => c.D === -1 && c.out).map(c => c.out);
    return { kural: name, sinyal: list.length, gunluk: Math.round(list.length / days), 'yakalama%': Math.round(100 * hit.size / vvIn), 'isabet%': pc(list, c => c.match), '🟢 n': up.length, '🟢 15dk': f2(avg(up, x => x.r15)), '🟢 kaz60%': pc(up, x => x.r60 > 0), '🟢 lehte≥1%': pc(up, x => x.mfe >= 1), '🟢 önce leh/aleyh': `${pc(up, x => x.first === 1)}/${pc(up, x => x.first === -1)}`, '🔴 n': dn.length, '🔴 15dk': f2(avg(dn, x => x.r15)), '🔴 kaz60%': pc(dn, x => x.r60 > 0) }; };
  const R = [];
  const base = c => c.zone >= 53, full = c => base(c) && c.boost >= 1 && c.minExt <= 26.5 && !(c.range24 > 23) && !(c.piv > 9);
  R.push(stat('A  WT kesişimi, wt2 ±53', C.filter(base)));
  R.push(stat('B  A + Boost ≥1', C.filter(c => base(c) && c.boost >= 1)));
  R.push(stat('C  B + RSI ucu ≤26,5', C.filter(c => base(c) && c.boost >= 1 && c.minExt <= 26.5)));
  R.push(stat('D  C + 24sa aralık ≤%23 + pivot ≤%9 (eski kural)', C.filter(full)));
  R.push(stat('E  D + yön nöbeti', toggle(C.filter(full))));
  R.push(stat('F  C + yön nöbeti (kapısız)', toggle(C.filter(c => base(c) && c.boost >= 1 && c.minExt <= 26.5))));
  R.push(stat('G  wt2 ±60, Boost ≥1, RSI ucu ≤20', C.filter(c => c.zone >= 60 && c.boost >= 1 && c.minExt <= 20)));
  R.push(stat('H  wt2 ±53, Boost ≥2 (⭐)', C.filter(c => base(c) && c.boost >= 2)));
  R.push(stat('I  wt2 ±53, Boost ≥0,5, RSI ucu ≤20', C.filter(c => base(c) && c.boost >= 0.5 && c.minExt <= 20)));
  R.push(stat('J  wt2 ±70, Boost ≥1', C.filter(c => c.zone >= 70 && c.boost >= 1)));
  console.log('\n### Kural adayları — Visivero ile örtüşme ve sinyal sonrası sonuç'); console.table(Object.fromEntries(R.map(r => { const { kural, ...x } = r; return [kural, x]; })));
  // Visivero'nun kendi #W1'leri aynı ölçüyle (1 dk mum)
  const vAll = [...C.filter(c => c.match).map(c => ({ sg: c.D, out: c.out })), ...MISS.map(m => ({ sg: m.sg, out: m.out }))].filter(x => x.out);
  const vr = sg => { const o = vAll.filter(x => x.sg === sg).map(x => x.out); return { n: o.length, '5dk': f2(avg(o, x => x.r5)), '15dk': f2(avg(o, x => x.r15)), '1sa': f2(avg(o, x => x.r60)), 'kaz60%': pc(o, x => x.r60 > 0), 'lehte≥1% (15dk)': pc(o, x => x.mfe15 >= 1), 'lehte≥1% (1sa)': pc(o, x => x.mfe >= 1), 'önce leh/aleyh': `${pc(o, x => x.first === 1)}/${pc(o, x => x.first === -1)}`, mae: f2(avg(o, x => x.mae)) }; };
  console.log('\n### Kıyas: Visivero\'nun orijinal #W1 sinyalleri (aynı dönem, aynı ölçü)'); console.table({ 'VV #W1 🟢': vr(1), 'VV #W1 🔴': vr(-1) });
  // eşleşen vs fazladan: özellik dağılımı (kural C havuzunda)
  const pool2 = C.filter(c => base(c) && c.boost >= 1 && c.minExt <= 26.5), q = (a, f, p) => { const v = a.map(f).filter(Number.isFinite).sort((x, y) => x - y); return v.length ? +v[Math.floor(p * (v.length - 1))].toFixed(2) : NaN; };
  const dist = (a) => Object.fromEntries([['zone (|wt2|)', c => c.zone], ['boost', c => c.boost], ['RSI ucu', c => c.minExt], ['RSI kapanış', c => c.rsi], ['24sa aralık', c => c.range24], ['pivot uzaklık', c => c.piv]].map(([n, f]) => [n, `${q(a, f, .1)} / ${q(a, f, .5)} / ${q(a, f, .9)}`]));
  console.log('\n### Kural C havuzu: eşleşen ve fazladan sinyallerin özellikleri (10. / 50. / 90. yüzdelik)'); console.table({ ['eşleşen n=' + pool2.filter(c => c.match).length]: dist(pool2.filter(c => c.match)), ['fazladan n=' + pool2.filter(c => !c.match).length]: dist(pool2.filter(c => !c.match)) });
  const ex = pool2.filter(c => !c.match && c.out).map(c => c), mt = pool2.filter(c => c.match && c.out);
  const o3 = (a, D) => { const o = a.filter(c => c.D === D).map(c => c.out); return { n: o.length, '15dk': f2(avg(o, x => x.r15)), 'kaz60%': pc(o, x => x.r60 > 0), 'lehte≥1%': pc(o, x => x.mfe >= 1), 'önce leh/aleyh': `${pc(o, x => x.first === 1)}/${pc(o, x => x.first === -1)}` }; };
  console.log('\n### Kural C: eşleşen ve fazladan sinyallerin SONUCU (fazladanlar daha mı kötü?)'); console.table({ 'eşleşen 🟢': o3(mt, 1), 'fazladan 🟢': o3(ex, 1), 'eşleşen 🔴': o3(mt, -1), 'fazladan 🔴': o3(ex, -1) });
  console.log('\nKaçan Visivero #W1 (hiçbir adayla ±3 dk eşleşmeyen):', MISS.length, '/', vvIn);
  fs.mkdirSync(path.join(__dirname, '..', 'data', 'rapor'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'rapor', 'hammer-w1-aday.json'), JSON.stringify(C.map(c => ({ s: c.sym, t: c.t, D: c.D, z: +c.zone.toFixed(1), b: +c.boost.toFixed(2), e: +c.minExt.toFixed(1), r: +(c.rsi || 0).toFixed(1), g: +(c.range24 || 0).toFixed(1), p: +(c.piv || 0).toFixed(2), m: c.match ? 1 : 0, o: c.out ? [+c.out.r5.toFixed(2), +c.out.r15.toFixed(2), +c.out.r60.toFixed(2), +c.out.mfe.toFixed(2), +c.out.mae.toFixed(2), c.out.first, +c.out.mfe15.toFixed(2)] : null }))));
  await pool.end();
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
