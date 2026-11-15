'use strict';
// Araştırma (salt okunur): FR yakalamalarında açık pozisyon (OI) ve long/short verisi işe yarıyor mu?
// Olaylar: FR 🟢 mesajları — 12.10–30.10 Visivero arşivi (vv_messages) + 30.10 sonrası kendi botumuz (signals). Fiyat: klines_5m.
// OI: oi_5m (coin adedi). Long/short: ls_15m (global_long = tüm hesapların long oranı, top_long = büyük hesapların HESAP oranı,
// taker_buy/sell = alıcı/satıcı hacmi), lsp_15m (top_pos_long = büyük hesapların POZİSYON oranı; varsa).
// Soru 1: yakalama anındaki OI / long-short durumu, sonucu (10x: −%9,5'ten önce +%10; 24 sa tepe/dip) ayırıyor mu?
// Soru 2: "OI zirveden %X düştü" iyi bir çıkış anı mı (yükselen yakalamalarda tepenin ne kadarı alınıyor)?
// Soru 3: yakalamadan sonra "OI ve fiyat birlikte artıyor" anını bekleyip girmek tasfiyeyi azaltıyor mu?
const fs = require('node:fs'), path = require('node:path'), { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
const M5 = 300e3, H = 3600e3, SESSIZ = 12 * H, SURE = 48 * H, T0 = Date.parse('2026-10-13T06:00:00Z'), OWN = Date.parse('2026-10-30T19:45:00Z');
const tr = t => new Date(t + 3 * H).toISOString().slice(5, 16).replace('T', ' ');
const fl = t => Math.floor(t / M5) * M5;
function sim(K, KI, b0, L, tpPct) {                       // giriş: b0 mumunun kapanışı
  const e = K[KI.get(b0)]; if (!e) return null; const p = e.c, liq = p * (1 - (L === 10 ? 0.095 : 0.19)), tp = p * (1 + tpPct / 100); let worst = 0, best = 0;
  for (let i = KI.get(b0) + 1; i < K.length && K[i].t <= b0 + SURE; i++) { const k = K[i]; worst = Math.min(worst, (k.l / p - 1) * 100); best = Math.max(best, (k.h / p - 1) * 100);
    if (k.l <= liq) return { k: 'tasfiye', roe: -100, worst, best, p }; if (k.h >= tp) return { k: 'hedef', roe: tpPct * L - 0.1 * L, worst, best, p }; }
  const last = K[K.length - 1]; if (last.t < b0 + 6 * H) return null; const c = (K[Math.min(K.length - 1, KI.get(b0) + SURE / M5)] || last).c;
  return { k: 'süre', roe: (c / p - 1) * 100 * L - 0.1 * L, worst, best, p };
}
(async () => {
  const hasP = (await pool.query(`SELECT to_regclass('lsp_15m') r`)).rows[0].r;
  const ev = [];
  for (const r of (await pool.query(`SELECT symbol, created_at, message FROM vv_messages WHERE bot='fr' AND created_at >= $1 AND created_at < $2 AND symbol IS NOT NULL AND message NOT LIKE '🔴%'`, [new Date(T0), new Date(OWN)])).rows)
    ev.push({ sym: r.symbol, t: r.created_at.getTime(), g: r.message.startsWith('🟢'), fr: Number((r.message.match(/Funding Rate: (-?[\d.]+)/) || [])[1]) });
  for (const r of (await pool.query(`SELECT symbol, extract(epoch FROM t)*1000 AS t, dir, (fields->>'fundingRate')::float8 AS fr FROM signals WHERE bot='fr' AND (dir='up' OR strategy='FR scan') AND t >= $1`, [new Date(OWN)])).rows)
    ev.push({ sym: r.symbol, t: Number(r.t), g: r.dir === 'up', fr: r.fr });
  const by = new Map(); for (const e of ev) { if (!by.has(e.sym)) by.set(e.sym, []); by.get(e.sym).push(e); }
  const C = [];      // yakalamalar
  for (const [sym, list0] of by) {
    const list = list0.sort((a, b) => a.t - b.t);
    const K = (await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, h, l, c, qv FROM klines_5m WHERE symbol=$1 AND t >= $2 ORDER BY t`, [sym, new Date(T0 - 26 * H)])).rows.map(k => ({ t: Number(k.t), h: k.h, l: k.l, c: k.c, qv: k.qv }));
    if (K.length < 600) continue; const KI = new Map(K.map((k, i) => [k.t, i]));
    const OI = new Map((await pool.query(`SELECT extract(epoch FROM t)*1000 AS t, oi FROM oi_5m WHERE symbol=$1`, [sym])).rows.map(r => [Number(r.t), r.oi]));
    if (OI.size < 500) continue;
    const LS = (await pool.query(`SELECT extract(epoch FROM l.t)*1000 AS t, l.top_long, l.global_long, l.taker_buy, l.taker_sell${hasP ? ', p.top_pos_long' : ''} FROM ls_15m l ${hasP ? 'LEFT JOIN lsp_15m p ON p.symbol=l.symbol AND p.t=l.t' : ''} WHERE l.symbol=$1 ORDER BY l.t`, [sym])).rows.map(r => ({ ...r, t: Number(r.t) }));
    const lsAt = t => { let lo = 0, hi = LS.length - 1, a = null; while (lo <= hi) { const m = (lo + hi) >> 1; if (LS[m].t <= t) { a = LS[m]; lo = m + 1; } else hi = m - 1; } return a && t - a.t <= 45 * 60e3 ? a : null; };
    const oi = t => OI.get(t), px = t => { const i = KI.get(t); return i == null ? NaN : K[i].c; };
    let prevG = -Infinity, st = null;
    for (const e of list) {
      if (e.g && e.t - prevG >= SESSIZ) st = { done: new Set() }; if (e.g) prevG = e.t; if (!st || e.t < T0) continue;
      const fire = []; if (e.g && !st.done.has('ilk')) fire.push('ilk yeşil'), st.done.add('ilk');
      if (Number.isFinite(e.fr) && e.fr <= -0.1 && !st.done.has('fr10')) fire.push('FR ≤ −0,10'), st.done.add('fr10');
      for (const trig of fire) {
        const b0 = fl(e.t), o0 = oi(b0), p0 = px(b0); if (!(o0 > 0) || !(p0 > 0)) continue;
        const r10 = sim(K, KI, b0, 10, 10), r5 = sim(K, KI, b0, 10, 5), r5x = sim(K, KI, b0, 5, 10); if (!r10 || !r5 || !r5x) continue;
        const l = lsAt(b0), l4 = lsAt(b0 - 4 * H); let tb = 0, ts = 0; for (const x of LS) if (x.t > b0 - H && x.t <= b0) { tb += x.taker_buy || 0; ts += x.taker_sell || 0; }
        const pc = (a, b) => a > 0 && b > 0 ? (a / b - 1) * 100 : NaN; let v1 = 0, v24 = 0; for (let i = KI.get(b0); i >= 0 && K[i].t > b0 - 24 * H; i--) { if (K[i].t > b0 - H) v1 += K[i].qv; v24 += K[i].qv; }
        C.push({ trig, sym, t: e.t, b0, fr: e.fr, r10, r5, r5x, K, KI, OI,
          f: { 'OI 1sa%': pc(o0, oi(b0 - H)), 'OI 4sa%': pc(o0, oi(b0 - 4 * H)), 'OI 24sa%': pc(o0, oi(b0 - 24 * H)), 'fiyat 1sa%': pc(p0, px(b0 - H)), 'fiyat 4sa%': pc(p0, px(b0 - 4 * H)), 'fiyat 24sa%': pc(p0, px(b0 - 24 * H)),
            'kalabalık long%': l ? l.global_long * 100 : NaN, 'kalabalık long 4sa değişim': l && l4 ? (l.global_long - l4.global_long) * 100 : NaN, 'büyük hesap long%': l ? l.top_long * 100 : NaN, 'büyük−kalabalık (hesap)': l ? (l.top_long - l.global_long) * 100 : NaN,
            'büyük POZİSYON long%': l && l.top_pos_long != null ? l.top_pos_long * 100 : NaN, 'büyük pozisyon − kalabalık': l && l.top_pos_long != null ? (l.top_pos_long - l.global_long) * 100 : NaN,
            'alıcı payı 1sa%': tb + ts > 0 ? 100 * tb / (tb + ts) : NaN, 'hacim 1sa / 24sa ort': v24 > 0 ? v1 / (v24 / 24) : NaN, 'funding': e.fr } });
      }
    }
  }
  const pcn = (a, f) => a.length ? Math.round(100 * a.filter(f).length / a.length) : 0, med = (a, f) => { const v = a.map(f).filter(Number.isFinite).sort((x, y) => x - y); return v.length ? +v[v.length >> 1].toFixed(1) : NaN; }, avg = (a, f) => { const v = a.map(f).filter(Number.isFinite); return v.length ? +(v.reduce((x, y) => x + y, 0) / v.length).toFixed(1) : NaN; };
  const row = a => ({ n: a.length, coin: new Set(a.map(x => x.sym)).size, '+%10 hedef%': pcn(a, x => x.r10.k === 'hedef'), '10x tasfiye%': pcn(a, x => x.r10.k === 'tasfiye'), '10x ort ROE': avg(a, x => x.r10.roe), '+%5 hedef%': pcn(a, x => x.r5.k === 'hedef'), '+%5 ort ROE': avg(a, x => x.r5.roe), '5x ort ROE': avg(a, x => x.r5x.roe) });
  for (const trig of ['ilk yeşil', 'FR ≤ −0,10']) {
    const A = C.filter(x => x.trig === trig); if (!A.length) continue;
    console.log(`\n==================== TETİK: ${trig} — ${A.length} yakalama, ${new Set(A.map(x => x.sym)).size} coin, ${tr(Math.min(...A.map(x => x.t)))} → ${tr(Math.max(...A.map(x => x.t)))}`);
    console.log('Sütunlar: 10x, stopsuz, 48 sa. "+%10 hedef%" = −%9,5 görmeden fiyat +%10 gördü.'); console.table({ 'HEPSİ': row(A) });
    for (const fname of Object.keys(A[0].f)) {
      const v = A.filter(x => Number.isFinite(x.f[fname])).sort((a, b) => a.f[fname] - b.f[fname]); if (v.length < 45) { console.log('(yetersiz veri: ' + fname + ' n=' + v.length + ')'); continue; }
      const q = Math.floor(v.length / 3), parts = [v.slice(0, q), v.slice(q, 2 * q), v.slice(2 * q)], t = {};
      parts.forEach((p, i) => { t[`${['düşük', 'orta', 'yüksek'][i]}  (${p[0].f[fname].toFixed(1)} … ${p[p.length - 1].f[fname].toFixed(1)})`] = row(p); });
      console.log('\n### ' + fname); console.table(t);
    }
  }
  // ---- Soru 4: birleşik puan — iki ayrı dönemde aynı mı? (eşikler tüm veriye bakılarak seçildi; bu yüzden dönem ayrımı yalnız tutarlılık denetimidir)
  const FLAGS = { 'fiyat 4sa ≤ −%2,5': f => f['fiyat 4sa%'] <= -2.5, 'OI 4sa ≤ +%3': f => f['OI 4sa%'] <= 3, 'kalabalık long ≥ %65': f => f['kalabalık long%'] >= 65, 'hacim 1sa ≥ 3×': f => f['hacim 1sa / 24sa ort'] >= 3, 'fiyat 24sa ≤ +%4': f => f['fiyat 24sa%'] <= 4, 'funding ≥ −0,20': f => f['funding'] >= -0.2 };
  const AVOID = { 'OI 4sa ≥ +%3,3': f => f['OI 4sa%'] >= 3.3, 'fiyat 24sa ≥ +%4': f => f['fiyat 24sa%'] >= 4, 'funding ≤ −0,20': f => f['funding'] <= -0.2, 'kalabalık long ≤ %55': f => f['kalabalık long%'] <= 55 };
  const score = c => Object.values(FLAGS).filter(fn => fn(c.f)).length, nAvoid = c => Object.values(AVOID).filter(fn => fn(c.f)).length;
  for (const trig of ['ilk yeşil', 'FR ≤ −0,10']) for (const [pn, pf] of [['1. dönem 13.10–30.10', c => c.t < OWN], ['2. dönem 30.10–10.11', c => c.t >= OWN], ['TÜMÜ', c => true]]) {
    const A = C.filter(x => x.trig === trig && pf(x)); if (A.length < 40) continue; const t = {};
    for (const [lab, fn] of [['puan 0–2', c => score(c) <= 2], ['puan 3', c => score(c) === 3], ['puan 4', c => score(c) === 4], ['puan 5–6', c => score(c) >= 5], ['kaçın işareti YOK', c => nAvoid(c) === 0], ['kaçın işareti 1', c => nAvoid(c) === 1], ['kaçın işareti 2+', c => nAvoid(c) >= 2]]) { const g = A.filter(fn); if (g.length >= 12) t[lab] = row(g); }
    console.log(`\n==================== SORU 4: birleşik puan — ${trig} — ${pn}`); console.table(t);
  }
  // ---- KABUL DENETİMİ (GOREV-FR-OI.md §5.2): canlı kuraldaki puan fonksiyonu (rules/flow.cjs) aynı veride ----
  const FL = require(process.argv[2] ? path.resolve(process.argv[2]) : '../rules/flow.cjs');   // canlıya almadan önce aday dosyayla denenebilir
  const feat = f => ({ px4h: f['fiyat 4sa%'], oi4h: f['OI 4sa%'], crowdLong: f['kalabalık long%'], vol1h: f['hacim 1sa / 24sa ort'], px24h: f['fiyat 24sa%'], fr: f['funding'] });
  for (const trig of ['ilk yeşil', 'FR ≤ −0,10']) {
    const A = C.filter(x => x.trig === trig), t = {};
    for (const [lab, fn] of [['kural: puan ≥ 5', c => FL.kurulumPuan(feat(c.f)).puan >= 5], ['kural: SİNYAL atılır (puan ≥5, ≥4 bilinen, ≤1 işaret)', c => FL.kurulumPuan(feat(c.f)).sinyal], ['kural: sinyal yok', c => !FL.kurulumPuan(feat(c.f)).sinyal], ['kural: kaçın işareti ≥ 2', c => FL.kurulumPuan(feat(c.f)).kacin.length >= 2]]) t[lab] = row(A.filter(fn));
    for (const [pn, pf] of [['1. dönem', c => c.t < OWN], ['2. dönem', c => c.t >= OWN]]) t['SİNYAL — ' + pn] = row(A.filter(c => pf(c) && FL.kurulumPuan(feat(c.f)).sinyal));
    const days = (Math.max(...A.map(x => x.t)) - Math.min(...A.map(x => x.t))) / 864e5;
    console.log(`\n==================== KABUL: rules/flow.cjs kurulumPuan — ${trig} — sinyal sıklığı ≈ ${(A.filter(c => FL.kurulumPuan(feat(c.f)).sinyal).length / days).toFixed(1)} / gün`); console.table(t);
  }
  // ---- Soru 2: OI kırılması çıkış için iyi mi? (ilk yeşil; yakalamadan sonra ≥ +%10 görenler) ----
  const A1 = C.filter(x => x.trig === 'ilk yeşil'), exitRows = {};
  for (const [name, rule] of Object.entries({ 'OI zirveden −%3': { oi: 3 }, 'OI zirveden −%5': { oi: 5 }, 'OI zirveden −%8': { oi: 8 }, 'fiyat zirveden −%5 (kıyas)': { px: 5 }, 'fiyat zirveden −%8 (kıyas)': { px: 8 } })) {
    const res = [];
    for (const c of A1) { const { K, KI, OI, b0 } = c, p = K[KI.get(b0)].c; let pk = p, oipk = OI.get(b0), maxGain = 0, armed = false, out = null;
      for (let i = KI.get(b0) + 1; i < K.length && K[i].t <= b0 + SURE; i++) { const k = K[i], o = OI.get(k.t); pk = Math.max(pk, k.h); maxGain = Math.max(maxGain, (k.h / p - 1) * 100); if (o > oipk) oipk = o; if ((k.h / p - 1) * 100 >= 5) armed = true;
        if (armed && !out) { const hit = rule.oi ? (o > 0 && o <= oipk * (1 - rule.oi / 100)) : k.c <= pk * (1 - rule.px / 100); if (hit) out = { gain: (k.c / p - 1) * 100, i }; } }
      if (maxGain >= 10) { const full = maxGain; let after = NaN; if (out) { const j = Math.min(K.length - 1, out.i + 48); after = (K[j].c / K[out.i].c - 1) * 100; } res.push({ full, got: out ? out.gain : null, after }); } }
    const fired = res.filter(r => r.got != null);
    exitRows[name] = { 'yükselen yakalama': res.length, 'kural tetiklendi%': pcn(res, r => r.got != null), 'medyan tepe%': med(res, r => r.full), 'medyan çıkış kârı%': med(fired, r => r.got), 'tepenin yakalanan kısmı (medyan %)': med(fired, r => 100 * r.got / r.full), 'zararda çıkış%': pcn(fired, r => r.got < 0), 'çıkıştan 4 sa sonra fiyat (medyan %)': med(fired, r => r.after), 'çıkıştan sonra düştü%': pcn(fired.filter(r => Number.isFinite(r.after)), r => r.after < 0) };
  }
  console.log('\n==================== SORU 2: çıkış kuralı (yakalamadan sonra +%5 görüldükten sonra devrede; +%10 ve üstü gören yakalamalar)'); console.table(exitRows);
  // ---- Soru 3: beklemeli giriş ----
  const ent = {};
  const variants = { 'hemen gir (kıyas)': null, 'OI 30dk ≥ +%2 ve fiyat 30dk ≥ +%1': { oi: 2, px: 1 }, 'OI 30dk ≥ +%3 ve fiyat 30dk ≥ +%2': { oi: 3, px: 2 }, 'OI 1sa ≥ +%5 ve fiyat 1sa ≥ +%2': { oi: 5, px: 2, w: 12 }, 'OI 1sa ≥ +%5, fiyat 1sa ≥ +%2, fiyat ≥ yakalama fiyatı': { oi: 5, px: 2, w: 12, above: true }, 'yalnız fiyat 30dk ≥ +%2 (OI yok, kıyas)': { oi: -999, px: 2 } };
  for (const [name, v] of Object.entries(variants)) { const res = []; let waited = [];
    for (const c of A1) { const { K, KI, OI, b0 } = c; if (!v) { res.push({ r: c.r10, r5: c.r5x }); continue; } const p0 = K[KI.get(b0)].c, w = v.w || 6;
      for (let i = KI.get(b0) + 1; i < K.length && K[i].t <= b0 + 24 * H; i++) { const k = K[i], kp = K[i - w], o = OI.get(k.t), op = OI.get(k.t - w * M5); if (!kp || !(o > 0) || !(op > 0)) continue;
        if ((o / op - 1) * 100 >= v.oi && (k.c / kp.c - 1) * 100 >= v.px && (!v.above || k.c >= p0)) { const r = sim(K, KI, k.t, 10, 10), r5 = sim(K, KI, k.t, 5, 10); if (r && r5) { res.push({ r, r5 }); waited.push((k.t - b0) / H); } break; } } }
    ent[name] = { işlem: res.length, 'yakalamaların %\'si': Math.round(100 * res.length / A1.length), '+%10 hedef%': pcn(res, x => x.r.k === 'hedef'), '10x tasfiye%': pcn(res, x => x.r.k === 'tasfiye'), '10x ort ROE': avg(res, x => x.r.roe), '5x ort ROE': avg(res, x => x.r5.roe), 'medyan bekleme sa': waited.length ? +waited.sort((a, b) => a - b)[waited.length >> 1].toFixed(1) : 0 }; }
  console.log('\n==================== SORU 3: beklemeli giriş (yakalamadan sonraki 24 sa içinde koşul ilk oluştuğunda; hedef fiyat +%10, 48 sa)'); console.table(ent);
  await pool.end();
})().catch(e => { console.error('HATA', e.stack); process.exit(1); });
