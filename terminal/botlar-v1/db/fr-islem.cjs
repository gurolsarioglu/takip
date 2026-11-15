'use strict';
// Rapor: FR yakalamalarında "hedefe gelince çık, sonrasına bakma, aynı coine tekrar girme" bakışıyla işlem benzetimi (kullanıcının tarzı).
// Giriş (LONG): seçilen tetik anındaki sinyal fiyatı. Çıkış: hedefe (TP) ilk dokunuş → işlem biter. Stop YOK: fiyat kaldıraç kadar ters
// giderse tasfiye (10x ≈ −%10, 5x ≈ −%19; ROE −%100). SURE saat içinde ikisi de olmazsa o anki fiyattan kapanır.
// Aynı 5 dk mumunda hem hedef hem tasfiye görülürse tasfiye sayılır (kötümser). Komisyon: gidiş-dönüş fiyatın %0,1'i × kaldıraç.
// Eksi funding'de long'lar funding ALIR; bu gelir hesaba katılmadı (sonuçlar bu yönden temkinli).
// Tetikler: ilk 🟢 · funding ilk kez ≤ −0,10 / −0,30 / −0,50 / −1,00 gördüğü an (yeşil ya da tarama mesajı) · serinin 3. yeşili.
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const SESSIZ = 12 * 3600e3, SURE = Number(process.argv[2] || 48) * 3600e3, M5 = 300e3, H = 3600e3, FEE = 0.1;
const tr = t => new Date(t + 3 * H).toISOString().slice(5, 16).replace('T', ' ');
function trade(K, i0, p, L, tpPct) {           // K: sıralı mumlar, i0: girişten sonraki ilk mumun indeksi
  const liq = p * (1 - (L === 10 ? 0.095 : 0.19)), tp = p * (1 + tpPct / 100), tEnd = K[i0] ? K[i0].t + SURE : 0; let worst = 0;
  for (let i = i0; i < K.length && K[i].t < tEnd; i++) { const k = K[i]; worst = Math.min(worst, (k.l / p - 1) * 100);
    if (k.l <= liq) return { k: 'tasfiye', roe: -100, h: (k.t - K[i0].t) / H, worst };
    if (k.h >= tp) return { k: 'hedef', roe: tpPct * L - FEE * L, h: (k.t - K[i0].t) / H, worst }; }
  const last = K[Math.min(K.length - 1, K.findLastIndex(k => k.t < tEnd))]; if (!last || last.t - K[i0].t < Math.min(SURE, 6 * H) - M5) return null;   // izleme süresi dolmamış (çok yeni)
  return { k: 'süre', roe: (last.c / p - 1) * 100 * L - FEE * L, h: (last.t - K[i0].t) / H, worst };
}
(async () => {
  const rows = (await pool.query(`SELECT symbol, extract(epoch FROM t)*1000 AS t, price, dir, strategy, (fields->>'fundingRate')::float8 AS fr FROM signals WHERE bot='fr' AND price > 0 AND (dir='up' OR strategy='FR scan') ORDER BY symbol, t`)).rows.map(r => ({ ...r, t: Number(r.t), g: r.dir === 'up' }));
  const by = new Map(); for (const r of rows) { if (!by.has(r.symbol)) by.set(r.symbol, []); by.get(r.symbol).push(r); }
  const TRIG = ['ilk yeşil', '3. yeşil', 'FR ≤ −0,10', 'FR ≤ −0,30', 'FR ≤ −0,50', 'FR ≤ −1,00'], THR = { 'FR ≤ −0,10': -0.1, 'FR ≤ −0,30': -0.3, 'FR ≤ −0,50': -0.5, 'FR ≤ −1,00': -1 };
  const TPS = [3, 5, 10, 15, 20, 30], LEVS = [10, 5], T = [];   // T: {trig, sym, t, p, fr, epi, hisse, res{L|tp}}
  for (const [sym, list] of by) {
    const K = (await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, h, l, c FROM klines_5m WHERE symbol=$1 AND t >= $2 ORDER BY t`, [sym, new Date(list[0].t - H)])).rows.map(k => ({ t: Number(k.t), h: k.h, l: k.l, c: k.c }));
    if (!K.length) continue;
    let prevG = -Infinity, epi = 0, st = null;
    for (const e of list) {
      if (e.g && e.t - prevG >= SESSIZ) { epi++; st = { n: 0, done: new Set(), minFr: 0 }; }
      if (e.g) prevG = e.t; if (!st) continue; if (e.g) st.n++;
      const fire = [];
      if (e.g && st.n === 1) fire.push('ilk yeşil'); if (e.g && st.n === 3) fire.push('3. yeşil');
      for (const [name, thr] of Object.entries(THR)) if (Number.isFinite(e.fr) && e.fr <= thr) fire.push(name);
      for (const name of fire) { if (st.done.has(name)) continue; st.done.add(name);
        const i0 = K.findIndex(k => k.t > Math.floor(e.t / M5) * M5); if (i0 < 0) continue;
        const res = {}; let ok = true; for (const L of LEVS) for (const tp of TPS) { const r = trade(K, i0, e.price, L, tp); if (!r) { ok = false; break; } res[L + '|' + tp] = r; }
        if (ok) T.push({ trig: name, sym, t: e.t, p: e.price, fr: e.fr, epi, res });
      }
    }
  }
  const firstOnly = list => { const seen = new Set(), o = []; for (const x of [...list].sort((a, b) => a.t - b.t)) { if (seen.has(x.sym)) continue; seen.add(x.sym); o.push(x); } return o; };
  const stat = (list, key) => { const v = list.map(x => x.res[key]); const n = v.length || 1, c = k => Math.round(100 * v.filter(x => x.k === k).length / n), sum = v.reduce((a, x) => a + x.roe, 0), hs = v.filter(x => x.k === 'hedef').map(x => x.h).sort((a, b) => a - b);
    return `${c('hedef')}/${c('tasfiye')}/${c('süre')} · ort ${sum / n >= 0 ? '+' : ''}${(sum / n).toFixed(0)}`; };
  console.log(`İşlem benzetimi | FR sinyalleri ${tr(Math.min(...rows.map(r => r.t)))} → ${tr(Math.max(...rows.map(r => r.t)))} | süre sınırı ${SURE / H} sa | hücre: hedefe% / tasfiye% / süre doldu% · işlem başı ortalama ROE%`);
  for (const L of LEVS) for (const mode of ['coin başına TEK işlem (ilk fırsat, sonra o coine girilmez)', 'her yakalamada işlem']) {
    console.log(`\n### ${L}x — ${mode}`); const tbl = {};
    for (const tg of TRIG) { let l = T.filter(x => x.trig === tg); if (mode.startsWith('coin')) l = firstOnly(l); if (l.length < 8) continue; const row = { işlem: l.length }; for (const tp of TPS) row[`fiyat +%${tp} (ROE ${tp * L})`] = stat(l, L + '|' + tp); tbl[tg] = row; }
    console.table(tbl);
  }
  // toplam kasa etkisi: sabit tutar (her işlem 1 birim teminat), coin başına tek işlem, 10x
  console.log('\n### 10x, coin başına tek işlem — 100 işlemde toplam sonuç (her işleme aynı teminat; +100 = bir teminat kadar kâr)');
  const tb2 = {}; for (const tg of TRIG) { const l = firstOnly(T.filter(x => x.trig === tg)); if (l.length < 8) continue; const row = { işlem: l.length }; for (const tp of TPS) { const v = l.map(x => x.res['10|' + tp]); row[`+%${tp}`] = Math.round(v.reduce((a, x) => a + x.roe, 0) / v.length); } tb2[tg] = row; } console.table(tb2);
  // en iyi tetik için işlem listesi
  const pick = firstOnly(T.filter(x => x.trig === 'FR ≤ −0,30'));
  console.log('\n### Örnek liste: tetik "FR ≤ −0,30", 10x, hedef fiyat +%10 (coin başına tek işlem)');
  console.table(pick.map(x => { const r = x.res['10|10']; return { coin: x.sym.replace('USDT', ''), giriş: tr(x.t), fiyat: x.p, FR: +x.fr.toFixed(3), sonuç: r.k, 'ROE%': Math.round(r.roe), 'kaç saat': +r.h.toFixed(1), 'yolda en kötü%': +r.worst.toFixed(1) }; }));
  const out = T.map(x => ({ trig: x.trig, sym: x.sym, t: x.t, p: x.p, fr: x.fr, res: Object.fromEntries(Object.entries(x.res).map(([k, r]) => [k, [r.k, Math.round(r.roe), +r.h.toFixed(1), +r.worst.toFixed(1)]])) }));
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'rapor', 'fr-islem.json'), JSON.stringify(out));
  await pool.end();
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
