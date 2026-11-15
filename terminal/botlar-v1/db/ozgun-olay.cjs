'use strict';
// Araştırma (salt okunur): özgün sinyal botu için aday olayları ve sonuçlarını dosyaya döker.
// Çıktı: data\arastirma\ozgun-olay.jsonl  (her satır = bir 5 dk mumunun kapanışındaki aday giriş)
// Kullanım: node db/ozgun-olay.cjs
// Bakış hatası (lookahead) önlemleri: giriş = mumun KAPANIŞI; OI = mumun AÇILIŞ anındaki değer (≥ 5 dk eski);
// long/short = girişten en az 15 dk önce başlamış dönem. Sonuç yolu yalnız sonraki mumlardan.
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const M5 = 300e3, H = 3600e3, T0 = Date.parse('2026-10-13T06:00:00Z'), HOR = 576;
const UP = [0.5, 1, 1.5, 2, 3, 4, 5, 7, 10, 15, 20], DN = [1, 2, 3, 4, 5, 6, 8, 9.5, 19], CL = [12, 24, 48, 96, 144, 288, 576];
const OUT = path.join(__dirname, '..', 'data', 'arastirma'); fs.mkdirSync(OUT, { recursive: true });
const out = fs.createWriteStream(path.join(OUT, 'ozgun-olay.jsonl'));
const r2 = v => v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100;
const hash = s => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
async function klines(sym) {
  return (await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, o, h, l, c, qv FROM klines_5m WHERE symbol=$1 AND t >= $2 ORDER BY t`, [sym, new Date(T0 - 8 * 24 * H)])).rows
    .map(k => ({ t: Number(k.t), o: k.o, h: k.h, l: k.l, c: k.c, q: k.qv }));
}
(async () => {
  const BT = await klines('BTCUSDT'), BI = new Map(BT.map((k, i) => [k.t, i]));
  const btc = (t, n) => { const i = BI.get(t); return i == null || i < n ? null : (BT[i].c / BT[i - n].c - 1) * 100; };
  const syms = (await pool.query(`SELECT DISTINCT symbol FROM oi_5m ORDER BY 1`)).rows.map(r => r.symbol);
  let rows = 0, done = 0; const cnt = {};
  for (const sym of syms) {
    const K = await klines(sym); done++;
    if (K.length < 1200) continue;
    const OI = new Map((await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, oi FROM oi_5m WHERE symbol=$1`, [sym])).rows.map(r => [Number(r.t), r.oi]));
    if (OI.size < 1000) continue;
    const LS = (await pool.query(`SELECT extract(epoch FROM l.t)*1000 AS t, l.top_long, l.global_long, l.taker_buy, l.taker_sell, p.top_pos_long FROM ls_15m l LEFT JOIN lsp_15m p ON p.symbol=l.symbol AND p.t=l.t WHERE l.symbol=$1 ORDER BY l.t`, [sym])).rows.map(r => ({ ...r, t: Number(r.t) }));
    const lsAt = t => { let lo = 0, hi = LS.length - 1, a = null; while (lo <= hi) { const m = (lo + hi) >> 1; if (LS[m].t <= t) { a = LS[m]; lo = m + 1; } else hi = m - 1; } return a && t - a.t <= 45 * 60e3 ? a : null; };
    const oiA = t => OI.get(t) ?? OI.get(t - M5) ?? null;
    const N = K.length, P = new Float64Array(N + 1); for (let i = 0; i < N; i++) P[i + 1] = P[i] + (K[i].q || 0);
    const sum = (a, b) => P[b + 1] - P[a];                      // a..b dahil
    const hh = hash(sym);
    for (let i = 300; i < N; i++) {
      const k = K[i]; if (k.t < T0) continue;
      if (k.t - K[i - 300].t !== 300 * M5) continue;            // son 25 saatte boşluk var
      const c = k.c, ret = n => (c / K[i - n].c - 1) * 100;
      const o0 = oiA(k.t); const oic = n => { const a = oiA(k.t - n * M5); return o0 > 0 && a > 0 ? (o0 / a - 1) * 100 : null; };
      const r1 = ret(12), r4 = ret(48), o1 = oic(12), o4 = oic(48);
      let hi1 = 0; for (let j = i - 12; j < i; j++) hi1 = Math.max(hi1, K[j].h);
      let hi6 = 0, lo6 = Infinity; for (let j = i - 72; j < i; j++) { hi6 = Math.max(hi6, K[j].h); lo6 = Math.min(lo6, K[j].l); }
      const rng6 = (hi6 / lo6 - 1) * 100, bv = k.q / (sum(i - 288, i - 1) / 288 || NaN);
      const te = k.t + M5, ls = lsAt(te - 15 * 60e3), ls4 = ls ? lsAt(ls.t - 4 * H) : null;
      const dG = ls && ls4 && ls.global_long != null && ls4.global_long != null ? (ls.global_long - ls4.global_long) * 100 : null;
      let tag = '';
      if (r1 <= -2.5) tag += 'A';                          // silkeleme: fiyat ve OI birlikte düşmüş
      if (r4 <= -2 && o4 != null && o4 >= 3 && c > hi1) tag += 'B';                  // tuzak: düşüşte OI artmış, fiyat 1 sa tepesini geri almış
      if (rng6 <= 5 && c > hi6 && bv >= 2.5) tag += 'C';                             // yay: dar bant + hacimli kırılım
      if (dG != null && dG <= -3 && r4 >= 0 && (te % (15 * 60e3)) === 0) tag += 'D'; // kalabalık long'dan kaçmış, fiyat düşmemiş
      if ((i + hh) % 150 === 0) tag += 'R';                                          // rastgele kıyas tabanı
      const tagS = (r4 >= 8 && o1 != null && o1 <= -1.5 ? 'E' : '') + (r1 >= 4 ? 'F' : '');   // F: saatlik sert yükseliş (short adayı)                   // yorulma (short): pump sonrası OI boşalıyor
      if (!tag && !tagS) continue;
      let hi24 = 0, lo24 = Infinity; for (let j = i - 287; j <= i; j++) { hi24 = Math.max(hi24, K[j].h); lo24 = Math.min(lo24, K[j].l); }
      const v1 = sum(i - 11, i), vb = sum(i - 299, i - 12) / 24;
      let hi7 = null, lo7 = null, r72 = null;
      if (i >= 2016 && k.t - K[i - 2016].t === 2016 * M5) { hi7 = 0; lo7 = Infinity; for (let j = i - 2016; j <= i; j++) { if (K[j].h > hi7) hi7 = K[j].h; if (K[j].l < lo7) lo7 = K[j].l; } }
      if (i >= 864 && k.t - K[i - 864].t === 864 * M5) r72 = ret(864);
      let lo24p = Infinity; for (let j = i - 288; j < i; j++) lo24p = Math.min(lo24p, K[j].l);
      const f = {
        r15: r2(ret(3)), r1: r2(r1), r4: r2(r4), r24: r2(ret(288)), o15: r2(oic(3)), o1: r2(o1), o4: r2(o4), o24: r2(oic(288)),
        v1: r2(v1 / vb), bv: r2(bv), q24: Math.round(sum(i - 287, i) / 1e4) / 100, rng6: r2(rng6), d6: r2((c / hi6 - 1) * 100),
        pos24: r2((c - lo24) / (hi24 - lo24 || NaN)), rng24: r2((hi24 / lo24 - 1) * 100),
        dd7: hi7 ? r2((c / hi7 - 1) * 100) : null, up7: lo7 ? r2((c / lo7 - 1) * 100) : null, r72: r2(r72), h1d: r2((c / hi1 - 1) * 100), nl: k.l < lo24p ? 1 : 0,
        uw: r2((k.h / Math.max(k.o, k.c) - 1) * 100), brng: r2((k.h / k.l - 1) * 100),
        gr: k.c > k.o ? 1 : 0, ph: c > K[i - 1].h ? 1 : 0, body: r2((k.c / k.o - 1) * 100), wick: r2((Math.min(k.o, k.c) / k.l - 1) * 100),
        gl: ls ? r2(ls.global_long * 100) : null, tl: ls ? r2(ls.top_long * 100) : null, tp: ls && ls.top_pos_long != null ? r2(ls.top_pos_long * 100) : null,
        dgl: r2(dG), dtp: ls && ls4 && ls.top_pos_long != null && ls4.top_pos_long != null ? r2((ls.top_pos_long - ls4.top_pos_long) * 100) : null,
        tk: ls && ls.taker_buy + ls.taker_sell > 0 ? r2(ls.taker_buy / (ls.taker_buy + ls.taker_sell) * 100) : null,
        b1: r2(btc(k.t, 12)), b4: r2(btc(k.t, 48)), b24: r2(btc(k.t, 288)),
      };
      for (const [tg, d] of [[tag, 1], [tagS, -1]]) {
        if (!tg) continue;
        const u = UP.map(() => 0), w = DN.map(() => 0), cl = []; let mfe = 0, mae = 0, n = 0;
        for (let j = i + 1; j < N && j <= i + HOR; j++) {
          if (K[j].t - k.t !== (j - i) * M5) break; n = j - i;
          const up = d === 1 ? (K[j].h / c - 1) * 100 : (1 - K[j].l / c) * 100, dn = d === 1 ? (1 - K[j].l / c) * 100 : (K[j].h / c - 1) * 100;
          if (up > mfe) mfe = up; if (dn > mae) mae = dn;
          for (let x = 0; x < UP.length; x++) if (!u[x] && up >= UP[x]) u[x] = n;
          for (let x = 0; x < DN.length; x++) if (!w[x] && dn >= DN[x]) w[x] = n;
          if (CL.includes(n)) cl.push(r2((K[j].c / c - 1) * 100 * d));
        }
        out.write(JSON.stringify({ s: sym, t: te, g: tg, d, p: c, f, u, w, cl, mfe: r2(mfe), mae: r2(mae), n }) + '\n'); rows++;
        for (const ch of tg) cnt[ch] = (cnt[ch] || 0) + 1;
      }
    }
    if (done % 100 === 0) console.log(new Date().toISOString().slice(11, 19), done, '/', syms.length, 'satır', rows);
  }
  await new Promise(r => out.end(r));
  console.log('bitti: satır', rows, JSON.stringify(cnt));
  await pool.end();
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
