/**
 * IndicatorService
 * High-performance, zero-external-dependency mathematical calculation engine
 * for Trading indicators: Wilder RSI, Stoch RSI, WaveTrend (Cipher B), Floor Pivots, EMA, and Volume Delta.
 */

class IndicatorService {
  /**
   * Calculate Exponential Moving Average (EMA)
   * @param {number[]} values
   * @param {number} period
   * @returns {number[]}
   */
  static calcEMA(values, period) {
    if (!values || values.length < period) return [];
    const k = 2 / (period + 1);
    const emaArray = [];

    // First EMA is simple moving average (SMA) of first `period` items
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += values[i];
    }
    let prevEMA = sum / period;
    emaArray.push(prevEMA);

    for (let i = period; i < values.length; i++) {
      const currentEMA = values[i] * k + prevEMA * (1 - k);
      emaArray.push(currentEMA);
      prevEMA = currentEMA;
    }

    return emaArray;
  }

  /**
   * Calculate Wilder's Smoothed RSI (Binance / TradingView standard)
   * @param {number[]} closes - Array of closing prices
   * @param {number} period - RSI period, default 14
   * @returns {number[]} Array of RSI values
   */
  static calcRSI(closes, period = 14) {
    if (!closes || closes.length <= period) return [];

    const changes = [];
    for (let i = 1; i < closes.length; i++) {
      changes.push(closes[i] - closes[i - 1]);
    }

    let avgGain = 0;
    let avgLoss = 0;

    // First period simple average
    for (let i = 0; i < period; i++) {
      const change = changes[i];
      if (change > 0) avgGain += change;
      else avgLoss += Math.abs(change);
    }

    avgGain /= period;
    avgLoss /= period;

    const rsiValues = [];
    const calcVal = (g, l) => {
      if (l === 0) return 100;
      if (g === 0) return 0;
      const rs = g / l;
      return 100 - (100 / (1 + rs));
    };

    rsiValues.push(calcVal(avgGain, avgLoss));

    // Subsequent Wilder smoothing
    for (let i = period; i < changes.length; i++) {
      const change = changes[i];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      rsiValues.push(calcVal(avgGain, avgLoss));
    }

    return rsiValues;
  }

  /**
   * Calculate Stochastic RSI (K and D lines)
   * @param {number[]} closes
   * @param {number} rsiPeriod - default 14
   * @param {number} stochPeriod - default 14
   * @param {number} kPeriod - SMA smoothing for K, default 3
   * @param {number} dPeriod - SMA smoothing for D, default 3
   * @returns {{ k: number, d: number }}
   */
  static calcStochRSI(closes, rsiPeriod = 14, stochPeriod = 14, kPeriod = 3, dPeriod = 3) {
    const rsi = this.calcRSI(closes, rsiPeriod);
    if (rsi.length < stochPeriod + kPeriod + dPeriod) {
      return { k: 50, d: 50 };
    }

    const stochRsiList = [];
    for (let i = stochPeriod - 1; i < rsi.length; i++) {
      const window = rsi.slice(i - stochPeriod + 1, i + 1);
      const minRsi = Math.min(...window);
      const maxRsi = Math.max(...window);
      const currentRsi = rsi[i];

      let rawStoch = 0;
      if (maxRsi !== minRsi) {
        rawStoch = ((currentRsi - minRsi) / (maxRsi - minRsi)) * 100;
      }
      stochRsiList.push(rawStoch);
    }

    // K = SMA(stochRsiList, kPeriod)
    const kList = [];
    for (let i = kPeriod - 1; i < stochRsiList.length; i++) {
      const window = stochRsiList.slice(i - kPeriod + 1, i + 1);
      const sum = window.reduce((a, b) => a + b, 0);
      kList.push(sum / kPeriod);
    }

    // D = SMA(kList, dPeriod)
    const dList = [];
    for (let i = dPeriod - 1; i < kList.length; i++) {
      const window = kList.slice(i - dPeriod + 1, i + 1);
      const sum = window.reduce((a, b) => a + b, 0);
      dList.push(sum / dPeriod);
    }

    const latestK = kList.length > 0 ? kList[kList.length - 1] : 50;
    const latestD = dList.length > 0 ? dList[dList.length - 1] : 50;

    return {
      k: Math.max(0, Math.min(100, Number(latestK.toFixed(2)))),
      d: Math.max(0, Math.min(100, Number(latestD.toFixed(2))))
    };
  }

  /**
   * Calculate WaveTrend (Cipher B / LazyBear WT)
   * @param {number[]} highs
   * @param {number[]} lows
   * @param {number[]} closes
   * @param {number} n1 - Channel length, default 10
   * @param {number} n2 - Average length, default 11
   * @param {number} n3 - SMA length for wt2, default 21 (or standard 4)
   * @returns {{ wt1: number, wt2: number, crossUp: boolean, crossDown: boolean }}
   */
  static calcWaveTrend(highs, lows, closes, n1 = 10, n2 = 11, n3 = 4) {
    const len = closes.length;
    if (len < Math.max(n1, n2, n3) + 5) {
      return { wt1: 0, wt2: 0, crossUp: false, crossDown: false };
    }

    // HLC3 average price
    const ap = [];
    for (let i = 0; i < len; i++) {
      ap.push((highs[i] + lows[i] + closes[i]) / 3);
    }

    // esa = EMA(ap, n1)
    const esa = this.calcEMA(ap, n1);
    const offset = len - esa.length;

    // d = EMA(abs(ap - esa), n1)
    const absDiff = [];
    for (let i = 0; i < esa.length; i++) {
      absDiff.push(Math.abs(ap[i + offset] - esa[i]));
    }
    const d = this.calcEMA(absDiff, n1);
    const dOffset = len - d.length;

    // ci = (ap - esa) / (0.015 * d)
    const ci = [];
    for (let i = 0; i < d.length; i++) {
      const curAp = ap[i + dOffset];
      const curEsa = esa[i + (dOffset - offset)];
      const curD = d[i];
      if (curD === 0) ci.push(0);
      else ci.push((curAp - curEsa) / (0.015 * curD));
    }

    // tci = EMA(ci, n2) => wt1
    const tci = this.calcEMA(ci, n2);
    if (tci.length < 5) {
      return { wt1: 0, wt2: 0, crossUp: false, crossDown: false };
    }

    // wt2 = SMA(wt1, 4)
    const wt2List = [];
    for (let i = 3; i < tci.length; i++) {
      const window = tci.slice(i - 3, i + 1);
      const avg = window.reduce((a, b) => a + b, 0) / 4;
      wt2List.push(avg);
    }

    const curWt1 = tci[tci.length - 1];
    const prevWt1 = tci[tci.length - 2];
    const curWt2 = wt2List[wt2List.length - 1];
    const prevWt2 = wt2List[wt2List.length - 2];

    const crossUp = prevWt1 <= prevWt2 && curWt1 > curWt2;
    const crossDown = prevWt1 >= prevWt2 && curWt1 < curWt2;

    return {
      wt1: Number(curWt1.toFixed(2)),
      wt2: Number(curWt2.toFixed(2)),
      crossUp,
      crossDown
    };
  }

  /**
   * Calculate Classic Floor Pivot Levels (P, S1, R1, S2, R2)
   * @param {number} high - High of previous period
   * @param {number} low - Low of previous period
   * @param {number} close - Close of previous period
   * @returns {{ p: number, s1: number, r1: number, s2: number, r2: number }}
   */
  static calcClassicPivot(high, low, close) {
    const p = (high + low + close) / 3;
    const s1 = 2 * p - high;
    const r1 = 2 * p - low;
    const s2 = p - (high - low);
    const r2 = p + (high - low);

    return {
      p: Number(p.toFixed(4)),
      s1: Number(s1.toFixed(4)),
      r1: Number(r1.toFixed(4)),
      s2: Number(s2.toFixed(4)),
      r2: Number(r2.toFixed(4))
    };
  }

  /**
   * Check if price is within threshold % of any Pivot level
   * @param {number} currentPrice
   * @param {{ p: number, s1: number, r1: number, s2: number, r2: number }} pivotObj
   * @param {number} thresholdPercent - default 0.5%
   * @returns {{ isNear: boolean, level: string, diffPercent: number }}
   */
  static isNearPivot(currentPrice, pivotObj, thresholdPercent = 0.5) {
    if (!pivotObj || !currentPrice) return { isNear: false, level: '', diffPercent: 0 };
    const levels = [
      { name: 'P', value: pivotObj.p },
      { name: 'S1', value: pivotObj.s1 },
      { name: 'R1', value: pivotObj.r1 },
      { name: 'S2', value: pivotObj.s2 },
      { name: 'R2', value: pivotObj.r2 }
    ];

    for (const lvl of levels) {
      const diffPercent = Math.abs((currentPrice - lvl.value) / lvl.value) * 100;
      if (diffPercent <= thresholdPercent) {
        return { isNear: true, level: lvl.name, diffPercent: Number(diffPercent.toFixed(2)) };
      }
    }

    return { isNear: false, level: '', diffPercent: 0 };
  }

  /**
   * Calculate Volume Delta percentage compared to SMA20
   * @param {number[]} volumes
   * @param {number} period - default 20
   * @returns {number} percentage (+150% means 2.5x normal)
   */
  static calcVolumeDelta(volumes, period = 20) {
    if (!volumes || volumes.length < 2) return 0;
    const recentVol = volumes[volumes.length - 1];

    // Compute SMA of preceding candles
    const sample = volumes.slice(Math.max(0, volumes.length - 1 - period), volumes.length - 1);
    if (sample.length === 0) return 0;

    const sma = sample.reduce((a, b) => a + b, 0) / sample.length;
    if (sma === 0) return 0;

    const delta = ((recentVol - sma) / sma) * 100;
    return Number(delta.toFixed(2));
  }
}

module.exports = IndicatorService;
