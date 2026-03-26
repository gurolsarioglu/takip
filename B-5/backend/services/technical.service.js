const config = require('../config/binance.config');

class TechnicalService {
    /**
     * Calculate RSI (Relative Strength Index) using pure JavaScript
     * @param {Array} closePrices - Array of closing prices
     * @param {number} period - RSI period (default: 14)
     */
    calculateRSI(closePrices, period = config.RSI_PERIOD) {
        try {
            // Ensure we have enough data
            if (closePrices.length < period + 1) {
                console.warn(`Not enough data for RSI calculation. Need at least ${period + 1} candles, got ${closePrices.length}`);
                return null;
            }

            // Calculate price changes
            const changes = [];
            for (let i = 1; i < closePrices.length; i++) {
                changes.push(closePrices[i] - closePrices[i - 1]);
            }

            // Separate gains and losses
            const gains = changes.map(change => change > 0 ? change : 0);
            const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);

            // Calculate initial average gain and loss
            let avgGain = gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
            let avgLoss = losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

            // Calculate RSI using smoothed averages
            for (let i = period; i < gains.length; i++) {
                avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
                avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
            }

            // Calculate RS and RSI
            if (avgLoss === 0) {
                return 100;
            }

            const rs = avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));

            return rsi;
        } catch (error) {
            console.error('Error calculating RSI:', error.message);
            return null;
        }
    }

    /**
     * Calculate Stochastic RSI
     * @param {Array} closePrices - Array of closing prices
     * @param {number} period - Period for calculation
     */
    calculateStochasticRSI(closePrices, period = config.STOCH_RSI_PERIOD) {
        try {
            // Calculate RSI values
            const rsiValues = [];

            for (let i = period; i < closePrices.length; i++) {
                const slice = closePrices.slice(i - period - 1, i + 1);
                const rsi = this.calculateRSI(slice, period);
                if (rsi !== null) {
                    rsiValues.push(rsi);
                }
            }

            if (rsiValues.length < period) {
                console.warn('Not enough RSI values for Stochastic RSI');
                return null;
            }

            // Calculate Stochastic RSI using the last 'period' RSI values
            const recentRSI = rsiValues.slice(-period);
            const minRSI = Math.min(...recentRSI);
            const maxRSI = Math.max(...recentRSI);
            const currentRSI = recentRSI[recentRSI.length - 1];

            // Stochastic formula
            if (maxRSI === minRSI) {
                return 50; // Return neutral value if no variation
            }

            const stochRSI = ((currentRSI - minRSI) / (maxRSI - minRSI)) * 100;

            return stochRSI;
        } catch (error) {
            console.error('Error calculating Stochastic RSI:', error.message);
            return null;
        }
    }

    /**
     * Calculate Simple Moving Average
     * @param {Array} values - Array of values
     * @param {number} period - SMA period
     */
    calculateSMA(values, period) {
        try {
            if (values.length < period) {
                return null;
            }

            const slice = values.slice(-period);
            const sum = slice.reduce((acc, val) => acc + val, 0);
            return sum / period;
        } catch (error) {
            console.error('Error calculating SMA:', error.message);
            return null;
        }
    }

    /**
     * Calculate Exponential Moving Average
     * @param {Array} values - Array of values
     * @param {number} period - EMA period
     */
    calculateEMA(values, period) {
        try {
            if (values.length < period) {
                return null;
            }

            const multiplier = 2 / (period + 1);

            // Start with SMA
            let ema = this.calculateSMA(values.slice(0, period), period);

            // Calculate EMA for remaining values
            for (let i = period; i < values.length; i++) {
                ema = (values[i] - ema) * multiplier + ema;
            }

            return ema;
        } catch (error) {
            console.error('Error calculating EMA:', error.message);
            return null;
        }
    }

    /**
     * Get RSI interpretation
     */
    getRSIInterpretation(rsi) {
        if (rsi === null || rsi === undefined) return 'UNKNOWN';
        if (rsi >= 70) return 'OVERBOUGHT';
        if (rsi <= 30) return 'OVERSOLD';
        return 'NEUTRAL';
    }

    /**
     * Get Stochastic RSI interpretation
     */
    getStochRSIInterpretation(stochRSI) {
        if (stochRSI === null || stochRSI === undefined) return 'UNKNOWN';
        if (stochRSI >= 80) return 'OVERBOUGHT';
        if (stochRSI <= 20) return 'OVERSOLD';
        return 'NEUTRAL';
    }

    /**
     * Calculate multiple technical indicators for a symbol
     */
    async calculateAllIndicators(closePrices) {
        try {
            // Calculate all indicators
            const rsi = this.calculateRSI(closePrices);
            const stochRSI = this.calculateStochasticRSI(closePrices);
            const sma7 = this.calculateSMA(closePrices, 7);
            const sma25 = this.calculateSMA(closePrices, 25);
            const ema7 = this.calculateEMA(closePrices, 7);

            return {
                rsi: rsi !== null ? parseFloat(rsi.toFixed(2)) : null,
                rsiInterpretation: this.getRSIInterpretation(rsi),
                stochRSI: stochRSI !== null ? parseFloat(stochRSI.toFixed(2)) : null,
                stochRSIInterpretation: this.getStochRSIInterpretation(stochRSI),
                sma7: sma7 !== null ? parseFloat(sma7.toFixed(8)) : null,
                sma25: sma25 !== null ? parseFloat(sma25.toFixed(8)) : null,
                ema7: ema7 !== null ? parseFloat(ema7.toFixed(8)) : null
            };
        } catch (error) {
            console.error('Error calculating indicators:', error.message);
            return {
                rsi: null,
                rsiInterpretation: 'ERROR',
                stochRSI: null,
                stochRSIInterpretation: 'ERROR',
                sma7: null,
                sma25: null,
                ema7: null
            };
        }
    }

    /**
     * Calculate Full RSI array for all data points
     */
    calculateFullRSI(klines, period = config.RSI_PERIOD) {
        const closePrices = klines.map(k => k.close !== undefined ? k.close : k);
        const rArr = [];
        
        for (let i = 0; i < closePrices.length; i++) {
            if (i < period) {
                rArr.push(50);
                continue;
            }
            const startIdx = i - period;
            const slice = closePrices.slice(startIdx, i + 1);
            let val = this.calculateRSI(slice, period);
            rArr.push(val !== null ? val : 50);
        }
        return rArr;
    }

    /**
     * Calculate Full Stochastic RSI (returns K and D arrays)
     * Compatible with older hunter scripts' calculateStochRSI
     */
    calculateFullStochRSI(klines, rP = 14, sP = 14, kP = 3, dP = 3) {
        // Assume klines has .close, or is just numbers.
        const closePrices = klines.map(k => k.close !== undefined ? k.close : k);
        const rArr = [];
        
        // Calculate rolling RSI for each point where possible
        for (let i = 0; i < closePrices.length; i++) {
            if (i < rP) {
                rArr.push(50); // Default placeholder
                continue;
            }
            const startIdx = i - rP;
            const slice = closePrices.slice(startIdx, i + 1);
            let val = this.calculateRSI(slice, rP);
            rArr.push(val !== null ? val : 50);
        }

        let s = [];
        for (let i = 0; i < rArr.length; i++) {
            if (i < sP) {
                s.push(50);
                continue;
            }
            let w = rArr.slice(i - sP, i);
            let low = Math.min(...w), h = Math.max(...w);
            if (h === low) {
                s.push(100);
            } else {
                const safeR = Math.max(rArr[i - 1] || 50, 0.01);
                const safeL = Math.max(low, 0.01);
                const safeH = Math.max(h, 0.01);
                const logStoch = Math.log(safeR / safeL) / Math.log(safeH / safeL);
                s.push(logStoch * 100);
            }
        }

        const kData = s.map((v, i, a) => {
            if (i < kP - 1) return 50;
            return a.slice(i - kP + 1, i + 1).reduce((p, c) => p + c, 0) / kP;
        });

        const dData = kData.map((v, i, a) => {
            if (i < dP - 1) return 50;
            return a.slice(i - dP + 1, i + 1).reduce((p, c) => p + c, 0) / dP;
        });

        return { k: kData, d: dData };
    }

    /**
     * Calculate ADX
     */
    calculateADX(d, p = 14) {
        let tr = [], dmP = [], dmM = [];
        
        // Return dummy if not enough data
        if (!d || d.length <= p) return Array(d ? d.length : 0).fill(50);

        for (let i = 1; i < d.length; i++) {
            let h = d[i].high, l = d[i].low, pc = d[i - 1].close, ph = d[i - 1].high, pl = d[i - 1].low;
            tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
            dmP.push(h - ph > pl - l && h - ph > 0 ? h - ph : 0);
            dmM.push(pl - l > h - ph && pl - l > 0 ? pl - l : 0);
        }

        let smoothTR = [], smoothDMP = [], smoothDMM = [];
        let sumTR = tr.slice(0, p).reduce((a, b) => a + b, 0);
        let sumDMP = dmP.slice(0, p).reduce((a, b) => a + b, 0);
        let sumDMM = dmM.slice(0, p).reduce((a, b) => a + b, 0);
        
        smoothTR.push(sumTR); smoothDMP.push(sumDMP); smoothDMM.push(sumDMM);
        
        for (let i = p; i < tr.length; i++) {
            sumTR = sumTR - (sumTR / p) + tr[i];
            sumDMP = sumDMP - (sumDMP / p) + dmP[i];
            sumDMM = sumDMM - (sumDMM / p) + dmM[i];
            smoothTR.push(sumTR); smoothDMP.push(sumDMP); smoothDMM.push(sumDMM);
        }

        let dx = [];
        for (let i = 0; i < smoothTR.length; i++) {
            let diP = (smoothDMP[i] / smoothTR[i]) * 100, diM = (smoothDMM[i] / smoothTR[i]) * 100;
            if (diP + diM === 0) {
                dx.push(0);
            } else {
                dx.push(Math.abs(diP - diM) / (diP + diM) * 100);
            }
        }

        let adx = [dx.slice(0, p).reduce((a, b) => a + b, 0) / p];
        for (let i = p; i < dx.length; i++) {
            adx.push((adx[adx.length - 1] * (p - 1) + dx[i]) / p);
        }
        return adx;
    }

    /**
     * Calculate WaveTrend
     */
    calculateWaveTrend(klines) {
        const n1 = 10, n2 = 21;
        // ensure hlc3 exists, otherwise estimate from high/low/close
        const ap = klines.map(k => k.hlc3 !== undefined ? k.hlc3 : (k.high + k.low + k.close) / 3 || k.close);
        
        if (ap.length < n2 + 10) return { wt1: 0, wt2: 0, cross: null };
        
        const ema = (data, len) => {
            const k = 2 / (len + 1);
            let res = [data[0]];
            for (let i = 1; i < data.length; i++) res.push(data[i] * k + res[i - 1] * (1 - k));
            return res;
        };
        
        const esa  = ema(ap, n1);
        const d    = ema(ap.map((v, i) => Math.abs(v - esa[i])), n1);
        const ci   = ap.map((v, i) => (v - esa[i]) / (0.015 * d[i] || 1));
        const wt1  = ema(ci, n2);
        const wt2  = wt1.map((v, i, a) => a.slice(Math.max(0, i - 3), i + 1).reduce((s, c) => s + c, 0) / (i < 3 ? i + 1 : 4));
        
        let cross  = null;
        const last = wt1.length - 1;
        
        if (last > 0) {
            if (wt1[last - 1] < wt2[last - 1] && wt1[last] > wt2[last]) cross = 'Yükseliş 🟢';
            else if (wt1[last - 1] > wt2[last - 1] && wt1[last] < wt2[last]) cross = 'Düşüş 🔴';
        }
        
        return { wt1: wt1[last], wt2: wt2[last], cross };
    }
}

module.exports = new TechnicalService();
