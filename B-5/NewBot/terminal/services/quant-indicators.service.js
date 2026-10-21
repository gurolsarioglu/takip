/**
 * quant-indicators.service.js — Alpha Terminal Quant İndikatör Hesaplama Motoru
 * 
 * TradingView PineScript v5 standartlarında; 250 mumluk ısınma (warm-up) ile
 * Wilder's RSI(14), RSI-SMA(14), StochRSI(14,14,3,3), WaveTrend(10,21) LazyBear,
 * EMA(20,50,200), Pivot Seviyeleri, Hacim Sıçraması ve Pivot Lookback Divergence hesaplar.
 */

class QuantIndicatorsService {
  /**
   * Wilder's RSI(14) ve RSI-SMA(14) hesaplar
   * @param {Array<number>} closes Kapanış fiyatları dizisi (en az 15 eleman, ideal 250)
   * @param {number} period RSI periyodu (varsayılan: 14)
   */
  calculateRSI(closes, period = 14) {
    if (!Array.isArray(closes) || closes.length <= period) {
      return { rsi: 50, rsiSma: 50, rsiSeries: [], rsiSmaSeries: [] };
    }

    const gains = [];
    const losses = [];
    for (let i = 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      gains.push(diff > 0 ? diff : 0);
      losses.push(diff < 0 ? Math.abs(diff) : 0);
    }

    // İlk 'period' mum için basit ortalama
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 0; i < period; i++) {
      avgGain += gains[i];
      avgLoss += losses[i];
    }
    avgGain /= period;
    avgLoss /= period;

    const rsiSeries = [];
    const rsFirst = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsiFirst = avgLoss === 0 ? 100 : (100 - (100 / (1 + rsFirst)));
    rsiSeries.push(parseFloat(rsiFirst.toFixed(2)));

    // Wilder RMA düzleştirmesi
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

