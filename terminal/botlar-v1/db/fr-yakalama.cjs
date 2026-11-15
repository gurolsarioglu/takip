'use strict';
// Rapor: FR botunun yakaladığı coinler — "şu tarihte şu fiyattan yakaladık, fiyat şu tarihte şuraya geldi".
// Yakalama = bir coinde, önceki FR 🟢 mesajından en az SESSIZ saat sonra gelen ilk 🟢 (funding eksiye döndü / daha da eksiye gitti).
// Sonrası IZLE saat boyunca 5 dk mumlarla izlenir: en yüksek fiyat ve zamanı, o tepeye kadar görülen en düşük, en düşük fiyat ve zamanı,
// 4 sa / 24 sa sonraki fiyat, şimdiki fiyat; yakalama boyunca gelen yeşil sayısı ve funding'in indiği en dip.
// Çıktı: özet tablolar + data\rapor\fr-yakalama.json (tam liste) + veritabanında fr_yakalama tablosu (site/sorgu için).
// node db/fr-yakalama.cjs [sessiz saat=12] [izleme saat=48]
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const SESSIZ = Number(process.argv[2] || 12) * 3600e3, IZLE = Number(process.argv[3] || 48) * 3600e3, M5 = 300e3, H = 3600e3;
const tr = t => new Date(t + 3 * H).toISOString().slice(5, 16).replace('T', ' ');
(async () => {
  const rows = (await pool.query(`SELECT symbol, extract(epoch FROM t)*1000 AS t, price, strategy, (fields->>'fundingRate')::float8 AS fr, (fields->>'seriN')::int AS seri
    FROM signals WHERE bot='fr' AND dir='up' AND price > 0 ORDER BY symbol, t`)).rows.map(r => ({ ...r, t: Number(r.t) }));
  const scan = (await pool.query(`SELECT symbol, extract(epoch FROM t)*1000 AS t, (fields->>'fundingRate')::float8 AS fr FROM signals WHERE bot='fr' AND strategy='FR scan' ORDER BY symbol, t`)).rows;
  const scanBy = new Map(); for (const s of scan) { if (!scanBy.has(s.symbol)) scanBy.set(s.symbol, []); scanBy.get(s.symbol).push({ t: Number(s.t), fr: s.fr }); }
  const by = new Map(); for (const r of rows) { if (!by.has(r.symbol)) by.set(r.symbol, []); by.get(r.symbol).push(r); }
  const now = Date.now(), out = [];
  for (const [sym, list] of by) {
    const K = (await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, h, l, c FROM klines_5m WHERE symbol=$1 AND t >= $2 ORDER BY t`, [sym, new Date(list[0].t - 25 * H)])).rows.map(k => ({ t: Number(k.t), h: k.h, l: k.l, c: k.c }));
    if (!K.length) continue; const last = K[K.length - 1];
    let prevT = -Infinity;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]; const isStart = e.t - prevT >= SESSIZ; prevT = e.t; if (!isStart) continue;
      const end = Math.min(e.t + IZLE, last.t + M5), p = e.price, b0 = Math.floor(e.t / M5) * M5;
      let hi = -Infinity, hiT = null, lo = Infinity, loT = null, loBefore = Infinity, c4 = null, c24 = null;
      for (const k of K) { if (k.t <= b0 || k.t >= end) continue; if (k.l < lo) { lo = k.l; loT = k.t; } if (k.h > hi) { hi = k.h; hiT = k.t; loBefore = lo; } if (k.t === b0 + 4 * H) c4 = k.c; if (k.t === b0 + 24 * H) c24 = k.c; }
      if (hiT == null) continue;
      const greens = list.filter(x => x.t >= e.t && x.t < e.t + IZLE && (x.t - e.t < IZLE)), frs = [...greens.map(x => x.fr), ...(scanBy.get(sym) || []).filter(x => x.t >= e.t && x.t < end).map(x => x.fr)].filter(Number.isFinite);
      const k24 = K.find(k => k.t === b0 - 24 * H), pc = v => +((v / p - 1) * 100).toFixed(2);
      out.push({ sym, t: e.t, yakalama: tr(e.t), fiyat: p, tur: e.strategy === 'Funding changed from + to -' ? 'eksiye döndü' : 'derinleşti', fr: +(+e.fr).toFixed(4), frDip: frs.length ? +Math.min(...frs).toFixed(4) : null, yesil: greens.length,
        once24: k24 ? pc(p * p / k24.c) * 0 + +((p / k24.c - 1) * 100).toFixed(1) : null,
        tepe: hi, tepePct: pc(hi), tepeZaman: tr(hiT), tepeSaat: +((hiT - e.t) / H).toFixed(1), tepeOncesiDip: pc(loBefore === Infinity ? p : Math.min(loBefore, p)),
        dip: lo, dipPct: pc(lo), dipZaman: tr(loT), s4: c4 ? pc(c4) : null, s24: c24 ? pc(c24) : null, simdi: last.c, simdiPct: pc(last.c), izlenen: +((end - e.t) / H).toFixed(0) });
    }
  }
  out.sort((a, b) => b.tepePct - a.tepePct);
  const dir = path.join(__dirname, '..', 'data', 'rapor'); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'fr-yakalama.json'), JSON.stringify({ at: new Date().toISOString(), sessizSaat: SESSIZ / H, izlemeSaat: IZLE / H, n: out.length, liste: out }));
  await pool.query(`CREATE TABLE IF NOT EXISTS fr_yakalama (symbol text, t timestamptz, fiyat float8, tur text, fr float8, fr_dip float8, yesil int, once24 float8, tepe float8, tepe_pct float8, tepe_t text, tepe_saat float8, tepe_oncesi_dip float8, dip_pct float8, dip_t text, s4 float8, s24 float8, simdi_pct float8, PRIMARY KEY (symbol, t))`);
  await pool.query('TRUNCATE fr_yakalama');
  for (let i = 0; i < out.length; i += 500) { const part = out.slice(i, i + 500), vals = [], ph = part.map((o, n) => { vals.push(o.sym, new Date(o.t), o.fiyat, o.tur, o.fr, o.frDip, o.yesil, o.once24, o.tepe, o.tepePct, o.tepeZaman, o.tepeSaat, o.tepeOncesiDip, o.dipPct, o.dipZaman, o.s4, o.s24, o.simdiPct); const b = n * 18; return '(' + Array.from({ length: 18 }, (_, j) => '$' + (b + j + 1)).join(',') + ')'; }); await pool.query(`INSERT INTO fr_yakalama VALUES ${ph.join(',')} ON CONFLICT DO NOTHING`, vals); }
  const first = Math.min(...out.map(o => o.t)), lastT = Math.max(...out.map(o => o.t));
  console.log(`FR yakalamaları: ${out.length} | coin: ${new Set(out.map(o => o.sym)).size} | ${tr(first)} → ${tr(lastT)} (TR) | sessizlik ${SESSIZ / H} sa, izleme ${IZLE / H} sa`);
  const show = (title, list, n = 25) => { console.log('\n### ' + title); console.table(list.slice(0, n).map(o => ({ coin: o.sym.replace('USDT', ''), yakalama: o.yakalama, fiyat: o.fiyat, tür: o.tur, FR: o.fr, 'FR dip': o.frDip, yeşil: o.yesil, 'önceki 24s%': o.once24, 'tepe%': o.tepePct, 'tepe fiyat': +o.tepe.toPrecision(5), 'tepe zamanı': o.tepeZaman, 'kaç sa': o.tepeSaat, 'tepeden önce dip%': o.tepeOncesiDip, '4sa%': o.s4, '24sa%': o.s24, 'şimdi%': o.simdiPct }))); };
  show('En çok yükselen 30 yakalama (tepeye göre)', out, 30);
  show('En kötü 15 yakalama (tepe en düşük / dip en derin)', [...out].sort((a, b) => a.dipPct - b.dipPct), 15);
  const st = (name, a) => { const n = a.length || 1, c = f => Math.round(100 * a.filter(f).length / n), med = f => { const v = a.map(f).filter(Number.isFinite).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : NaN; };
    return { grup: name, n: a.length, 'tepe ≥%5': c(o => o.tepePct >= 5), 'tepe ≥%10': c(o => o.tepePct >= 10), 'tepe ≥%20': c(o => o.tepePct >= 20), 'tepe ≥%50': c(o => o.tepePct >= 50), 'medyan tepe%': med(o => o.tepePct), 'medyan dip%': med(o => o.dipPct), 'tepeden önce ≤−%5': c(o => o.tepeOncesiDip <= -5), 'medyan tepe süresi sa': med(o => o.tepeSaat), '24sa sonra artıda%': Math.round(100 * a.filter(o => o.s24 > 0).length / (a.filter(o => o.s24 != null).length || 1)), 'medyan 24sa%': med(o => o.s24) }; };
  console.log('\n### Özet (yakalamadan sonraki ' + IZLE / H + ' saat)');
  const G = [['Hepsi', o => true], ['tür: eksiye döndü', o => o.tur === 'eksiye döndü'], ['tür: derinleşti', o => o.tur === 'derinleşti'], ['FR dibi ≤ −0,10', o => o.frDip <= -0.1], ['FR dibi ≤ −0,50', o => o.frDip <= -0.5], ['FR dibi ≤ −1,00', o => o.frDip <= -1], ['yeşil ≥ 5', o => o.yesil >= 5], ['yeşil ≥ 20', o => o.yesil >= 20], ['önceki 24s ≤ −%10', o => o.once24 != null && o.once24 <= -10], ['önceki 24s −10…+10', o => o.once24 != null && o.once24 > -10 && o.once24 < 10], ['önceki 24s ≥ +%10', o => o.once24 != null && o.once24 >= 10]];
  console.table(Object.fromEntries(G.map(([n, f]) => { const { grup, ...x } = st(n, out.filter(f)); return [grup, x]; })));
  await pool.end();
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
