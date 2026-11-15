'use strict';
// Panik Dibi stratejisinin ölçümü (salt okunur; veritabanına dokunmaz). Kaynak: data\arastirma\arsiv-olay-<küme><1..4>.jsonl
// (üretimi: node db/ozgun-arsiv.cjs indir a|b → node db/ozgun-arsiv.cjs olay a|b ; c kümesi: dbden c → olay c)
// Kullanım: node db/panik-olcum.cjs [a|b|c] [başlangıç-tarihi] [bitiş-tarihi]     örn: node db/panik-olcum.cjs a 2025-11-01 2026-07-01
// Kural (donmuş, KILAVUZ-PANIK.md §3): piyasa → sd10 ≥ 20, s1 ≥ 20, BTC 1 sa ≤ −1 ; coin → r1 ≤ −3, −25 ≤ r24 ≤ −8, 24 sa hacim ≥ 5 M$ ;
// her 5 dk mumunda en çok düşmüş 5 coin ; coin başına 6 saatte bir. Sonuç yalnız 48 saatlik devamı olan olaylarda ölçülür.
const fs = require('node:fs'), path = require('node:path'), readline = require('node:readline');
const DIR = path.join(__dirname, '..', 'data', 'arastirma'), SET = process.argv[2] || 'a';
const T1 = process.argv[3] ? Date.parse(process.argv[3] + 'T00:00:00Z') : -Infinity, T2 = process.argv[4] ? Date.parse(process.argv[4] + 'T00:00:00Z') : Infinity;
const UP = [0.5, 1, 1.5, 2, 3, 4, 5, 7, 10, 15, 20], DN = [1, 2, 3, 4, 5, 6, 8, 9.5, 19], CL = [12, 24, 48, 96, 144, 288, 576];
const K = { sd10: 20, s1: 20, b1: -1, r1: -3, r24max: -8, r24min: -25, q24: 5, perBar: 5, coolH: 6 };
const day = t => new Date(t).toISOString().slice(0, 10), f = (v, d = 2) => (v >= 0 ? '+' : '') + v.toFixed(d), mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
function trade(e, tp, sl, hor, fee = 0.2) {                 // fiyat % (kaldıraçsız), masraf düşülmüş; aynı mumda hedef ve zarar → zarar
  let u = e.u[UP.indexOf(tp)], w = sl == null ? 0 : e.w[DN.indexOf(sl)]; u = u > 0 && u <= hor ? u : Infinity; w = w > 0 && w <= hor ? w : Infinity;
  const win = u < w, loss = w <= u && w < Infinity;
  return { r: (win ? tp : loss ? -sl : e.cl[CL.indexOf(hor)]) - fee, win, loss, ex: win ? u : loss ? w : hor };
}
function kasa(E, tp, sl, hor, L, m, maxPos) {               // gelen her sinyale gir; yer yoksa atla
  let eq = 1, peak = 1, mdd = 0, open = [], n = 0, flo = 0;
  const close = t => { open.sort((a, b) => a.te - b.te); const keep = []; for (const p of open) { if (p.te <= t) { eq += p.pnl; peak = Math.max(peak, eq); mdd = Math.max(mdd, 1 - eq / peak); } else keep.push(p); } open = keep; };
  for (const e of E) {
    close(e.t); if (open.length >= maxPos) continue;
    const x = trade(e, tp, sl, hor), mar = m * eq; open.push({ te: e.t + x.ex * 300e3, pnl: Math.max(-mar, mar * L * x.r / 100), risk: Math.min(mar, mar * L * Math.min(e.mae, sl == null ? 100 : sl) / 100) }); n++;
    flo = Math.max(flo, open.reduce((s, p) => s + p.risk, 0) / eq);
  }
  close(Infinity); return { eq, mdd, n, flo };
}
(async () => {
  const rows = [];
  for (let q = 1; q <= 4; q++) {
    const p = path.join(DIR, `arsiv-olay-${SET}${q}.jsonl`); if (!fs.existsSync(p)) continue;
    for await (const line of readline.createInterface({ input: fs.createReadStream(p) })) {
      if (!line.includes('"d":1')) continue; const j = JSON.parse(line);
      if (j.d !== 1 || !j.g.includes('A') || j.n !== 576 || j.t < T1 || j.t >= T2) continue; const x = j.f;
      if (!(x.sd10 >= K.sd10 && x.s1 >= K.s1 && x.b1 <= K.b1 && x.r1 <= K.r1 && x.r24 <= K.r24max && x.r24 >= K.r24min && x.q24 >= K.q24)) continue;
      rows.push({ s: j.s, t: j.t, r24: x.r24, guc: x.sd10 >= 35 ? 3 : 2, u: j.u, w: j.w, cl: j.cl, mae: j.mae });
    }
  }
  rows.sort((a, b) => a.t - b.t || a.r24 - b.r24 || (a.s < b.s ? -1 : 1));
  const E = [], last = new Map(); let cur = null, c = 0;
  for (const e of rows) { if (e.t !== cur) { cur = e.t; c = 0; } if (c >= K.perBar || e.t - (last.get(e.s) ?? -Infinity) < K.coolH * 3600e3) continue; E.push(e); last.set(e.s, e.t); c++; }
  if (!E.length) return console.log('sinyal yok');
  const days = [...new Set(E.map(e => day(e.t)))];
  console.log(`KÜME ${SET}: ${day(E[0].t)} → ${day(E[E.length - 1].t)} | sinyal ${E.length} | panik günü ${days.length} | coin ${new Set(E.map(e => e.s)).size}`);
  const byDay = fn => days.map(d => mean(E.filter(e => day(e.t) === d).map(fn)));
  const d24 = byDay(e => e.cl[5]), sd = Math.sqrt(mean(d24.map(v => (v - mean(d24)) ** 2)) * d24.length / Math.max(1, d24.length - 1));
  console.log(`24 saat sonra (stopsuz, hedefsiz, masrafsız): gün ortalaması ${f(mean(d24))}% | t = ${(mean(d24) / (sd / Math.sqrt(d24.length))).toFixed(1)} | artıda kapanan gün %${(d24.filter(v => v > 0).length / d24.length * 100).toFixed(0)} | en kötü gün ${f(Math.min(...d24), 1)}% | en iyi gün ${f(Math.max(...d24), 1)}%`);
  console.log(`işlemler: 24 sa sonunda artıda %${(E.filter(e => e.cl[5] > 0).length / E.length * 100).toFixed(0)} | +%5 üstü %${(E.filter(e => e.cl[5] >= 5).length / E.length * 100).toFixed(0)} | −%10 altı %${(E.filter(e => e.cl[5] <= -10).length / E.length * 100).toFixed(0)} | 24 sa içinde −%9,5 gören %${(E.filter(e => e.w[7] > 0 && e.w[7] <= 288).length / E.length * 100).toFixed(0)} | −%19 gören %${(E.filter(e => e.w[8] > 0 && e.w[8] <= 288).length / E.length * 100).toFixed(1)}`);
  console.log('çıkış yapısı (fiyat %, masraf 0,2 düşülmüş): kazanan / zararla kapanan / işlem ort. / gün ort. / en kötü gün');
  for (const [nm, tp, sl, hor] of [['hedef +%3, stop yok(−%19), 24 sa', 3, 19, 288], ['hedef +%5, stop yok(−%19), 24 sa', 5, 19, 288], ['hedef +%10, stop yok(−%19), 24 sa', 10, 19, 288], ['BEKLE: hedef yok(+%20), 24 sa', 20, 19, 288], ['BEKLE 48 sa', 20, 19, 576], ['BEKLE 24 sa + stop −%9,5', 20, 9.5, 288], ['hedef +%5, stop −%5, 24 sa', 5, 5, 288]]) {
    const X = E.map(e => trade(e, tp, sl, hor)), dm = days.map(d => mean(E.map((e, i) => [day(e.t), X[i].r]).filter(v => v[0] === d).map(v => v[1])));
    console.log(`  ${nm.padEnd(34)} %${(X.filter(x => x.win).length / X.length * 100).toFixed(0).padStart(2)} / %${(X.filter(x => x.loss).length / X.length * 100).toFixed(0).padStart(2)} / ${f(mean(X.map(x => x.r)))} / ${f(mean(dm))} / ${f(Math.min(...dm), 1)}`);
  }
  console.log('kasa benzetimi (her pozisyon kasanın %10\'u büyüklüğünde; kasa çarpanı | kapanan işlemlerle en büyük düşüş | anlık en kötü üst sınır | işlem):');
  for (const [nm, tp, sl, hor, L, maxPos] of [['10x, hedef +%3, stop yok', 3, 9.5, 288, 10, 10], ['5x, hedef +%3, stop yok', 3, 19, 288, 5, 10], ['5x, hedef +%5, stop yok', 5, 19, 288, 5, 10], ['5x, BEKLE 24 sa', 20, 19, 288, 5, 10], ['3x, BEKLE 24 sa', 20, null, 288, 3, 10], ['3x, BEKLE 24 sa, en çok 5 poz', 20, null, 288, 3, 5], ['3x, BEKLE 24 sa, en çok 20 poz', 20, null, 288, 3, 20]]) {
    const k = kasa(E, tp, sl, hor, L, 0.10 / L, maxPos);
    console.log(`  ${nm.padEnd(32)} ×${k.eq.toFixed(2)} | −%${(k.mdd * 100).toFixed(0)} | −%${(k.flo * 100).toFixed(0)} | ${k.n}`);
  }
  console.log('gün gün (sinyal, güç, 24 sa ort %):'); console.log(days.map((d, i) => `${d.slice(2)} n=${E.filter(e => day(e.t) === d).length} g${Math.max(...E.filter(e => day(e.t) === d).map(e => e.guc))} ${f(d24[i], 1)}`).join(' | '));
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
