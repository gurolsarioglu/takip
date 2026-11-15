'use strict';
// Araştırma (salt okunur): "FR merdiveni / pump makinesi" iddiasının ölçümü (video W7mkuLL7_AQ ve TrHqB9-aAEE).
// Veri: Visivero FR botunun orijinal mesajları (vv_messages, 15.09–30.10.2026) + klines_5m.
// Seri = aynı coinde art arda gelen 🟢 (funding daha da eksiye gitti) mesajları; arada 🔴 yok ve iki 🟢 arası ≤ GAP dk.
// Her serinin k. yeşilinde LONG girilseydi (giriş: o 5 dk mumunun kapanışı) sonraki 15dk/1sa/4sa ne olurdu?
// Ayrıca: seri bittiğinde (BRAKE dk yeşil gelmedi) SHORT girilseydi ne olurdu ("frenleme").
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const FROM = process.argv[2] || '2026-09-15T08:00:00Z', TO = process.argv[3] || '2026-10-30T12:00:00Z', M5 = 300e3, GAP = 6 * 60e3, BRAKE = 10 * 60e3;
function measure(K, t, sg) {
  const b0 = Math.floor(t / M5) * M5, e = K.get(b0); if (!e) return null; const price = e.c, at = n => K.get(b0 + n * M5);
  const c15 = at(3), c60 = at(12), c240 = at(48); if (!c15 || !c60 || !c240) return null;
  let hi = -Infinity, lo = Infinity, first = 0, hi4 = -Infinity, lo4 = Infinity;
  for (let n = 1; n <= 48; n++) { const b = at(n); if (!b) return null; if (n <= 12) { hi = Math.max(hi, b.h); lo = Math.min(lo, b.l); if (!first) { const up = b.h >= price * 1.02, dn = b.l <= price * 0.98; if (up && dn) first = 2; else if (up) first = sg; else if (dn) first = -sg; } } hi4 = Math.max(hi4, b.h); lo4 = Math.min(lo4, b.l); }
  const r = c => sg * (c.c / price - 1) * 100, p24 = K.get(b0 - 288 * M5);
  return { r15: r(c15), r60: r(c60), r240: r(c240), mfe: sg > 0 ? (hi / price - 1) * 100 : (1 - lo / price) * 100, mae: sg > 0 ? (lo / price - 1) * 100 : (1 - hi / price) * 100,
    mfe4: sg > 0 ? (hi4 / price - 1) * 100 : (1 - lo4 / price) * 100, mae4: sg > 0 ? (lo4 / price - 1) * 100 : (1 - hi4 / price) * 100, first, ch24: p24 ? (price / p24.c - 1) * 100 : NaN };
}
(async () => {
  const rows = (await pool.query(`SELECT symbol, created_at, message FROM vv_messages WHERE bot='fr' AND created_at >= $1 AND created_at < $2 AND symbol IS NOT NULL AND (message LIKE '🟢%' OR message LIKE '🔴%') ORDER BY symbol, created_at`, [FROM, TO])).rows;
  const by = new Map(); for (const r of rows) { const m = r.message, x = { t: r.created_at.getTime(), g: m.startsWith('🟢'), flip: /changed/.test(m), fr: Number((m.match(/Funding Rate: (-?[\d.]+)/) || [])[1]), prev: Number((m.match(/Previous Funding: (-?[\d.]+)/) || [])[1]), rem: (m.match(/Time Remaining: (\d+):(\d+)/) || []) };
    x.remMin = x.rem.length ? +x.rem[1] * 60 + +x.rem[2] : NaN; if (!by.has(r.symbol)) by.set(r.symbol, []); by.get(r.symbol).push(x); }
  console.log('mesaj:', rows.length, '| coin:', by.size, '| dönem', FROM.slice(0, 10), '→', TO.slice(0, 10));
  const EV = [], BR = [], RED = [];
  for (const [sym, list] of by) {
    const k = (await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, h, l, c FROM klines_5m WHERE symbol=$1 AND t >= $2 AND t <= $3`, [sym, new Date(list[0].t - 25 * 3600e3), new Date(list.at(-1).t + 5 * 3600e3)])).rows;
    if (!k.length) continue; const K = new Map(k.map(x => [Number(x.t), x]));
    let st = null;
    const close = () => { if (st && st.n >= 3) { const o = measure(K, st.last + BRAKE, -1); if (o) BR.push({ sym, n: st.n, fr: st.fr, dfr: st.fr0 - st.fr, dur: (st.last - st.t0) / 60e3, o }); } st = null; };
    for (const x of list) {
      if (!x.g) { if (st && st.n >= 2) { const o = measure(K, x.t, -1); if (o) RED.push({ sym, n: st.n, fr: x.fr, o }); } close(); continue; }
      if (st && x.t - st.last > GAP) close();
      if (!st) st = { t0: x.t, n: 0, fr0: Number.isFinite(x.prev) ? x.prev : x.fr };
      st.n++; st.last = x.t; st.fr = x.fr;
      const o = measure(K, x.t, 1); if (o) EV.push({ sym, t: x.t, k: st.n, fr: x.fr, dfr: st.fr0 - x.fr, dur: (x.t - st.t0) / 60e3, flip: x.flip, rem: x.remMin, o, wk: new Date(x.t).toISOString().slice(5, 10) });
    }
    close();
  }
  const avg = (a, f) => { const v = a.map(f).filter(Number.isFinite); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : NaN; }, pc = (a, f) => a.length ? Math.round(100 * a.filter(f).length / a.length) : 0, f2 = x => Number.isFinite(x) ? (x > 0 ? '+' : '') + x.toFixed(2) : '-';
  const med = (a, f) => { const v = a.map(f).filter(Number.isFinite).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : NaN; };
  const row = a => { const o = a.map(x => x.o); return { n: a.length, coin: new Set(a.map(x => x.sym)).size, '15dk': f2(avg(o, x => x.r15)), '1sa': f2(avg(o, x => x.r60)), '4sa': f2(avg(o, x => x.r240)), '1sa medyan': f2(med(o, x => x.r60)), 'kaz 1sa%': pc(o, x => x.r60 > 0), 'kaz 4sa%': pc(o, x => x.r240 > 0), 'önce +2/−2 %': `${pc(o, x => x.first === 1)}/${pc(o, x => x.first === -1)}`, 'lehte 4sa ort': f2(avg(o, x => x.mfe4)), 'aleyhte 4sa ort': f2(avg(o, x => x.mae4)), '4sa ≥+5%': pc(o, x => x.mfe4 >= 5), '4sa ≤−5%': pc(o, x => x.mae4 <= -5) }; };
  const T = (title, groups) => { console.log('\n### ' + title); const t = {}; for (const [g, a] of groups) if (a.length >= 25) t[g] = row(a); console.table(t); };
  const kb = k => k === 1 ? '1. yeşil' : k === 2 ? '2.' : k === 3 ? '3.' : k <= 5 ? '4–5.' : k <= 9 ? '6–9.' : '10+';
  const ord = ['1. yeşil', '2.', '3.', '4–5.', '6–9.', '10+'];
  const G = (list, fn, order) => { const m = new Map(); for (const x of list) { const k = fn(x); if (k == null) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(x); } const e = [...m.entries()]; return order ? e.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])) : e.sort((a, b) => a[0] < b[0] ? -1 : 1); };
  T('LONG — serinin kaçıncı yeşilinde girildi (tüm 🟢 mesajları)', G(EV, x => kb(x.k), ord));
  T('LONG — yalnız "+ → −" dönüş mesajı (seri başı) ve diğerleri', G(EV, x => x.k === 1 ? (x.flip ? '1. yeşil: funding +’dan −’ye döndü' : '1. yeşil: zaten eksideydi') : null));
  const frb = f => f > -0.2 ? 'a) 0 … −0,2' : f > -0.5 ? 'b) −0,2 … −0,5' : f > -1 ? 'c) −0,5 … −1' : f > -1.5 ? 'd) −1 … −1,5' : 'e) < −1,5';
  T('LONG — 3. ve sonraki yeşillerde, funding seviyesine göre', G(EV.filter(x => x.k >= 3), x => frb(x.fr)));
  T('LONG — 3.+ yeşilde, seride toplam derinleşmeye göre (puan)', G(EV.filter(x => x.k >= 3), x => x.dfr < 0.05 ? 'a) < 0,05' : x.dfr < 0.1 ? 'b) 0,05–0,10' : x.dfr < 0.25 ? 'c) 0,10–0,25' : 'd) ≥ 0,25'));
  T('LONG — 3.+ yeşilde, coinin 24 saatlik değişimine göre ("günün yükseleni mi")', G(EV.filter(x => x.k >= 3 && Number.isFinite(x.o.ch24)), x => x.o.ch24 < -10 ? 'a) ≤ −10%' : x.o.ch24 < 0 ? 'b) −10…0' : x.o.ch24 < 10 ? 'c) 0…+10' : x.o.ch24 < 25 ? 'd) +10…+25' : 'e) ≥ +25%'));
  T('LONG — 3.+ yeşilde, funding ödemesine kalan süreye göre', G(EV.filter(x => x.k >= 3 && Number.isFinite(x.rem)), x => x.rem < 30 ? 'a) < 30 dk' : x.rem < 120 ? 'b) 30–120 dk' : 'c) > 120 dk'));
  T('SHORT — seri bittikten 10 dk sonra ("frenleme"), seri uzunluğuna göre', G(BR, x => x.n <= 4 ? 'seri 3–4' : x.n <= 9 ? 'seri 5–9' : 'seri 10+'));
  T('SHORT — seriden sonra ilk 🔴 (funding gevşedi) mesajında', G(RED, x => x.n <= 4 ? 'seri 2–4' : 'seri 5+'));
  console.log('\n### Haftalara göre: 3.+ yeşilde LONG (1sa ort / 4sa ort / kaz 4sa% / n)');
  const wk = t => { const d = new Date(t), s = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7))); return s.toISOString().slice(5, 10); };
  console.table(Object.fromEntries(G(EV.filter(x => x.k >= 3), x => wk(x.t)).map(([w, a]) => [w, { n: a.length, coin: new Set(a.map(x => x.sym)).size, '1sa': f2(avg(a, x => x.o.r60)), '4sa': f2(avg(a, x => x.o.r240)), 'kaz 4sa%': pc(a, x => x.o.r240 > 0), 'önce +2/−2': `${pc(a, x => x.o.first === 1)}/${pc(a, x => x.o.first === -1)}` }])));
  // seri başına tek sayım (aynı seriden çok örnek gelmesin): serinin 3. yeşili
  T('LONG — her seriden TEK örnek: tam 3. yeşil anı, funding seviyesine göre', G(EV.filter(x => x.k === 3), x => frb(x.fr)));
  await pool.end();
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
