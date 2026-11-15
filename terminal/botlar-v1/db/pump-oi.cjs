'use strict';
// Araştırma (salt okunur): büyük yükselişlerden ÖNCE açık pozisyon (OI) ve long/short oranları ne yapıyordu?
// Kaynak: klines_5m, oi_5m, ls_15m, lsp_15m (yalnız ~30 gün OI/oran verisi var). Çıktı: data\arastirma\pump-oi.csv
// Her satır = bir coin, bir saat kapanışı. Sonraki 48 saatte +%30 görenlerin hepsi (w=1) + diğerlerinin 5'te biri (w=5).
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const HR = 3600e3, M5 = 300e3, TA = Date.parse('2026-10-05T00:00:00Z'), T1 = Date.parse('2026-10-13T12:00:00Z'), NOW = Math.floor(Date.now() / HR) * HR, NH = (NOW - TA) / HR;
const r2 = v => Number.isFinite(v) ? Math.round(v * 100) / 100 : '', hash = s => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
(async () => {
  const syms = (await pool.query(`SELECT DISTINCT symbol FROM oi_5m ORDER BY 1`)).rows.map(r => r.symbol);
  const out = fs.createWriteStream(path.join(__dirname, '..', 'data', 'arastirma', 'pump-oi.csv'));
  out.write('s,t,w,r1,r4,r24,r72,mx48,sp48,hsp,rt48,rng24,up7,v24,vr,oi4,oi8,oi16,oi24,oi48,oi72,oiusd,gl,tl,tp,dgl24,dtl24,dtp24,mfe,tmfe,maeb,mae,c24,c48,u20,u50,u100,d10,d20\n');
  let rows = 0, pos = 0, done = 0;
  for (const sym of syms) {
    const O = new Float64Array(NH).fill(NaN), H = new Float64Array(NH), L = new Float64Array(NH).fill(Infinity), C = new Float64Array(NH).fill(NaN), Q = new Float64Array(NH), CN = new Uint8Array(NH);
    for (const k of (await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, o, h, l, c, qv FROM klines_5m WHERE symbol=$1 AND t >= $2 ORDER BY t`, [sym, new Date(TA)])).rows) {
      const t = Number(k.t), h = Math.floor((t - TA) / HR); if (h < 0 || h >= NH) continue;
      if (!CN[h]) O[h] = k.o; H[h] = Math.max(H[h], k.h); L[h] = Math.min(L[h], k.l); C[h] = k.c; Q[h] += k.qv || 0; CN[h]++;
    }
    const OI = new Float64Array(NH + 1).fill(NaN), OU = new Float64Array(NH + 1).fill(NaN);   // OI[h] = h. saatin KAPANIŞINDAN en çok 10 dk önceki değer
    for (const r of (await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, oi, oi_usd FROM oi_5m WHERE symbol=$1 ORDER BY t`, [sym])).rows) {
      const t = Number(r.t), m = (t - TA) % HR; if (m < HR - 2 * M5 - 1) continue; const h = Math.floor((t - TA) / HR); if (h >= 0 && h < NH) { OI[h] = r.oi; OU[h] = r.oi_usd; }
    }
    const G = new Float64Array(NH).fill(NaN), TL = new Float64Array(NH).fill(NaN), TP = new Float64Array(NH).fill(NaN);   // saat kapanışından ≥ 15 dk önce başlamış son dönem
    for (const r of (await pool.query(`SELECT extract(epoch FROM l.t)*1000 AS t, l.top_long, l.global_long, p.top_pos_long FROM ls_15m l LEFT JOIN lsp_15m p ON p.symbol=l.symbol AND p.t=l.t WHERE l.symbol=$1 ORDER BY l.t`, [sym])).rows) {
      const t = Number(r.t), h = Math.floor((t + 15 * 60e3 - TA) / HR); if ((t - TA) % HR !== HR - 30 * 60e3) continue; if (h >= 0 && h < NH) { G[h] = r.global_long * 100; TL[h] = r.top_long * 100; TP[h] = r.top_pos_long != null ? r.top_pos_long * 100 : NaN; }
    }
    done++; const hh = hash(sym), ok = h => CN[h] >= 11;
    for (let h = Math.max(168, (T1 - TA) / HR); h + 48 < NH; h++) {
      if (!ok(h) || !ok(h - 24) || !ok(h - 72)) continue; let bad = false; for (let k = 1; k <= 48; k++) if (!ok(h + k)) { bad = true; break; } if (bad) continue;
      const c = C[h]; let mfe = 0, tmfe = 0, mae = 0, maeb = 0; const u = [0, 0, 0], dn = [0, 0];
      for (let k = 1; k <= 48; k++) { const up = (H[h + k] / c - 1) * 100, d = (1 - L[h + k] / c) * 100; if (d > mae) mae = d; if (up > mfe) { mfe = up; tmfe = k; maeb = mae; } [20, 50, 100].forEach((x, j) => { if (!u[j] && up >= x) u[j] = k; }); [10, 20].forEach((x, j) => { if (!dn[j] && d >= x) dn[j] = k; }); }
      const isPos = mfe >= 30; if (!isPos && (h + hh) % 5 !== 0) continue;
      const ret = n => ok(h - n) ? (c / C[h - n] - 1) * 100 : NaN, oic = n => OI[h] > 0 && OI[h - n] > 0 ? (OI[h] / OI[h - n] - 1) * 100 : NaN;
      let mx48 = 0, sp48 = 0, hsp = '', hi48 = 0, hi24 = 0, lo24 = Infinity, lo7 = Infinity, v24 = 0, vp = 0;
      for (let k = 0; k < 168; k++) { const j = h - k; if (!ok(j)) continue; if (k < 48) { const s = (H[j] / O[j] - 1) * 100; if (s > mx48) { mx48 = s; hsp = k; } if (s >= 8) sp48++; hi48 = Math.max(hi48, H[j]); } if (k < 24) { hi24 = Math.max(hi24, H[j]); lo24 = Math.min(lo24, L[j]); v24 += Q[j]; } else vp += Q[j]; lo7 = Math.min(lo7, L[j]); }
      out.write([sym, TA + (h + 1) * HR, isPos ? 1 : 5, r2(ret(1)), r2(ret(4)), r2(ret(24)), r2(ret(72)), r2(mx48), sp48, hsp, r2((c / hi48 - 1) * 100), r2((hi24 / lo24 - 1) * 100), r2((c / lo7 - 1) * 100), r2(v24 / 1e6), r2(v24 / (vp / 6 || NaN)),
        r2(oic(4)), r2(oic(8)), r2(oic(16)), r2(oic(24)), r2(oic(48)), r2(oic(72)), r2(OU[h] / 1e6), r2(G[h]), r2(TL[h]), r2(TP[h]), r2(G[h] - G[h - 24]), r2(TL[h] - TL[h - 24]), r2(TP[h] - TP[h - 24]),
        r2(mfe), tmfe, r2(maeb), r2(mae), r2((C[h + 24] / c - 1) * 100), r2((C[h + 48] / c - 1) * 100), ...u, ...dn].join(',') + '\n'); rows++; if (isPos) pos++;
    }
    if (done % 200 === 0) console.log(done, '/', syms.length, 'satır', rows);
  }
  await new Promise(r => out.end(r)); console.log('bitti: satır', rows, '| +%30 gören saat', pos); await pool.end();
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
