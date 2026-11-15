'use strict';
// M1 Premium scalp testi (salt okunur). İki mod: TAKİP (sinyal yönünde) ve TERS (yorulma: 🔴'de long, 🟢'de short).
// Giriş: sinyal fiyatı; sinyalden sonraki ilk tam dakikadan itibaren 1 dk mumlarla izlenir. Çıkış: hedef / stop / süre dolunca kapanış.
// Kâr-zarar KALDIRAÇLI (ROE %), komisyon düşülmüş (giriş+çıkış fiyatın %0,1'i × kaldıraç). Aynı mumda hedef ve stop → STOP (kötümser).
// Stop "100" = stopsuz: fiyat kaldıraç kadar ters giderse tasfiye (−%100) sayılır (gerçekte bakım teminatı yüzünden biraz daha erken olur).
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const FEE = 0.1, LEVS = [5, 10], TPS = [3, 5, 8, 20, 40], SLS = [10, 20, 50, 100], TS = [5, 15, 30, 60, 240], MODES = ['takip', 'ters'];
const K = []; for (const m of MODES) for (const L of LEVS) for (const tp of TPS) for (const sl of SLS) for (const T of TS) K.push({ m, L, tp, sl, T, key: `${m}|${L}|${tp}|${sl}|${T}` });
const KI = Object.fromEntries(K.map((k, i) => [k.key, i]));
function sim(bars, p, sg, L, tp, sl, T) {
  const up = p * (1 + sg * tp / L / 100), dn = p * (1 - sg * sl / L / 100);
  for (let i = 0; i < T; i++) {
    const b = bars[i];
    if (sg > 0 ? b.l <= dn : b.h >= dn) return [-sl - FEE * L, 2];
    if (sg > 0 ? b.h >= up : b.l <= up) return [tp - FEE * L, 1];
  }
  return [sg * (bars[T - 1].c / p - 1) * 100 * L - FEE * L, 0];
}
const num = (re, s) => { const m = s.match(re); return m ? Number(m[1]) : null; };
(async () => {
  const eps = (await pool.query(`
    SELECT k.symbol, k.dir, extract(epoch FROM k.t)*1000 AS t, k.price, k.star, k.div1, k.div5, s.text, s.boost_pct,
      (SELECT string_agg(DISTINCT o.bot, ',') FROM karne_signals o WHERE o.symbol = k.symbol AND o.dir = k.dir
         AND o.bot IN ('4s','4sniper','div','fr','1dws') AND o.t BETWEEN k.t - interval '4 hours' AND k.t) AS conf
    FROM karne_signals k JOIN LATERAL (SELECT text, boost_pct FROM signals WHERE bot = k.bot AND symbol = k.symbol AND t = k.t LIMIT 1) s ON true
    WHERE k.bot = 'm1-premium' AND k.dir IN ('up','down') ORDER BY k.symbol, k.t`)).rows;
  const bySym = new Map(); for (const e of eps) { if (!bySym.has(e.symbol)) bySym.set(e.symbol, []); bySym.get(e.symbol).push(e); }
  const res = []; let done = 0, nobar = 0;
  for (const [sym, list] of bySym) {
    const t0 = Number(list[0].t), t1 = Number(list[list.length - 1].t) + 245 * 60e3;
    const rows = (await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, h, l, c FROM klines_1m WHERE symbol=$1 AND t >= to_timestamp($2/1000.0) AND t <= to_timestamp($3/1000.0) ORDER BY t`, [sym, t0, t1])).rows.map(r => ({ t: Number(r.t), h: r.h, l: r.l, c: r.c }));
    let j = 0;
    for (const e of list) {
      const start = Math.floor(Number(e.t) / 60e3) * 60e3 + 60e3;
      while (j < rows.length && rows[j].t < start) j++;
      const bars = []; for (let i = j; i < rows.length && bars.length < 240; i++) { if (rows[i].t !== start + bars.length * 60e3) break; bars.push(rows[i]); }
      if (bars.length < 240) { nobar++; continue; }
      const sg0 = e.dir === 'down' ? -1 : 1, p = e.price, tx = e.text || '';
      let fav = 0, adv = 0; for (const b of bars) { fav = Math.max(fav, sg0 > 0 ? (b.h / p - 1) * 100 : (1 - b.l / p) * 100); adv = Math.max(adv, sg0 > 0 ? (1 - b.l / p) * 100 : (b.h / p - 1) * 100); }
      const wtm = tx.match(/WT Cross:\s*([^\n]*)/), wtTxt = wtm ? wtm[1] : '';
      const wtOpp = e.dir === 'up' ? /🔴/.test(wtTxt) : /🟢/.test(wtTxt), wtSame = e.dir === 'up' ? /🟢/.test(wtTxt) : /🔴/.test(wtTxt);
      const rsi5 = num(/RSI:[^\n]*?5m\.(\d+)/, tx), rsi1h = num(/RSI:[^\n]*?1h\.(\d+)/, tx);
      const rsiX = rsi5 == null ? false : e.dir === 'up' ? rsi5 >= 80 : rsi5 <= 20;
      const roe = new Float32Array(K.length), kind = new Int8Array(K.length);
      K.forEach((k, i) => { const sg = k.m === 'ters' ? -sg0 : sg0; const [r, kd] = sim(bars, p, sg, k.L, k.tp, k.sl, k.T); roe[i] = r; kind[i] = kd; });
      res.push({ dir: e.dir, star: e.star, d15: e.div1 && e.div5, d1: e.div1, wtOpp, wtSame, rsiX, rsi5, rsi1h, conf: e.conf, boost: e.boost_pct, fav, adv, roe, kind });
    }
    if (++done % 100 === 0) console.error(done, '/', bySym.size, 'coin');
  }
  const G = {
    'Hepsi 🟢': r => r.dir === 'up', 'Hepsi 🔴': r => r.dir === 'down',
    '🟢 1m✅5m✅': r => r.dir === 'up' && r.d15, '🔴 1m✅5m✅': r => r.dir === 'down' && r.d15,
    '🟢 WT ters renk': r => r.dir === 'up' && r.wtOpp, '🔴 WT ters renk': r => r.dir === 'down' && r.wtOpp,
    '🟢 RSI5m≥80': r => r.dir === 'up' && r.rsiX, '🔴 RSI5m≤20': r => r.dir === 'down' && r.rsiX,
    '🟢 1m✅5m✅ + WT ters': r => r.dir === 'up' && r.d15 && r.wtOpp, '🔴 1m✅5m✅ + WT ters': r => r.dir === 'down' && r.d15 && r.wtOpp,
    '🟢 1m✅5m✅ + RSI aşırı': r => r.dir === 'up' && r.d15 && r.rsiX, '🔴 1m✅5m✅ + RSI aşırı': r => r.dir === 'down' && r.d15 && r.rsiX,
    '🟢 uyumsuzluk yok': r => r.dir === 'up' && !r.d1 && !r.d15, '🔴 uyumsuzluk yok': r => r.dir === 'down' && !r.d1 && !r.d15,
    '🟢 teyitli (4S/Sniper/DIV/FR)': r => r.dir === 'up' && r.conf, '🔴 teyitli (4S/Sniper/DIV/FR)': r => r.dir === 'down' && r.conf,
  };
  const st = (rs, key) => { const i = KI[key]; if (!rs.length) return null; let s = 0, tp = 0, sl = 0, pos = 0; for (const r of rs) { s += r.roe[i]; if (r.kind[i] === 1) tp++; else if (r.kind[i] === 2) sl++; if (r.roe[i] > 0) pos++; } const n = rs.length; return { n, avg: +(s / n).toFixed(2), tp: Math.round(100 * tp / n), sl: Math.round(100 * sl / n), pos: Math.round(100 * pos / n), sum: Math.round(s) }; };
  const f = s => s ? `${s.avg > 0 ? '+' : ''}${s.avg} (h${s.tp}/s${s.sl})` : '-';
  const gs = Object.entries(G).map(([g, fn]) => [g, res.filter(fn)]);
  const summary = { at: new Date().toISOString(), n: res.length, nobar, groups: {} };
  for (const [g, rs] of gs) { summary.groups[g] = { n: rs.length, cfg: {} }; for (const k of K) summary.groups[g].cfg[k.key] = st(rs, k.key); }
  const OUT = path.join(__dirname, '..', 'data', 'rapor'); fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'scalp.json'), JSON.stringify(summary));
  console.log('Test edilen sinyal:', res.length, '(4 saatlik 1 dk mumu eksik olan atlandı:', nobar + ')');
  console.log('\n### 4 saat içinde fiyat: SİNYAL YÖNÜNDE en fazla / TERS YÖNDE en fazla ne kadar gitti (% sinyal)');
  console.table(Object.fromEntries(gs.map(([g, rs]) => { const n = rs.length || 1, c = (fn) => Math.round(100 * rs.filter(fn).length / n); return [g, { n: rs.length, 'yön ≥%1': c(r => r.fav >= 1), 'yön ≥%4': c(r => r.fav >= 4), 'ters ≥%1': c(r => r.adv >= 1), 'ters ≥%4': c(r => r.adv >= 4), 'ters ≥%10 (10x tasfiye)': c(r => r.adv >= 10), 'ters ≥%19 (5x tasfiye)': c(r => r.adv >= 19) }]; })));
  for (const L of LEVS) for (const m of MODES) {
    console.log(`\n### ${L}x ${m.toUpperCase()} — STOPSUZ (tasfiyeye kadar), hedefe göre / 30 dk ve 4 sa süre. Değer: ort. net ROE % (hedef%/tasfiye%)`);
    console.table(Object.fromEntries(gs.map(([g]) => [g, Object.fromEntries([['n', summary.groups[g].n], ...[3, 5, 8].map(tp => [`+${tp} 30dk`, f(summary.groups[g].cfg[`${m}|${L}|${tp}|100|30`])]), ...[5, 20, 40].map(tp => [`+${tp} 4sa`, f(summary.groups[g].cfg[`${m}|${L}|${tp}|100|240`])])])])));
  }
  for (const L of LEVS) {
    console.log(`\n### ${L}x TERS — hedef +5, 30 dk, stopa göre (stop ROE %)`);
    console.table(Object.fromEntries(gs.map(([g]) => [g, Object.fromEntries([['n', summary.groups[g].n], ...SLS.map(sl => [sl === 100 ? 'stopsuz' : `−${sl}`, f(summary.groups[g].cfg[`ters|${L}|5|${sl}|30`])])])])));
  }
  console.log('\n### Her grupta en iyi ayar (en az 150 sinyal) — DİKKAT: 400 ayardan en iyisini seçmek iyimser sonuç verir');
  const best = {}; for (const [g] of gs) { let b = null; for (const k of K) { const s = summary.groups[g].cfg[k.key]; if (s && s.n >= 150 && (!b || s.avg > b.s.avg)) b = { k, s }; } if (b) best[g] = { mod: b.k.m, kaldirac: b.k.L + 'x', hedef: '+' + b.k.tp, stop: b.k.sl === 100 ? 'yok' : '−' + b.k.sl, sure: b.k.T + 'dk', n: b.s.n, ortROE: b.s.avg, hedefe: b.s.tp + '%', stopa: b.s.sl + '%', arti: b.s.pos + '%' }; }
  console.table(best);
  await pool.end();
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
