'use strict';
// Araştırma (salt okunur): Visivero mesajlarındaki "BTC Status: Normal | Volatilite ⚡️" satırının kuralı.
// Mesaj anındaki etiket, BTCUSDT 1 dk mumlarından üretilen adaylarla (son N dakikanın aralığı / değişimi) karşılaştırılır.
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
(async () => {
  const K = (await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, o, h, l, c FROM klines_1m WHERE symbol='BTCUSDT' ORDER BY t`)).rows.map(r => ({ t: Number(r.t), o: r.o, h: r.h, l: r.l, c: r.c }));
  const idx = new Map(K.map((k, i) => [k.t, i]));
  const M = (await pool.query(`SELECT created_at, (message LIKE '%Volatilite%') v FROM vv_messages WHERE bot='m1' AND created_at >= $1 AND created_at < $2 ORDER BY created_at`, [new Date(K[0].t + 3 * 3600e3), new Date(K.at(-1).t)])).rows;
  // dakika başına tek örnek (etiket çoğunluğu) — mesaj selleri ağırlığı bozmasın
  const byMin = new Map(); for (const m of M) { const t = Math.floor(m.created_at.getTime() / 60e3) * 60e3; let o = byMin.get(t); if (!o) byMin.set(t, o = [0, 0]); o[m.v ? 1 : 0]++; }
  const S = [...byMin.entries()].map(([t, [n, v]]) => ({ t, v: v > n })).filter(s => idx.has(s.t));
  console.log('dakika örneği:', S.length, '| volatil:', S.filter(s => s.v).length);
  const feats = {};
  for (const N of [1, 2, 3, 5, 10, 15, 30, 60]) {
    feats[`aralık ${N}dk (kapanmış)`] = s => { const i = idx.get(s.t); if (i < N) return NaN; let hi = -Infinity, lo = Infinity; for (let j = i - N; j < i; j++) { hi = Math.max(hi, K[j].h); lo = Math.min(lo, K[j].l); } return (hi / lo - 1) * 100; };
    feats[`aralık ${N}dk (canlı dahil)`] = s => { const i = idx.get(s.t); if (i < N) return NaN; let hi = -Infinity, lo = Infinity; for (let j = i - N + 1; j <= i; j++) { hi = Math.max(hi, K[j].h); lo = Math.min(lo, K[j].l); } return (hi / lo - 1) * 100; };
    feats[`|değişim| ${N}dk`] = s => { const i = idx.get(s.t); if (i < N) return NaN; return Math.abs(K[i - 1].c / K[i - 1 - N + 1].o - 1) * 100; };
    feats[`en büyük 1dk gövde, son ${N}dk`] = s => { const i = idx.get(s.t); if (i < N) return NaN; let m = 0; for (let j = i - N; j < i; j++) m = Math.max(m, Math.abs(K[j].c / K[j].o - 1) * 100); return m; };
  }
  const out = [];
  for (const [name, f] of Object.entries(feats)) {
    const d = S.map(s => [f(s), s.v]).filter(x => Number.isFinite(x[0])).sort((a, b) => a[0] - b[0]);
    const P = d.filter(x => x[1]).length, Nn = d.length - P; let tp = P, fp = Nn, best = { ba: 0 };
    for (let i = 0; i < d.length; i++) {            // eşik = d[i][0]: değer ≥ eşik → volatil
      const ba = (tp / P + (Nn - fp) / Nn) / 2; if (ba > best.ba) best = { ba, thr: d[i][0], rec: tp / P, prec: tp / (tp + fp), fpr: fp / Nn };
      if (d[i][1]) tp--; else fp--;
    }
    out.push({ aday: name, esik: +best.thr.toFixed(3), 'dengeli doğruluk%': +(best.ba * 100).toFixed(1), 'yakalama%': Math.round(best.rec * 100), 'isabet%': Math.round(best.prec * 100), 'yanlış alarm%': +(best.fpr * 100).toFixed(1) });
  }
  out.sort((a, b) => b['dengeli doğruluk%'] - a['dengeli doğruluk%']); console.table(out.slice(0, 14));
  // en iyi adayın gün gün tutarlılığı
  const bn = out[0].aday, bf = feats[bn], thr = out[0].esik, days = {};
  for (const s of S) { const x = bf(s); if (!Number.isFinite(x)) continue; const d = new Date(s.t).toISOString().slice(5, 10), o = days[d] ||= { n: 0, vol: 0, tp: 0, fp: 0 }; o.n++; if (s.v) o.vol++; if (x >= thr) { if (s.v) o.tp++; else o.fp++; } }
  console.log('en iyi:', bn, '≥', thr); console.table(days);
  // geçişler: volatil dönemlerin süresi
  let runs = [], cur = null; for (const s of S) { if (s.v) { if (cur && s.t - cur.e <= 5 * 60e3) cur.e = s.t; else runs.push(cur = { a: s.t, e: s.t }); } }
  console.log('volatil dönem sayısı:', runs.length, '| süreler (dk):', runs.map(r => Math.round((r.e - r.a) / 60e3) + 1).join(' '));
  await pool.end();
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
