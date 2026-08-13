const axios = require('axios');
const binanceService = require('./binance.service');
const technicalService = require('./technical.service');

class DetayScanService {
    /**
     * Find swing lows in price data
     */
    findSwingLows(klines, lookback = 3) {
        const swings = [];
        for (let i = lookback; i < klines.length - lookback; i++) {
            let isSwingLow = true;
            for (let j = 1; j <= lookback; j++) {
                if (klines[i].low >= klines[i - j].low || klines[i].low >= klines[i + j].low) {
                    isSwingLow = false;
                    break;
                }
            }
            if (isSwingLow) {
                swings.push({ index: i, price: klines[i].low, close: klines[i].close, time: klines[i].openTime });
            }
        }
        return swings;
    }

    /**
     * Find swing highs in price data
     */
    findSwingHighs(klines, lookback = 3) {
        const swings = [];
        for (let i = lookback; i < klines.length - lookback; i++) {
            let isSwingHigh = true;
            for (let j = 1; j <= lookback; j++) {
                if (klines[i].high <= klines[i - j].high || klines[i].high <= klines[i + j].high) {
                    isSwingHigh = false;
                    break;
                }
            }
            if (isSwingHigh) {
                swings.push({ index: i, price: klines[i].high, close: klines[i].close, time: klines[i].openTime });
            }
        }
        return swings;
    }

