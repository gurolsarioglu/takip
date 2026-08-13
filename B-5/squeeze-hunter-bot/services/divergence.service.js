const binanceFuturesService = require('./binance-futures.service');

class DivergenceService {
    /**
     * RSI Hesaplama (Wilder's Smoothing)
     */
    calculateRSI(closes, period = 14) {
        if (!closes || closes.length <= period) {
            return Array(closes ? closes.length : 0).fill(50);
        }
        let avgGain = 0;
        let avgLoss = 0;

        for (let i = 1; i <= period; i++) {
            const diff = closes[i] - closes[i - 1];
            if (diff >= 0) avgGain += diff;
            else avgLoss -= diff;
        }

        avgGain /= period;
        avgLoss /= period;

        const rsiArr = new Array(period).fill(50);
        const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsiArr.push(100 - (100 / (1 + rs0)));

        for (let i = period + 1; i < closes.length; i++) {
            const diff = closes[i] - closes[i - 1];
            const gain = diff > 0 ? diff : 0;
            const loss = diff < 0 ? -diff : 0;

            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;

            if (avgLoss === 0) {
                rsiArr.push(100);
            } else {
                const rs = avgGain / avgLoss;
                rsiArr.push(100 - (100 / (1 + rs)));
            }
        }
        return rsiArr;
    }

    /**
     * Stochastic RSI Hesaplama (%K ve %D)
     */
    calculateStochRSI(closes, rsiPeriod = 14, stochPeriod = 14, kPeriod = 3, dPeriod = 3) {
        const rsi = this.calculateRSI(closes, rsiPeriod);
        const stochRaw = [];

        for (let i = stochPeriod; i <= rsi.length; i++) {
            const window = rsi.slice(i - stochPeriod, i);
            const minRSI = Math.min(...window);
            const maxRSI = Math.max(...window);
            const currentRSI = rsi[i - 1];

            if (maxRSI === minRSI) {
                stochRaw.push(50);
            } else {
                stochRaw.push(((currentRSI - minRSI) / (maxRSI - minRSI)) * 100);
            }
        }

        // K = SMA(stochRaw, kPeriod)
        const kValues = stochRaw.map((v, i, arr) => {
            const slice = arr.slice(Math.max(0, i - kPeriod + 1), i + 1);
            return slice.reduce((a, b) => a + b, 0) / slice.length;
        });

        // D = SMA(kValues, dPeriod)
        const dValues = kValues.map((v, i, arr) => {
            const slice = arr.slice(Math.max(0, i - dPeriod + 1), i + 1);
            return slice.reduce((a, b) => a + b, 0) / slice.length;
        });

        const lastK = kValues.length ? kValues[kValues.length - 1] : 50;
        const lastD = dValues.length ? dValues[dValues.length - 1] : 50;

        return {
            k: parseFloat(lastK.toFixed(1)),
            d: parseFloat(lastD.toFixed(1)),
            kSeries: kValues,
            dSeries: dValues
        };
    }

    /**
     * WaveTrend Osilatörü (Lazydear WaveTrend)
     */
    calculateWaveTrend(klines) {
        const n1 = 10;
        const n2 = 21;
        if (!klines || klines.length < n2 + 5) {
            return { wt1: 0, wt2: 0, cross: '➖' };
        }

        const ap = klines.map(k => k.hlc3);

        const ema = (data, len) => {
            const k = 2 / (len + 1);
            const res = [data[0]];
            for (let i = 1; i < data.length; i++) {
                res.push(data[i] * k + res[i - 1] * (1 - k));
            }
            return res;
        };

        const esa = ema(ap, n1);
        const d = ema(ap.map((v, i) => Math.abs(v - esa[i])), n1);
        const ci = ap.map((v, i) => (v - esa[i]) / (0.015 * (d[i] || 1)));
        const wt1 = ema(ci, n2);
        const wt2 = wt1.map((v, i, a) => {
            const slice = a.slice(Math.max(0, i - 3), i + 1);
            return slice.reduce((s, c) => s + c, 0) / slice.length;
        });

        const last = wt1.length - 1;
        let cross = 'Nötr ➖';

        if (wt1[last - 1] <= wt2[last - 1] && wt1[last] > wt2[last]) {
            cross = 'Boğa Kesişimi 🟢';
        } else if (wt1[last - 1] >= wt2[last - 1] && wt1[last] < wt2[last]) {
            cross = 'Ayı Kesişimi 🔴';
        } else if (wt1[last] > wt2[last]) {
            cross = 'Boğa Bölgesi 🟢';
        } else {
            cross = 'Ayı Bölgesi 🔴';
        }

        return {
            wt1: parseFloat(wt1[last].toFixed(1)),
            wt2: parseFloat(wt2[last].toFixed(1)),
            cross
        };
    }

