'use strict';
// Araştırma: hammer-w1.cjs'nin aday havuzu (data/rapor/hammer-w1-aday.json) üzerinde eşik ızgarası.
// İlk 6 gün (20–26.10) ayar, son 4 gün (26–30.10) sınama. Ölçü: yakalama, isabet, F1, günlük sinyal, sonuç.
const fs = require('node:fs'), path = require('node:path');
const C = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'rapor', 'hammer-w1-aday.json'), 'utf8')).sort((a, b) => a.t - b.t);
const SPLIT = Date.parse('2026-10-26T08:00:00Z'), T0 = Date.parse('2026-10-20T08:00:00Z'), T1 = Date.parse('2026-10-30T14:00:00Z');
const vvKey = c => c.s + '|' + c.D + '|' + Math.round(c.t / 360e3);                       // ±3 dk kümeleme (yaklaşık mesaj kimliği)
const tot = part => { const s = new Set(); for (const c of C) if (c.m && part(c.t)) s.add(vvKey(c)); return s.size; };
const parts = { ayar: t => t < SPLIT, sinama: t => t >= SPLIT }, VV = { ayar: tot(parts.ayar), sinama: tot(parts.sinama) }, days = { ayar: (SPLIT - T0) / 864e5, sinama: (T1 - SPLIT) / 864e5 };
function run(p) {
  const last = new Map(), sel = [];
  for (const c of C) {
    if (c.z < p.z || c.b < p.b || c.e > p.e || c.g > p.g || c.p > p.p) continue;
    const k = c.s, L = last.get(k);
    if (p.mode === 'nobet') { if (L && L.D === c.D) continue; }
    else if (p.mode === 'sogu') { if (L && L.D === c.D && c.t - L.t < p.h * 3600e3) continue; }
    else if (p.mode === 'karma') { if (L && L.D === c.D && c.t - L.t < p.h * 3600e3) continue; }
    last.set(k, { D: c.D, t: c.t }); sel.push(c);
  }
  const o = {};
  for (const [n, f] of Object.entries(parts)) { const a = sel.filter(c => f(c.t)), hit = new Set(a.filter(c => c.m).map(vvKey)).size, pr = a.length ? a.filter(c => c.m).length / a.length : 0, rc = hit / VV[n];
    const up = a.filter(c => c.D === 1 && c.o), dn = a.filter(c => c.D === -1 && c.o), av = (x, i) => x.length ? x.reduce((s, c) => s + c.o[i], 0) / x.length : NaN, pc = (x, f2) => x.length ? Math.round(100 * x.filter(f2).length / x.length) : 0;
    o[n] = { n: a.length, gun: Math.round(a.length / days[n]), rc, pr, f1: pr + rc ? 2 * pr * rc / (pr + rc) : 0, up15: av(up, 1), upK: pc(up, c => c.o[2] > 0), upM: pc(up, c => c.o[3] >= 1), dn15: av(dn, 1), dnK: pc(dn, c => c.o[2] > 0) }; }
  return o;
}
const res = [];
for (const z of [53, 57, 61, 65]) for (const b of [1, 1.1]) for (const e of [18, 22, 26.5]) for (const g of [15, 23, 999]) for (const pv of [5, 9, 999])
  for (const m of [{ mode: 'yok' }, { mode: 'nobet' }, { mode: 'sogu', h: 2 }, { mode: 'sogu', h: 6 }, { mode: 'sogu', h: 24 }]) { const p = { z, b, e, g, p: pv, ...m }; res.push({ p, r: run(p) }); }
const show = (title, list) => { console.log('\n### ' + title); console.table(Object.fromEntries(list.map(x => { const { p, r } = x; const f = v => Math.round(v * 100);
  return [`wt2≥${p.z} boost≥${p.b} rsi≤${p.e} aralık≤${p.g} pivot≤${p.p} ${p.mode}${p.h ? p.h + 'sa' : ''}`, { 'AYAR gün': r.ayar.gun, 'yak%': f(r.ayar.rc), 'isb%': f(r.ayar.pr), F1: f(r.ayar.f1), 'SINAMA gün': r.sinama.gun, 'yak% ': f(r.sinama.rc), 'isb% ': f(r.sinama.pr), 'F1 ': f(r.sinama.f1), '🟢15dk': r.sinama.up15.toFixed(2), '🟢kaz60': r.sinama.upK, '🟢leh≥1%': r.sinama.upM, '🔴15dk': r.sinama.dn15.toFixed(2), '🔴kaz60': r.sinama.dnK }]; }))); };
console.log('Visivero #W1 olayı (yaklaşık): ayar', VV.ayar, '| sınama', VV.sinama, '| aday', C.length);
show('AYAR dönemine göre en iyi 12 (F1)', [...res].sort((a, b) => b.r.ayar.f1 - a.r.ayar.f1).slice(0, 12));
show('Günde ≤250 sinyal verenler içinde AYAR yakalaması en yüksek 8', res.filter(x => x.r.ayar.gun <= 250).sort((a, b) => b.r.ayar.rc - a.r.ayar.rc).slice(0, 8));
show('Yakalama ≥%70 olanlar içinde AYAR isabeti en yüksek 8', res.filter(x => x.r.ayar.rc >= 0.7).sort((a, b) => b.r.ayar.pr - a.r.ayar.pr).slice(0, 8));