    /**
     * Detect RSI divergence on daily klines
     */
    detectDailyDivergence(klines1d, rsiArray) {
        if (klines1d.length < 15 || rsiArray.length < 15) return null;

        const recentCount = Math.min(60, klines1d.length);
        const recentKlines = klines1d.slice(-recentCount);
        const recentRSI = rsiArray.slice(-recentCount);

        const lookbacks = [2, 3, 5];
        let allBullish = [];
        let allBearish = [];

        for (const lb of lookbacks) {
            // Bullish Divergence
            const swingLows = this.findSwingLows(recentKlines, lb);
            for (let i = 0; i < swingLows.length; i++) {
                for (let j = i + 1; j < swingLows.length; j++) {
                    const prev = swingLows[i];
                    const last = swingLows[j];
                    const prevRSI = recentRSI[prev.index];
                    const lastRSI = recentRSI[last.index];

                    if (last.price < prev.price && lastRSI > prevRSI && lastRSI < 50) {
                        const startDateStr = new Date(prev.time).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        allBullish.push({
                            type: 'bullish',
                            startDate: startDateStr,
                            dateRange: `${startDateStr} ➔ GÜNCEL`,
                            startTimestamp: prev.time,
                            endTimestamp: last.time,
                            description: 'Fiyat düşerken RSI yükseliyor → Dipten Dönüş Potansiyeli',
                            priceDiff: `${prev.price.toFixed(4)} → ${last.price.toFixed(4)} (↓)`,
                            rsiDiff: `${prevRSI.toFixed(1)} → ${lastRSI.toFixed(1)} (↑)`,
                            score: (last.index / recentCount) + Math.abs(lastRSI - prevRSI) / 100
                        });
                    }
                }
            }

            // Bearish Divergence
            const swingHighs = this.findSwingHighs(recentKlines, lb);
            for (let i = 0; i < swingHighs.length; i++) {
                for (let j = i + 1; j < swingHighs.length; j++) {
                    const prev = swingHighs[i];
                    const last = swingHighs[j];
                    const prevRSI = recentRSI[prev.index];
                    const lastRSI = recentRSI[last.index];

                    if (last.price > prev.price && lastRSI < prevRSI && lastRSI > 50) {
                        const startDateStr = new Date(prev.time).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        allBearish.push({
                            type: 'bearish',
                            startDate: startDateStr,
                            dateRange: `${startDateStr} ➔ GÜNCEL`,
                            startTimestamp: prev.time,
                            endTimestamp: last.time,
                            description: 'Fiyat yükselirken RSI düşüyor → Zirveden Düşüş Potansiyeli',
                            priceDiff: `${prev.price.toFixed(4)} → ${last.price.toFixed(4)} (↑)`,
                            rsiDiff: `${prevRSI.toFixed(1)} → ${lastRSI.toFixed(1)} (↓)`,
                            score: (last.index / recentCount) + Math.abs(lastRSI - prevRSI) / 100
                        });
                    }
                }
            }
        }

        const dedup = (arr) => {
            const seen = new Set();
            return arr.filter(d => {
                const key = `${d.startTimestamp}_${d.endTimestamp}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        };

        allBullish = dedup(allBullish);
        allBearish = dedup(allBearish);

        const allDivergences = [...allBullish, ...allBearish];
        if (allDivergences.length === 0) return null;

        allDivergences.sort((a, b) => b.score - a.score);
        const best = allDivergences[0];
        delete best.score;
        return best;
    }

    /**
     * Calculate Simple Moving Average of an array
     */
    calculateSMA(values, period = 14) {
        const sma = [];
        for (let i = 0; i < values.length; i++) {
            if (i < period - 1) {
                sma.push(null);
                continue;
            }
            const slice = values.slice(i - period + 1, i + 1);
            const sum = slice.reduce((a, b) => a + b, 0);
            sma.push(sum / period);
        }
        return sma;
    }

    /**
     * Perform screening across all active USDT Futures symbols
     */
    async performScan(progressCallback = null) {
        try {
            console.log('🏁 Detay Tarama Başlıyor (1G)...');
            
            // 1. Fetch active futures symbols
            const res = await axios.get('https://fapi.binance.com/fapi/v1/exchangeInfo');
            const symbols = res.data.symbols
                .filter(s => s.quoteAsset === 'USDT' && s.status === 'TRADING' && s.contractType === 'PERPETUAL')
                .map(s => s.symbol);

            console.log(`🔍 Toplam ${symbols.length} Futures çifti taranacak.`);
            const matches = [];
            let scannedCount = 0;

            // 2. Fetch daily klines in batches to stay within rate limits and achieve high performance
            const batchSize = 15;
            for (let i = 0; i < symbols.length; i += batchSize) {
                const batch = symbols.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (symbol) => {
                    try {
                        // Fetch 1D klines
                        const klinesRes = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1d&limit=100`);
                        const klines = klinesRes.data.map(k => ({
                            openTime: parseInt(k[0]),
                            open: parseFloat(k[1]),
                            high: parseFloat(k[2]),
                            low: parseFloat(k[3]),
                            close: parseFloat(k[4]),
                            volume: parseFloat(k[5])
                        }));

                        if (klines.length < 35) return;

                        // Calculate 14-period RSI
                        const rsiArray = technicalService.calculateFullRSI(klines, 14);
                        // Calculate 14-period SMA of RSI
                        const rsiSmaArray = this.calculateSMA(rsiArray, 14);

                        const lastIdx = klines.length - 1;
                        const currentCandle = klines[lastIdx];
                        const prevCandle = klines[lastIdx - 1];

                        const currentRsi = rsiArray[lastIdx];
                        const currentRsiSma = rsiSmaArray[lastIdx];

                        // Crossover detection checks (within last 3 candles)
                        let isBullishCross = false;
                        let isBearishCross = false;

                        // Check for recent Bullish Crossover (RSI crosses above RSI-SMA)
                        if (currentRsi > currentRsiSma) {
                            for (let d = 1; d <= 3; d++) {
                                const checkIdx = lastIdx - d;
                                if (checkIdx >= 0 && rsiArray[checkIdx] <= rsiSmaArray[checkIdx]) {
                                    isBullishCross = true;
                                    break;
                                }
                            }
                        }

                        // Check for recent Bearish Crossover (RSI crosses below RSI-SMA)
                        if (currentRsi < currentRsiSma) {
                            for (let d = 1; d <= 3; d++) {
                                const checkIdx = lastIdx - d;
                                if (checkIdx >= 0 && rsiArray[checkIdx] >= rsiSmaArray[checkIdx]) {
                                    isBearishCross = true;
                                    break;
                                }
                            }
                        }

                        // Determine if oversold / overbought zones were active during crossover
                        const isOversoldZone = currentRsi <= 35 || rsiArray[lastIdx - 1] <= 30 || rsiArray[lastIdx - 2] <= 30;
                        const isOverboughtZone = currentRsi >= 65 || rsiArray[lastIdx - 1] >= 70 || rsiArray[lastIdx - 2] >= 70;

                        const isCandleGreen = currentCandle.close > currentCandle.open;
                        const isCandleRed = currentCandle.close < currentCandle.open;

                        // Check if conditions match
                        let signalType = null;
                        if (isBullishCross && isOversoldZone && isCandleGreen) {
                            signalType = 'Long';
                        } else if (isBearishCross && isOverboughtZone && isCandleRed) {
                            signalType = 'Short';
                        }

                        if (signalType) {
                            // Run divergence detection
                            const divergence = this.detectDailyDivergence(klines, rsiArray);

                            // Divergence validation filter
                            // Ensure divergence type matches signal direction
                            const hasMatchingDivergence = divergence && (
                                (signalType === 'Long' && divergence.type === 'bullish') ||
                                (signalType === 'Short' && divergence.type === 'bearish')
                            );

                            const score = hasMatchingDivergence ? 3 : 1; // 3 stars if divergence also matches, otherwise 1 star

                            const dailyChange = ((currentCandle.close - prevCandle.close) / prevCandle.close * 100).toFixed(2);

                            matches.push({
                                symbol,
                                price: currentCandle.close,
                                rsi: Math.round(currentRsi),
                                rsiSma: Math.round(currentRsiSma),
                                signalType,
                                isGreen: isCandleGreen,
                                dailyChange,
                                divergence: hasMatchingDivergence ? divergence : null,
                                score
                            });
                        }
                    } catch (err) {
                        // Ignore individual coin error to continue scan
                    }
                }));

                scannedCount += batch.length;
                if (progressCallback) {
                    progressCallback(scannedCount, symbols.length);
                }

                // Small delay to prevent network strain
                await new Promise(r => setTimeout(r, 60));
            }

            // Sort matches: higher scores first, then by alphabetical symbol
            matches.sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol));

            console.log(`✅ Detay Tarama Bitti. Toplam Eşleşen Coin: ${matches.length}`);
            return matches;
        } catch (e) {
            console.error('Detay Tarama hatası:', e.message);
            throw e;
        }
    }
}

module.exports = new DetayScanService();