    /**
     * Pivot noktalarını tespit eder
     */
    findPivots(data, window = 2, isHigh = true) {
        const pivots = [];
        for (let i = window; i < data.length - window; i++) {
            let isPivot = true;
            for (let j = 1; j <= window; j++) {
                if (isHigh) {
                    if (data[i] <= data[i - j] || data[i] <= data[i + j]) {
                        isPivot = false;
                        break;
                    }
                } else {
                    if (data[i] >= data[i - j] || data[i] >= data[i + j]) {
                        isPivot = false;
                        break;
                    }
                }
            }
            if (isPivot) {
                pivots.push({ val: data[i], idx: i });
            }
        }
        return pivots;
    }

    /**
     * Bir mum serisinde Pozitif (Boğa) veya Negatif (Ayı) Uyumsuzluk arar
     */
    detectDivergence(klines) {
        if (!klines || klines.length < 20) return null;

        const closes = klines.map(k => k.close);
        const lows = klines.map(k => k.low);
        const highs = klines.map(k => k.high);
        const rsi = this.calculateRSI(closes, 14);

        // 1. Pozitif (Boğa) Uyumsuzluk Kontrolü (Dipler)
        const pLows = this.findPivots(lows, 2, false);
        if (pLows.length >= 2) {
            const lastPivot = pLows[pLows.length - 1];
            const prevPivot = pLows[pLows.length - 2];

            // Fiyat daha düşük veya eşit dip yaparken, RSI daha yüksek dip yapıyorsa
            if (lastPivot.val <= prevPivot.val * 1.02 && rsi[lastPivot.idx] > rsi[prevPivot.idx] && rsi[lastPivot.idx] < 55) {
                return {
                    hasDivergence: true,
                    type: 'BULLISH',
                    title: 'Pozitif Uyumsuzluk (Boğa) 🟢',
                    rsiLast: Math.round(rsi[lastPivot.idx]),
                    rsiPrev: Math.round(rsi[prevPivot.idx]),
                    priceLast: lastPivot.val,
                    pricePrev: prevPivot.val
                };
            }
        }

        // 2. Negatif (Ayı) Uyumsuzluk Kontrolü (Tepeler)
        const pHighs = this.findPivots(highs, 2, true);
        if (pHighs.length >= 2) {
            const lastHigh = pHighs[pHighs.length - 1];
            const prevHigh = pHighs[pHighs.length - 2];

            // Fiyat daha yüksek tepe yaparken, RSI daha düşük tepe yapıyorsa
            if (lastHigh.val >= prevHigh.val * 0.98 && rsi[lastHigh.idx] < rsi[prevHigh.idx] && rsi[lastHigh.idx] > 60) {
                return {
                    hasDivergence: true,
                    type: 'BEARISH',
                    title: 'Negatif Uyumsuzluk (Ayı) 🔴',
                    rsiLast: Math.round(rsi[lastHigh.idx]),
                    rsiPrev: Math.round(rsi[prevHigh.idx]),
                    priceLast: lastHigh.val,
                    pricePrev: prevHigh.val
                };
            }
        }

        return null;
    }