      if (avgLoss === 0) {
        rsiSeries.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        rsiSeries.push(parseFloat(rsi.toFixed(2)));
      }
    }

    // RSI serisi üzerinden 14 periyotluk SMA
    const rsiSmaSeries = [];
    for (let i = 0; i < rsiSeries.length; i++) {
      if (i < period - 1) {
        rsiSmaSeries.push(rsiSeries[i]);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += rsiSeries[i - j];
        }
        rsiSmaSeries.push(parseFloat((sum / period).toFixed(2)));
      }
    }

    const latestRsi = rsiSeries[rsiSeries.length - 1] ?? 50;
    const latestRsiSma = rsiSmaSeries[rsiSmaSeries.length - 1] ?? 50;
    const prevRsi = rsiSeries.length > 1 ? rsiSeries[rsiSeries.length - 2] : latestRsi;
    const prevRsiSma = rsiSmaSeries.length > 1 ? rsiSmaSeries[rsiSmaSeries.length - 2] : latestRsiSma;
    const rsiSmaCrossUp = prevRsi <= prevRsiSma && latestRsi > latestRsiSma;
    const rsiSmaCrossDown = prevRsi >= prevRsiSma && latestRsi < latestRsiSma;

    return {
      rsi: latestRsi,
      rsiSma: latestRsiSma,
      prevRsi,
      prevRsiSma,
      rsiSmaCrossUp,
      rsiSmaCrossDown,
      rsiSeries,
      rsiSmaSeries
    };
  }

  /**
   * Stochastic RSI (14, 14, 3, 3)
   * @param {Array<number>} rsiSeries Daha önce hesaplanmış RSI serisi
   * @param {number} stochPeriod 14
   * @param {number} smoothK 3
   * @param {number} smoothD 3
   */
  calculateStochRSI(rsiSeries, stochPeriod = 14, smoothK = 3, smoothD = 3) {
    if (!Array.isArray(rsiSeries) || rsiSeries.length < stochPeriod) {
      return { k: 50, d: 50, kSeries: [], dSeries: [] };
    }

    const stochRsiRaw = [];
    for (let i = stochPeriod - 1; i < rsiSeries.length; i++) {
      let minRsi = Infinity;
      let maxRsi = -Infinity;
      for (let j = 0; j < stochPeriod; j++) {
        const val = rsiSeries[i - j];
        if (val < minRsi) minRsi = val;
        if (val > maxRsi) maxRsi = val;
      }

      const range = maxRsi - minRsi;
      const raw = range === 0 ? 50 : ((rsiSeries[i] - minRsi) / range) * 100;
      stochRsiRaw.push(Math.max(0, Math.min(100, raw)));
    }

    // %K = SMA(StochRSI, smoothK)
    const kSeries = [];
    for (let i = 0; i < stochRsiRaw.length; i++) {
      if (i < smoothK - 1) {
        kSeries.push(stochRsiRaw[i]);
      } else {
        let sum = 0;
        for (let j = 0; j < smoothK; j++) {
          sum += stochRsiRaw[i - j];
        }
        kSeries.push(parseFloat((sum / smoothK).toFixed(2)));
      }
    }

    // %D = SMA(%K, smoothD)
    const dSeries = [];
    for (let i = 0; i < kSeries.length; i++) {
      if (i < smoothD - 1) {
        dSeries.push(kSeries[i]);
      } else {
        let sum = 0;
        for (let j = 0; j < smoothD; j++) {
          sum += kSeries[i - j];
        }
        dSeries.push(parseFloat((sum / smoothD).toFixed(2)));
      }
    }

    const latestK = kSeries[kSeries.length - 1] ?? 50;
    const latestD = dSeries[dSeries.length - 1] ?? 50;

    return {
      k: latestK,
      d: latestD,
      kSeries,
      dSeries
    };
  }

  /**
   * WaveTrend Osilatörü — WT (10, 21) [LazyBear Standardı]
   * @param {Array<{high: number, low: number, close: number}>} candles 
   * @param {number} n1 Channel Length (10)
   * @param {number} n2 Average Length (21)
   */
  calculateWaveTrend(candles, n1 = 10, n2 = 21) {
    if (!Array.isArray(candles) || candles.length < n1 + n2) {
      return { wt1: 0, wt2: 0, prevWt1: 0, prevWt2: 0, crossUp: false, crossDown: false, isOversold: false, isOverbought: false };
    }

    const apSeries = candles.map(c => (c.high + c.low + c.close) / 3);

    // esa = EMA(ap, n1)
    const alpha1 = 2 / (n1 + 1);
    const esaSeries = [];
    let prevEsa = apSeries[0];
    esaSeries.push(prevEsa);
    for (let i = 1; i < apSeries.length; i++) {
      const curEsa = alpha1 * apSeries[i] + (1 - alpha1) * prevEsa;
      esaSeries.push(curEsa);
      prevEsa = curEsa;
    }

    // d = EMA(abs(ap - esa), n1)
    const dSeries = [];
    let prevD = Math.abs(apSeries[0] - esaSeries[0]);
    dSeries.push(prevD);
    for (let i = 1; i < apSeries.length; i++) {
      const diff = Math.abs(apSeries[i] - esaSeries[i]);
      const curD = alpha1 * diff + (1 - alpha1) * prevD;
      dSeries.push(curD);
      prevD = curD;
    }

    // ci = (ap - esa) / (0.015 * d)
    const ciSeries = [];
    for (let i = 0; i < apSeries.length; i++) {
      const denom = 0.015 * dSeries[i];
      const ci = denom === 0 ? 0 : (apSeries[i] - esaSeries[i]) / denom;
      ciSeries.push(ci);
    }

    // wt1 = EMA(ci, n2)
    const alpha2 = 2 / (n2 + 1);
    const wt1Series = [];
    let prevWt1 = ciSeries[0];
    wt1Series.push(prevWt1);
    for (let i = 1; i < ciSeries.length; i++) {
      const curWt1 = alpha2 * ciSeries[i] + (1 - alpha2) * prevWt1;
      wt1Series.push(curWt1);
      prevWt1 = curWt1;
    }

    // wt2 = SMA(wt1, 4)
    const wt2Series = [];
    for (let i = 0; i < wt1Series.length; i++) {
      if (i < 3) {
        wt2Series.push(wt1Series[i]);
      } else {
        const sum = wt1Series[i] + wt1Series[i - 1] + wt1Series[i - 2] + wt1Series[i - 3];
        wt2Series.push(sum / 4);
      }
    }

    const len = wt1Series.length;
    const wt1 = parseFloat(wt1Series[len - 1].toFixed(2));
    const wt2 = parseFloat(wt2Series[len - 1].toFixed(2));
    const pWt1 = len > 1 ? parseFloat(wt1Series[len - 2].toFixed(2)) : wt1;
    const pWt2 = len > 1 ? parseFloat(wt2Series[len - 2].toFixed(2)) : wt2;
    const ppWt1 = len > 2 ? parseFloat(wt1Series[len - 3].toFixed(2)) : pWt1;
    const ppWt2 = len > 2 ? parseFloat(wt2Series[len - 3].toFixed(2)) : pWt2;

    const crossUp = pWt1 <= pWt2 && wt1 > wt2;
    const crossDown = pWt1 >= pWt2 && wt1 < wt2;
    const closedCrossUp = ppWt1 <= ppWt2 && pWt1 > pWt2;
    const closedCrossDown = ppWt1 >= ppWt2 && pWt1 < pWt2;

    return {
      wt1,
      wt2,
      prevWt1: pWt1,
      prevWt2: pWt2,
      crossUp,
      crossDown,
      closedCrossUp,
      closedCrossDown,
      isOversold: wt1 <= -60,
      isOverbought: wt1 >= 60,
      wt1Series,
      wt2Series
    };
  }

  /**
   * EMA serisi ve son değerini hesaplar
   */
  calculateEMA(series, period) {
    if (!Array.isArray(series) || series.length === 0) return 0;
    if (series.length < period) {
      const sum = series.reduce((a, b) => a + b, 0);
      return sum / series.length;
    }

    const alpha = 2 / (period + 1);
    let ema = series[0];
    for (let i = 1; i < series.length; i++) {
      ema = alpha * series[i] + (1 - alpha) * ema;
    }
    return ema;
  }

  /**
   * Klasik / Seanslık Pivot Seviyeleri
   * @param {{high: number, low: number, close: number}} prevBar Bir önceki tamamlanmış periyot/gün barı
   * @param {number} currentPrice Anlık fiyat
   */
  calculatePivots(prevBar, currentPrice) {
    if (!prevBar || !prevBar.high || !prevBar.low || !prevBar.close) {
      return { p: currentPrice, s1: currentPrice, s2: currentPrice, r1: currentPrice, r2: currentPrice, pivotDistancePct: 0 };
    }

    const H = prevBar.high;
    const L = prevBar.low;
    const C = prevBar.close;

    const P = (H + L + C) / 3;
    const S1 = 2 * P - H;
    const S2 = P - (H - L);
    const R1 = 2 * P - L;
    const R2 = P + (H - L);

    const pivotDistancePct = P > 0 ? parseFloat((Math.abs(currentPrice - P) / P * 100).toFixed(2)) : 0;

    return {
      p: P,
      s1: S1,
      s2: S2,
      r1: R1,
      r2: R2,
      pivotDistancePct
    };
  }

  /**
   * Hacim Sıçraması (Delta Vol %)
   * @param {Array<number>} volumes Mum hacimleri (son eleman anlık/kapanan mum)
   * @param {number} period 20
   */
  calculateDeltaVolume(volumes, period = 20) {
    if (!Array.isArray(volumes) || volumes.length < 2) return 0;

    const currentVol = volumes[volumes.length - 1];
    // Önceki kapanmış 20 mumun ortalaması
    const closedVols = volumes.slice(Math.max(0, volumes.length - 1 - period), volumes.length - 1);
    if (closedVols.length === 0) return 0;

    const avgVol = closedVols.reduce((a, b) => a + b, 0) / closedVols.length;
    if (avgVol === 0) return 0;

    const deltaVolPct = ((currentVol - avgVol) / avgVol) * 100;
    return parseFloat(deltaVolPct.toFixed(2));
  }

  /**
   * Pivot Lookback Bullish / Bearish RSI(14) Divergence Tespiti
   * Son 30 kapanmış mum içinde yerel fiyat dipleri/tepeleri ile RSI dipleri/tepelerini kıyaslar.
   * 
   * Boğa (🟢): Price_Low2 < Price_Low1 ve RSI_Low2 > RSI_Low1 ve RSI_Low1 <= 35
   * Ayı (🔴): Price_High2 > Price_High1 ve RSI_High2 < RSI_High1 ve RSI_High1 >= 65
   */
  detectPivotDivergence(candles, rsiSeries) {
    if (!Array.isArray(candles) || !Array.isArray(rsiSeries) || candles.length < 15 || rsiSeries.length < 15) {
      return { hasBullDiv: false, hasBearDiv: false, type: null, detail: '' };
    }

    const lookback = Math.min(30, candles.length - 2);
    const startIdx = candles.length - lookback;

    // 1. Pivot Low Tespiti (sağında ve solunda 2 bar daha yüksek low)
    const pivotLows = [];
    for (let i = startIdx; i <= candles.length - 3; i++) {
      const c = candles[i].low;
      if (
        c < candles[i - 1].low &&
        c < candles[i - 2].low &&
        c <= candles[i + 1].low &&
        c <= candles[i + 2].low
      ) {
        // İlgili barın RSI değerini bul
        const rsiIdx = rsiSeries.length - (candles.length - i);
        if (rsiIdx >= 0 && rsiIdx < rsiSeries.length) {
          pivotLows.push({ index: i, price: c, rsi: rsiSeries[rsiIdx] });
        }
      }
    }

    // 2. Pivot High Tespiti (sağında ve solunda 2 bar daha düşük high)
    const pivotHighs = [];
    for (let i = startIdx; i <= candles.length - 3; i++) {
      const c = candles[i].high;
      if (
        c > candles[i - 1].high &&
        c > candles[i - 2].high &&
        c >= candles[i + 1].high &&
        c >= candles[i + 2].high
      ) {
        const rsiIdx = rsiSeries.length - (candles.length - i);
        if (rsiIdx >= 0 && rsiIdx < rsiSeries.length) {
          pivotHighs.push({ index: i, price: c, rsi: rsiSeries[rsiIdx] });
        }
      }
    }

    // Boğa Uyumsuzluğu Kontrolü
    let hasBullDiv = false;
    let bullDetail = '';
    if (pivotLows.length >= 2) {
      const p1 = pivotLows[pivotLows.length - 2];
      const p2 = pivotLows[pivotLows.length - 1]; // Daha güncel dip
      if (p2.price < p1.price && p2.rsi > p1.rsi && p1.rsi <= 35) {
        hasBullDiv = true;
        bullDetail = `Price: ${p1.price.toFixed(4)} -> ${p2.price.toFixed(4)} (Daha Düşük Dip), RSI: ${p1.rsi.toFixed(1)} -> ${p2.rsi.toFixed(1)} (Daha Yüksek Dip)`;
      }
    }

    // Ayı Uyumsuzluğu Kontrolü
    let hasBearDiv = false;
    let bearDetail = '';
    if (pivotHighs.length >= 2) {
      const p1 = pivotHighs[pivotHighs.length - 2];
      const p2 = pivotHighs[pivotHighs.length - 1]; // Daha güncel tepe
      if (p2.price > p1.price && p2.rsi < p1.rsi && p1.rsi >= 65) {
        hasBearDiv = true;
        bearDetail = `Price: ${p1.price.toFixed(4)} -> ${p2.price.toFixed(4)} (Daha Yüksek Tepe), RSI: ${p1.rsi.toFixed(1)} -> ${p2.rsi.toFixed(1)} (Daha Düşük Tepe)`;
      }
    }

    // VisiVero 1H/4H Regular RSI Divergence (95/97 = %97.9 doğrulanmış formül):
    // Son 60 bar içindeki 2-komşulu RSI(14) veya Fiyat pivotları ile son kapanmış (prev) veya canlı (now) mumu karşılaştırır.
    const len = candles.length;
    const rLen = rsiSeries.length;
    const offset = len - rLen;
    const rsiAt = idx => {
      const ri = idx - offset;
      return ri >= 0 && ri < rLen ? rsiSeries[ri] : null;
    };
    const rsiNow = rsiAt(len - 1);
    const start60 = Math.max(2, offset + 2, len - 60);

    if (!hasBullDiv && Number.isFinite(rsiNow) && rsiNow <= 40) {
      for (let i = len - 3; i >= start60; i--) {
        const rPiv = rsiAt(i);
        const rL1 = rsiAt(i - 1), rL2 = rsiAt(i - 2), rR1 = rsiAt(i + 1), rR2 = rsiAt(i + 2);
        if (!Number.isFinite(rPiv) || rPiv > 40) continue;
        const isRsiLowPivot = Number.isFinite(rL1) && Number.isFinite(rL2) && Number.isFinite(rR1) && Number.isFinite(rR2) &&
          rPiv <= rL1 && rPiv <= rL2 && rPiv <= rR1 && rPiv <= rR2;
        const cLow = candles[i].low;
        const isPriceLowPivot = Number.isFinite(cLow) &&
          cLow <= candles[i - 1].low && cLow <= candles[i - 2].low &&
          cLow <= candles[i + 1].low && cLow <= candles[i + 2].low;
        if (!isRsiLowPivot && !isPriceLowPivot) continue;

        for (const refIdx of [len - 1, len - 2]) {
          if (refIdx <= i) continue;
          const rRef = rsiAt(refIdx);
          if (!Number.isFinite(rRef) || rRef <= rPiv) continue;
          const lowerPrice = (Number.isFinite(candles[refIdx].low) && Number.isFinite(cLow) && candles[refIdx].low < cLow) ||
            (Number.isFinite(candles[refIdx].close) && Number.isFinite(candles[i].close) && candles[refIdx].close < candles[i].close);
          if (lowerPrice) {
            hasBullDiv = true;
            bullDetail = `VisiVero Regular Bull Div: Price ${candles[i].close} -> ${candles[refIdx].close}, RSI ${rPiv.toFixed(1)} -> ${rRef.toFixed(1)}`;
            break;
          }
        }
        if (hasBullDiv) break;
      }
    }

    if (!hasBearDiv && Number.isFinite(rsiNow) && rsiNow >= 57) {
      for (let i = len - 3; i >= start60; i--) {
        const rPiv = rsiAt(i);
        const rL1 = rsiAt(i - 1), rL2 = rsiAt(i - 2), rR1 = rsiAt(i + 1), rR2 = rsiAt(i + 2);
        if (!Number.isFinite(rPiv) || rPiv < 57) continue;
        const isRsiHighPivot = Number.isFinite(rL1) && Number.isFinite(rL2) && Number.isFinite(rR1) && Number.isFinite(rR2) &&
          rPiv >= rL1 && rPiv >= rL2 && rPiv >= rR1 && rPiv >= rR2;
        const cHigh = candles[i].high;
        const isPriceHighPivot = Number.isFinite(cHigh) &&
          cHigh >= candles[i - 1].high && cHigh >= candles[i - 2].high &&
          cHigh >= candles[i + 1].high && cHigh >= candles[i + 2].high;
        if (!isRsiHighPivot && !isPriceHighPivot) continue;

        for (const refIdx of [len - 1, len - 2]) {
          if (refIdx <= i) continue;
          const rRef = rsiAt(refIdx);
          if (!Number.isFinite(rRef) || rRef >= rPiv) continue;
          const higherPrice = (Number.isFinite(candles[refIdx].high) && Number.isFinite(cHigh) && candles[refIdx].high > cHigh) ||
            (Number.isFinite(candles[refIdx].close) && Number.isFinite(candles[i].close) && candles[refIdx].close > candles[i].close);
          if (higherPrice) {
            hasBearDiv = true;
            bearDetail = `VisiVero Regular Bear Div: Price ${candles[i].close} -> ${candles[refIdx].close}, RSI ${rPiv.toFixed(1)} -> ${rRef.toFixed(1)}`;
            break;
          }
        }
        if (hasBearDiv) break;
      }
    }

    const type = hasBullDiv ? 'bull' : (hasBearDiv ? 'bear' : null);
    const detail = hasBullDiv ? bullDetail : bearDetail;

    return {
      hasBullDiv,
      hasBearDiv,
      type,
      detail
    };
  }

  /**
   * LuxAlgo Nadaraya-Watson Envelope (Gaussian Kernel Regression)
   * VisiVero 4S Sniper Bot 8 (NW UP / NW DOWN) 100% doğrulanmış formülü:
   * - h = 8, mult = 3, repaint = true (varsayılan, son 500 bar)
   * - w(i, j) = exp(-(i - j)^2 / (2 * h^2))
   * - MAE = (1 / N) * sum(|C_i - mu_i|) * mult
   * - Upper = mu + MAE, Lower = mu - MAE
   */
  calculateNadarayaWatson(closes, hOrOpts = 8, mult = 3, repaint = true) {
    if (!Array.isArray(closes) || closes.length < 15) return null;
    let h = 8;
    if (hOrOpts && typeof hOrOpts === 'object') {
      h = Number.isFinite(hOrOpts.h) ? hOrOpts.h : 8;
      mult = Number.isFinite(hOrOpts.mult) ? hOrOpts.mult : 3;
      repaint = hOrOpts.repaint !== undefined ? Boolean(hOrOpts.repaint) : true;
    } else if (Number.isFinite(hOrOpts)) {
      h = hOrOpts;
    }

    const n = Math.min(closes.length, 500);
    const src = closes.slice(-n);
    const denom = h * h * 2;
    const weights = new Float64Array(n);
    for (let d = 0; d < n; d++) {
      weights[d] = Math.exp(-(d * d) / denom);
    }

    if (repaint) {
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        let sum = 0;
        let sumw = 0;
        for (let j = 0; j < n; j++) {
          const w = weights[Math.abs(i - j)];
          sum += src[j] * w;
          sumw += w;
        }
        out[i] = sumw === 0 ? src[i] : sum / sumw;
      }

      let sae = 0;
      for (let i = 0; i < n; i++) {
        sae += Math.abs(src[i] - out[i]);
      }
      const mae = (sae / n) * mult;
      const lastCenter = out[n - 1];
      const prevCenter = out[n - 2];
      const upper = lastCenter + mae;
      const lower = lastCenter - mae;
      const prevUpper = prevCenter + mae;
      const prevLower = prevCenter - mae;
      const lastClose = src[n - 1];
      const prevClose = src[n - 2];

      return {
        center: lastCenter,
        upper,
        lower,
        mae,
        isBelowLower: lastClose < lower,
        isAboveUpper: lastClose > upper,
        prevBelowLower: prevClose < prevLower,
        prevAboveUpper: prevClose > prevUpper,
        crossDownLower: prevClose >= prevLower && lastClose < lower,
        crossUpUpper: prevClose <= prevUpper && lastClose > upper
      };
    }

    // Causal (Non-Repainting) endpoint mode
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      let sumw = 0;
      const maxK = Math.min(499, i);
      for (let k = 0; k <= maxK; k++) {
        const w = weights[k];
        sum += src[i - k] * w;
        sumw += w;
      }
      y[i] = sumw === 0 ? src[i] : sum / sumw;
    }

    const maeLen = Math.min(499, n);
    let sae = 0;
    for (let i = n - maeLen; i < n; i++) {
      sae += Math.abs(src[i] - y[i]);
    }
    const mae = (sae / maeLen) * mult;
    const lastCenter = y[n - 1];
    const prevCenter = y[n - 2];
    const upper = lastCenter + mae;
    const lower = lastCenter - mae;
    const prevUpper = prevCenter + mae;
    const prevLower = prevCenter - mae;
    const lastClose = src[n - 1];
    const prevClose = src[n - 2];

    return {
      center: lastCenter,
      upper,
      lower,
      mae,
      isBelowLower: lastClose < lower,
      isAboveUpper: lastClose > upper,
      prevBelowLower: prevClose < prevLower,
      prevAboveUpper: prevClose > prevUpper,
      crossDownLower: prevClose >= prevLower && lastClose < lower,
      crossUpUpper: prevClose <= prevUpper && lastClose > upper
    };
  }

  /**
   * 250 Mumluk Kayan Pencereden tüm temel metrikleri tek seferde çıkarır
   */
  calculateAllMetrics(candles) {
    if (!Array.isArray(candles) || candles.length < 15) {
      return null;
    }

    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    const latestCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2] || latestCandle;

    const rsiData = this.calculateRSI(closes, 14);
    const stochData = this.calculateStochRSI(rsiData.rsiSeries, 14, 3, 3);
    const wtData = this.calculateWaveTrend(candles, 10, 21);
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    const ema200 = this.calculateEMA(closes, 200);
    const pivots = this.calculatePivots(prevCandle, latestCandle.close);
    const deltaVolPct = this.calculateDeltaVolume(volumes, 20);
    const divergence = this.detectPivotDivergence(candles, rsiData.rsiSeries);
    const nw = this.calculateNadarayaWatson(closes, 8, 3, true);

    const ema200DistPct = ema200 > 0
      ? parseFloat((Math.abs(latestCandle.close - ema200) / ema200 * 100).toFixed(2))
      : null;

    return {
      rsi: rsiData.rsi,
      rsiSma: rsiData.rsiSma,
      prevRsi: rsiData.prevRsi,
      prevRsiSma: rsiData.prevRsiSma,
      rsiSmaCrossUp: rsiData.rsiSmaCrossUp,
      rsiSmaCrossDown: rsiData.rsiSmaCrossDown,
      srsiK: stochData.k,
      srsiD: stochData.d,
      wt1: wtData.wt1,
      wt2: wtData.wt2,
      wtCrossUp: wtData.crossUp,
      wtCrossDown: wtData.crossDown,
      wtCrossUpClosed: wtData.closedCrossUp,
      wtCrossDownClosed: wtData.closedCrossDown,
      wtOversold: wtData.isOversold,
      wtOverbought: wtData.isOverbought,
      ema20,
      ema50,
      ema200,
      ema200DistPct,
      pivots,
      deltaVolPct,
      divergence,
      nw
    };
  }
}

const quantIndicatorsService = new QuantIndicatorsService();
module.exports = quantIndicatorsService;
