'use strict';
// Terminalin yerleşik göstergeleri. Hesaplar Canvas veya ağ erişimi kullanmaz.
// Test: node --test db/test-indicator-engine.cjs
(function () {
  const { IndicatorRegistry } = typeof module === 'object' && module.exports
    ? require('./indicator-engine.js') : globalThis.TerminalIndicatorEngine;
  const isN = Number.isFinite;
  const TA = {
    sma(src, n) { const out = new Array(src.length).fill(NaN); let sum = 0, cnt = 0; for (let i = 0; i < src.length; i++) { if (isN(src[i])) { sum += src[i]; cnt++; } if (i >= n) { const o = src[i - n]; if (isN(o)) { sum -= o; cnt--; } } if (i >= n - 1 && cnt === n) out[i] = sum / n; } return out; },
    ema(src, n) { const out = new Array(src.length).fill(NaN), a = 2 / (n + 1); let prev = NaN; for (let i = 0; i < src.length; i++) { const v = src[i]; if (!isN(v)) { if (isN(prev)) out[i] = prev; continue; } prev = isN(prev) ? a * v + (1 - a) * prev : v; out[i] = prev; } return out; },
    rma(src, n) { const out = new Array(src.length).fill(NaN); let prev = NaN, sum = 0, k = 0; for (let i = 0; i < src.length; i++) { const v = src[i]; if (!isN(v)) continue; if (!isN(prev)) { sum += v; if (++k === n) { prev = sum / n; out[i] = prev; } continue; } prev = (prev * (n - 1) + v) / n; out[i] = prev; } return out; },
    rsi(cl, n) { const up = [NaN], dn = [NaN]; for (let i = 1; i < cl.length; i++) { const d = cl[i] - cl[i - 1]; up.push(Math.max(d, 0)); dn.push(Math.max(-d, 0)); } const ru = this.rma(up, n), rd = this.rma(dn, n); return cl.map((_, i) => !isN(ru[i]) || !isN(rd[i]) ? NaN : rd[i] === 0 ? (ru[i] === 0 ? 50 : 100) : ru[i] === 0 ? 0 : 100 - 100 / (1 + ru[i] / rd[i])); },
    stochRsi(r, len, sk, sd) { const st = r.map((v, i) => { if (i < len - 1) return NaN; let lo = Infinity, hi = -Infinity; for (let j = i - len + 1; j <= i; j++) { if (!isN(r[j])) return NaN; if (r[j] < lo) lo = r[j]; if (r[j] > hi) hi = r[j]; } return hi - lo === 0 ? 0 : 100 * (v - lo) / (hi - lo); }); const k = this.sma(st, sk); return { k, d: this.sma(k, sd) }; },
    emaS(src, n) { const out = new Array(src.length).fill(NaN), a = 2 / (n + 1); let prev = NaN, sum = 0, k = 0; for (let i = 0; i < src.length; i++) { const v = src[i]; if (!isN(v)) { if (isN(prev)) out[i] = prev; continue; } if (!isN(prev)) { sum += v; if (++k === n) { prev = sum / n; out[i] = prev; } continue; } prev = a * v + (1 - a) * prev; out[i] = prev; } return out; },
    wma(src, n) { const out = new Array(src.length).fill(NaN), den = n * (n + 1) / 2; for (let i = n - 1; i < src.length; i++) { let q = 0; for (let k = 0; k < n; k++) q += src[i - k] * (n - k); out[i] = q / den; } return out; },
    // TC Buy/Sell = Range Filter: sig[i] 1 = Buy, -1 = Sell.
    rangeFilter(src, per, mult) {
      const n = src.length, dd = src.map((v, i) => (i ? Math.abs(v - src[i - 1]) : 0)), sm = this.emaS(this.emaS(dd, per), per * 2 - 1), filt = new Array(n).fill(NaN), sig = new Int8Array(n);
      for (let i = 0; i < n; i++) { const p = i ? filt[i - 1] : src[i], r = sm[i] * mult, x = src[i]; filt[i] = !isN(r) ? x : x > p ? (x - r < p ? p : x - r) : (x + r > p ? p : x + r); }
      let up = 0, dn = 0, cond = 0, last = -1;
      for (let i = 1; i < n; i++) {
        up = filt[i] > filt[i - 1] ? up + 1 : filt[i] < filt[i - 1] ? 0 : up; dn = filt[i] < filt[i - 1] ? dn + 1 : filt[i] > filt[i - 1] ? 0 : dn;
        const L = src[i] > filt[i] && src[i] !== src[i - 1] && up > 0, S2 = src[i] < filt[i] && src[i] !== src[i - 1] && dn > 0, prev = cond; cond = L ? 1 : S2 ? -1 : cond;
        if (L && prev === -1) { sig[i] = 1; last = i; } else if (S2 && prev === 1) { sig[i] = -1; last = i; }
      }
      return { sig, last };
    },
    // TC S/R: pivot seviyesi etrafındaki bandın genişliği 300 mumdan hesaplanır.
    sr(d, prd, look, wPct, maxSR) {
      const n = d.length, last = n - 1, close = d[last][4], pv = [];
      for (let c = last - prd; c >= Math.max(prd, last - look); c--) { let ph = true, pl = true; for (let k = 1; k <= prd && (ph || pl); k++) { if (d[c - k][2] > d[c][2] || d[c + k][2] >= d[c][2]) ph = false; if (d[c - k][3] < d[c][3] || d[c + k][3] <= d[c][3]) pl = false; } if (pl) pv.push(d[c][3]); if (ph) pv.push(d[c][2]); }
      let hh = -Infinity, ll = Infinity; for (let i = Math.max(0, n - 300); i < n; i++) { if (d[i][2] > hh) hh = d[i][2]; if (d[i][3] < ll) ll = d[i][3]; }
      const cw = (hh - ll) * wPct / 100, cnt = pv.map(v => pv.reduce((a, u) => a + (Math.abs(u - v) <= cw ? 1 : 0), 0)), used = pv.map(() => false), chosen = [];
      for (let k = 0; k < maxSR; k++) { let best = -1; for (let i = 0; i < pv.length; i++) { const v = pv[i]; if (used[i] || (close >= v - cw && close <= v + cw) || chosen.some(u => Math.abs(u - v) < 2 * cw)) continue; if (best < 0 || cnt[i] > cnt[best]) best = i; } if (best < 0) break; used[best] = true; chosen.push(pv[best]); }
      return { cw, lv: chosen.map(v => ({ v, res: v > close })) };
    },
    wt(d, n1, n2, sig) { const ap = d.map(r => (r[2] + r[3] + r[4]) / 3), esa = this.ema(ap, n1), dv = this.ema(ap.map((v, i) => Math.abs(v - esa[i])), n1); const wt1 = this.ema(ap.map((v, i) => isN(dv[i]) && dv[i] !== 0 ? (v - esa[i]) / (0.015 * dv[i]) : NaN), n2); return { wt1, wt2: this.sma(wt1, sig) }; }
  };

  function crossAt(a, b, i) {
    if (i < 1 || !isN(a[i]) || !isN(b[i]) || !isN(a[i - 1]) || !isN(b[i - 1])) return 0;
    if (a[i - 1] <= b[i - 1] && a[i] > b[i]) return 1;
    if (a[i - 1] >= b[i - 1] && a[i] < b[i]) return -1;
    return 0;
  }

  function calculateTc(d) {
    const n = d.length;
    const o4 = d.map(x => (x[1] + x[2] + x[3] + x[4]) / 4), rf = TA.rangeFilter(o4, 50, 2.2), mw = TA.wt(d, 9, 12, 4), w3 = TA.wt(d, 9, 12, 3).wt2, mild = new Int8Array(n), div = new Int8Array(n);
    for (let i = 1; i < n; i++) {
      const cross = crossAt(mw.wt1, mw.wt2, i);
      if ((cross > 0 && mw.wt2[i] < -53) || (cross < 0 && mw.wt2[i] > 53)) mild[i] = cross;
    }
    let tO = null, tH = 0, bO = null, bL = 0;
    for (let i = 6; i < n; i++) {
      const c = i - 3, v = w3[c]; if (!isN(w3[i - 6])) continue; let top = true, bot = true;
      for (let k = -3; k <= 3; k++) { if (!k) continue; const u = w3[c + k]; if (!(v > u)) top = false; if (!(v < u)) bot = false; }
      if (top && v >= 20) { if (tO != null && d[c][2] > tH && v < tO) div[i - 1] = -1; tO = v; tH = d[c][2]; }
      if (bot && v <= -40) { if (bO != null && d[c][3] < bL && v > bO) div[i - 1] = 1; bO = v; bL = d[c][3]; }
    }
    return { bs: rf.sig, lastBs: rf.last, mild, div, riF: TA.sma(o4, 5), riS: TA.sma(o4, 8), rbMid: TA.sma(o4, 30),
      rbStep: TA.wma(d.map(x => x[2] - x[3]), 48).map(v => v * 1.12), sr: n > 25 ? TA.sr(d, 10, 300, 2, 6) : { cw: 0, lv: [] } };
  }

  const registry = new IndicatorRegistry(['me', 'fr', 'oi', 'tp']);
  registry.register({
    id: 'rsi',
    panel: { label: 'RSI', description: '14 + ortalama 14', range: [0, 100], levels: [30, 70], band: true, enabled: true,
      colors: [['#a78bfa', '#fff'], ['warn', '#1a1300']] },
    calculate(rows) {
      const rsi = TA.rsi(rows.map(row => row[4]), 14);
      return { series: [rsi, TA.sma(rsi, 14)] };
    }
  });
  registry.register({
    id: 'srsi',
    panel: { label: 'Stokastik RSI', title: 'SRSI', description: 'K / D', range: [0, 100], levels: [20, 80], band: true, enabled: true,
      colors: [['acc', '#fff'], ['#f97316', '#fff']] },
    calculate(rows) {
      const { k, d } = TA.stochRsi(TA.rsi(rows.map(row => row[4]), 14), 14, 3, 3);
      return { series: [k, d] };
    }
  });
  registry.register({
    id: 'wt',
    panel: { label: 'WaveTrend / WT Cross', title: 'WT', description: '10,21,4 + kesişim', range: 'symmetric', levels: [-60, 0, 60], enabled: true,
      colors: [['up', '#fff'], ['dn', '#fff']] },
    calculate(rows) {
      const { wt1, wt2 } = TA.wt(rows, 10, 21, 4);
      return { series: [wt1, wt2], marks: Int8Array.from(rows, (_, i) => crossAt(wt1, wt2, i)) };
    }
  });
  registry.register({ id: 'tc', calculate: calculateTc });
  // DEMA 9 (V1.11.0): 2·EMA(kapanış,9) − EMA(EMA(kapanış,9),9); EMA ilk değer tohumlu (Pine ta.ema gibi). Fiyat grafiği üstünde çizilir.
  registry.register({
    id: 'dema',
    calculate(rows) { const e1 = TA.ema(rows.map(row => row[4]), 9), e2 = TA.ema(e1, 9); return { dema: e1.map((v, i) => 2 * v - e2[i]) }; }
  });
  // CVD (V1.14.0): mum başına Δ = 2·piyasa alışı − hacim (satır[6] = takerBuyQuoteVolume), CVD = yüklü ilk mumdan birikim.
  // Panel çizimi terminal.html'de (çubuk + çizgi); burada yalnız hesap.
  registry.register({
    id: 'cvd',
    calculate(rows) {
      const n = rows.length, delta = new Float64Array(n).fill(NaN), cvd = new Float64Array(n).fill(NaN); let cum = 0, any = false;
      for (let i = 0; i < n; i++) { const b = rows[i][6], q = rows[i][5]; if (isN(b) && isN(q)) { delta[i] = 2 * b - q; cum += delta[i]; any = true; } if (any) cvd[i] = cum; }
      return { delta, cvd };
    }
  });

  if (typeof module === 'object' && module.exports) module.exports = { registry };
  else globalThis.TerminalIndicators = { registry };
})();
