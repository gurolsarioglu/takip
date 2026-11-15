'use strict';
// Araştırma (salt okunur): Visivero'nun ORİJİNAL Hammer ailesi + DIV mesajlarının (vv_messages) sonuçları, klines_5m ile.
// Soru: bu sinyaller "yön tahmini" olarak mı, "burada hareket var" uyarısı olarak mı işe yarıyor?
// Her sinyal için: sinyal yönünde 15dk/1sa/4sa getiri, 1 saatte lehte en iyi (MFE) / aleyhte en kötü (MAE),
// ±%1'e hangisi önce değdi, 1 saatlik toplam oynama. KONTROL: aynı coin, 6 saat ÖNCEKİ an (aynı yön varsayımıyla).
// node db/karne-vv.cjs [başlangıç ISO] [bitiş ISO]
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const FROM = process.argv[2] || '2026-09-15T08:00:00Z', TO = process.argv[3] || '2026-10-30T15:00:00Z', M5 = 300e3;
const BOTS = ['hammer', 'hammer-pro', 'hammer-pro-plus', '1d-hammer-pro', 'div'];
function measure(K, t, price, sg) {              // K: Map(t→bar); t: an; price: giriş
  const b0 = Math.floor(t / M5) * M5, at = n => K.get(b0 + n * M5);
  const c15 = at(3), c60 = at(12), c240 = at(48); if (!c60 || !c240 || !c15) return null;
  let hi = -Infinity, lo = Infinity, first = 0;
  for (let n = 1; n <= 12; n++) { const b = at(n); if (!b) return null; hi = Math.max(hi, b.h); lo = Math.min(lo, b.l);
    if (!first) { const up = b.h >= price * 1.01, dn = b.l <= price * 0.99; if (up && dn) first = 2; else if (up) first = sg; else if (dn) first = -sg; } }
  const r = c => sg * (c.c / price - 1) * 100;
  return { r15: r(c15), r60: r(c60), r240: r(c240), mfe: sg > 0 ? (hi / price - 1) * 100 : (1 - lo / price) * 100, mae: sg > 0 ? (lo / price - 1) * 100 : (1 - hi / price) * 100,
    range: (hi - lo) / price * 100, first };     // first: 1 lehte %1 önce, -1 aleyhte %1 önce, 2 aynı mumda ikisi, 0 hiçbiri
}
(async () => {
  const rows = (await pool.query(`SELECT bot, symbol, created_at, message FROM vv_messages WHERE bot = ANY($1) AND created_at >= $2 AND created_at < $3 AND symbol IS NOT NULL ORDER BY symbol, created_at`, [BOTS, FROM, TO])).rows;
  const sigs = [], lastKey = new Map();
  for (const r of rows) {
    const m = r.message, sg = m.startsWith('🟢') ? 1 : m.startsWith('🔴') ? -1 : 0; if (!sg) continue;
    const price = Number((m.match(/Current Price:\s*([\d.]+)/) || [])[1]); if (!(price > 0)) continue;
    const strat = (m.match(/Strategy: ([^\n]*)/) || [])[1] || '-', t = r.created_at.getTime();
    const key = [r.bot, r.symbol, sg, strat].join('|'), pt = lastKey.get(key); lastKey.set(key, t); if (pt && t - pt <= 30 * 60e3) continue;
    const l1 = m.split('\n')[0], stars = (l1.match(/⭐/g) || []).length;
    const rs = m.match(/RSI: <b>([^<]*)/), tf0 = rs && rs[1].match(/(\w+)\.(\d+)/), rsi0 = tf0 ? +tf0[2] : null;
    const rsi1h = rs && (rs[1].match(/1h\.(\d+)/) || [])[1];
    sigs.push({ bot: r.bot, symbol: r.symbol, t, sg, strat, stars, price, rsi0, rsi1h: rsi1h ? +rsi1h : null, btcVol: /Volatilite/.test(m), wk: new Date(t).toISOString().slice(5, 10) });
  }
  console.log('mesaj:', rows.length, '→ tekrarsız sinyal:', sigs.length, '| dönem', FROM.slice(0, 10), '→', TO.slice(0, 10));
  const bySym = new Map(); for (const s of sigs) { if (!bySym.has(s.symbol)) bySym.set(s.symbol, []); bySym.get(s.symbol).push(s); }
  const out = []; let noK = 0;
  for (const [sym, list] of bySym) {
    const k = (await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, h, l, c FROM klines_5m WHERE symbol=$1 AND t >= $2 AND t <= $3`, [sym, new Date(list[0].t - 7 * 3600e3), new Date(list[list.length - 1].t + 5 * 3600e3)])).rows;
    const K = new Map(k.map(x => [Number(x.t), x]));
    for (const s of list) {
      const a = measure(K, s.t, s.price, s.sg); if (!a) { noK++; continue; }
      const tc = s.t - 6 * 3600e3, cb = K.get(Math.floor(tc / M5) * M5), c = cb ? measure(K, tc, cb.c, s.sg) : null;
      out.push({ ...s, a, c });
    }
  }
  console.log('ölçülen:', out.length, 'mum eksik:', noK);
  const avg = (a, f) => { const v = a.map(f).filter(Number.isFinite); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : NaN; };
  const pc = (a, f) => Math.round(100 * a.filter(f).length / (a.length || 1));
  const f2 = x => Number.isFinite(x) ? (x > 0 ? '+' : '') + x.toFixed(2) : '-';
  const row = (rs, key = 'a') => { const v = rs.filter(r => r[key]).map(r => r[key]); return { n: v.length, o15: f2(avg(v, x => x.r15)), o60: f2(avg(v, x => x.r60)), o240: f2(avg(v, x => x.r240)), 'kaz60%': pc(v, x => x.r60 > 0),
    mfe: f2(avg(v, x => x.mfe)), mae: f2(avg(v, x => x.mae)), 'lehte≥1%': pc(v, x => x.mfe >= 1), 'lehte≥2%': pc(v, x => x.mfe >= 2), 'önce lehte%': pc(v, x => x.first === 1), 'önce aleyhte%': pc(v, x => x.first === -1), 'oynama≥2%': pc(v, x => x.range >= 2), oynama: avg(v, x => x.range).toFixed(2) }; };
  const table = (title, groups) => { console.log('\n### ' + title); const t = {}; for (const [g, rs] of groups) if (rs.length >= 30) { t[g] = row(rs); t[g + '  [kontrol −6sa]'] = row(rs, 'c'); } console.table(t); };
  const dir = s => s.sg > 0 ? '🟢' : '🔴', G = (fn) => { const m = new Map(); for (const r of out) { const k = fn(r); if (k == null) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(r); } return [...m.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1); };
  table('Bot + strateji + yön (sinyal ve aynı coinin 6 saat önceki kontrol anı)', G(r => `${r.bot} ${r.strat} ${dir(r)}`));
  table('Hammer Pro: yıldıza göre', G(r => r.bot === 'hammer-pro' ? `${r.strat} ${dir(r)} ${'⭐'.repeat(r.stars) || 'yıldızsız'}` : null));
  table('Hammer Pro: ilk RSI (1m) ucuna göre', G(r => r.bot === 'hammer-pro' && r.rsi0 != null ? `${r.strat} ${dir(r)} RSI1m ${r.rsi0 <= 20 ? '≤20' : r.rsi0 <= 30 ? '21-30' : r.rsi0 >= 80 ? '≥80' : r.rsi0 >= 70 ? '70-79' : 'orta'}` : null));
  table('DIV: 1h RSI ucuna göre', G(r => r.bot === 'div' && r.rsi1h != null ? `${dir(r)} RSI1h ${r.rsi1h <= 25 ? '≤25' : r.rsi1h <= 35 ? '26-35' : r.rsi1h >= 75 ? '≥75' : r.rsi1h >= 65 ? '65-74' : 'orta'}` : null));
  // haftalık tutarlılık
  const wk = t => { const d = new Date(t), s = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7))); return s.toISOString().slice(5, 10); };
  console.log('\n### Haftalara göre (hafta başı) — 15 dk ort. / 1 sa kazanan % / lehte≥1% / sinyal');
  const W = {}; for (const [g, rs] of G(r => (r.bot === 'hammer-pro' || r.bot === 'div' || r.bot === 'hammer-pro-plus') ? `${r.bot} ${r.strat} ${dir(r)}` : null)) { if (rs.length < 100) continue; W[g] = {}; const m = new Map(); for (const r of rs) { const k = wk(r.t); if (!m.has(k)) m.set(k, []); m.get(k).push(r); } for (const [k, v] of [...m.entries()].sort()) { const a = v.map(x => x.a); W[g][k] = `${f2(avg(a, x => x.r15))} / ${pc(a, x => x.r60 > 0)} / ${pc(a, x => x.mfe >= 1)} / ${a.length}`; } }
  console.table(W);
  const days = (Date.parse(TO) - Date.parse(FROM)) / 864e5;
  console.log('\n### Günlük ortalama tekrarsız sinyal'); console.table(Object.fromEntries(G(r => r.bot).map(([b, rs]) => [b, { gunluk: Math.round(rs.length / days), coin: new Set(rs.map(r => r.symbol)).size }])));
  await pool.end();
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