    /**
     * Çoklu Zaman Dilimli Teknik Analiz ve Pozitif Uyumsuzluk Taraması
     * 1W -> (Yetersizse 1D veya 4H) -> 4H -> 15m -> 5m
     */
    async analyzeMultiTimeframe(symbol) {
        try {
            const [k1w, k1d, k4h, k15m, k5m] = await Promise.all([
                binanceFuturesService.getKlines(symbol, '1w', 50),
                binanceFuturesService.getKlines(symbol, '1d', 60),
                binanceFuturesService.getKlines(symbol, '4h', 60),
                binanceFuturesService.getKlines(symbol, '15m', 60),
                binanceFuturesService.getKlines(symbol, '5m', 60)
            ]);

            // Macro Uyumsuzluk Kontrolü (1W -> 1D -> 4H Fallback)
            let macroDivergence = null;
            let macroTimeframe = '1W';

            if (k1w.length >= 15) {
                macroDivergence = this.detectDivergence(k1w);
                macroTimeframe = '1W (Haftalık)';
            }

            if (!macroDivergence && k1d.length >= 20) {
                macroDivergence = this.detectDivergence(k1d);
                if (macroDivergence) macroTimeframe = '1D (Günlük)';
            }

            if (!macroDivergence && k4h.length >= 20) {
                macroDivergence = this.detectDivergence(k4h);
                if (macroDivergence) macroTimeframe = '4H (4-Saatlik)';
            }

            // İndikatör Hesaplamaları
            const rsi1w = k1w.length ? this.calculateRSI(k1w.map(k => k.close), 14) : [50];
            const rsi4h = k4h.length ? this.calculateRSI(k4h.map(k => k.close), 14) : [50];
            const rsi15m = k15m.length ? this.calculateRSI(k15m.map(k => k.close), 14) : [50];
            const rsi5m = k5m.length ? this.calculateRSI(k5m.map(k => k.close), 14) : [50];

            const stoch4h = this.calculateStochRSI(k4h.map(k => k.close));
            const stoch15m = this.calculateStochRSI(k15m.map(k => k.close));
            const stoch5m = this.calculateStochRSI(k5m.map(k => k.close));

            const wt15m = this.calculateWaveTrend(k15m);
            const wt5m = this.calculateWaveTrend(k5m);

            // 5dk Hacim Artış Oranı (Son 5m mumu vs önceki 10 mum ortalaması)
            let volumeSpike5mRatio = 1.0;
            if (k5m.length >= 6) {
                const latestVol = k5m[k5m.length - 1].quoteVolume || k5m[k5m.length - 1].volume;
                const prevVolumes = k5m.slice(k5m.length - 11, k5m.length - 1).map(k => k.quoteVolume || k.volume);
                const avgVol = prevVolumes.reduce((a, b) => a + b, 0) / (prevVolumes.length || 1);
                if (avgVol > 0) {
                    volumeSpike5mRatio = parseFloat((latestVol / avgVol).toFixed(2));
                }
            }

            return {
                macroDivergence,
                macroTimeframe,
                hasPositiveDivergence: macroDivergence && macroDivergence.type === 'BULLISH',
                indicators: {
                    rsi1w: Math.round(rsi1w[rsi1w.length - 1]),
                    rsi4h: Math.round(rsi4h[rsi4h.length - 1]),
                    rsi15m: Math.round(rsi15m[rsi15m.length - 1]),
                    rsi5m: Math.round(rsi5m[rsi5m.length - 1]),
                    stoch4h,
                    stoch15m,
                    stoch5m,
                    wt15m,
                    wt5m,
                    volumeSpike5mRatio
                }
            };
        } catch (error) {
            console.error(`Teknik analiz hatası (${symbol}):`, error.message);
            return {
                macroDivergence: null,
                macroTimeframe: '1W',
                hasPositiveDivergence: false,
                indicators: {
                    rsi1w: 50,
                    rsi4h: 50,
                    rsi15m: 50,
                    rsi5m: 50,
                    stoch4h: { k: 50, d: 50 },
                    stoch15m: { k: 50, d: 50 },
                    stoch5m: { k: 50, d: 50 },
                    wt15m: { cross: '➖' },
                    wt5m: { cross: '➖' },
                    volumeSpike5mRatio: 1.0
                }
            };
        }
    }
}

module.exports = new DivergenceService();
