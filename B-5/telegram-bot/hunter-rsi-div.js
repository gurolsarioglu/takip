const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const technicalService = require('../backend/services/technical.service');

// Load config
dotenv.config({ path: path.join(__dirname, '.env') });

const processedSignals = new Map();
const COOLDOWN_PERIOD = 12 * 60 * 60 * 1000; // 12 hours cooldown
const TIMEFRAME = '4h';

console.log('🔍 RSI Uyumsuzluk Tarayıcı (4 Saatlik) Aktif!');

let activeTradingPairs = new Set();

async function loadActiveTradingPairs() {
    try {
        console.log('🔄 Exchange Info yüklüyor (RSI-Div)...');
        const res = await axios.get('https://api.binance.com/api/v3/exchangeInfo');
        const tradingPairs = res.data.symbols
            .filter(s => s.status === 'TRADING' && s.symbol.endsWith('USDT'))
            .filter(s => {
                const symbol = s.symbol;
                return !symbol.includes('BULL') && !symbol.includes('BEAR') &&
                    !symbol.includes('UP') && !symbol.includes('DOWN');
            })
            .map(s => s.symbol);

        activeTradingPairs = new Set(tradingPairs);
        console.log(`✅ ${activeTradingPairs.size} aktif USDT çifti yüklendi (RSI-Div)`);
    } catch (e) {
        console.error('❌ Exchange Info yüklenemedi:', e.message);
    }
}

async function getFuturesSymbols() {
    try {
        const res = await axios.get('https://fapi.binance.com/fapi/v1/exchangeInfo');
        return res.data.symbols
            .filter(s => s.quoteAsset === 'USDT' && s.status === 'TRADING' && s.contractType === 'PERPETUAL')
            .filter(s => activeTradingPairs.has(s.symbol))
            .map(s => s.symbol);
    } catch (e) {
        console.error('Sembol listesi alınamadı:', e.message);
        return [];
    }
}

// ========== Divergence Detection on Daily Chart ==========

/**
 * Find swing lows in price data (local minimums)
 * A swing low is a candle whose low is lower than the N candles on each side
 */
function findSwingLows(klines, lookback = 3) {
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
 * Find swing highs in price data (local maximums)
 */
function findSwingHighs(klines, lookback = 3) {
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
 * Detect RSI divergence on daily klines using multi-lookback swing analysis.
 * Tries lookback values 2, 3, and 5 to find both detailed and broad patterns.
 * Checks ALL pairs of swing points (not just the last two).
 * Returns: { type: 'bullish'|'bearish', startDate, description } or null
 */
function detectDailyDivergence(klines1d, rsiArray) {
    if (klines1d.length < 15 || rsiArray.length < 15) return null;

    // Use last 60 candles (~2 months) for wider divergence detection
    const recentCount = Math.min(60, klines1d.length);
    const recentKlines = klines1d.slice(-recentCount);
    const recentRSI = rsiArray.slice(-recentCount);

    const lookbacks = [2, 3, 5]; // Multiple scales for swing detection
    let allBullish = [];
    let allBearish = [];

    for (const lb of lookbacks) {
        // --- Bullish Divergence: Price lower lows, RSI higher lows ---
        const swingLows = findSwingLows(recentKlines, lb);
        for (let i = 0; i < swingLows.length; i++) {
            for (let j = i + 1; j < swingLows.length; j++) {
                const prev = swingLows[i];
                const last = swingLows[j];
                const prevRSI = recentRSI[prev.index];
                const lastRSI = recentRSI[last.index];

                // Price makes lower low but RSI makes higher low
                if (last.price < prev.price && lastRSI > prevRSI && lastRSI < 50) {
                    const startDateStr = new Date(prev.time).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    allBullish.push({
                        type: 'bullish',
                        startDate: startDateStr,
                        dateRange: `${startDateStr} ➔ GÜNCEL`,
                        startTimestamp: prev.time,
                        endTimestamp: last.time,
                        description: `Fiyat düşerken RSI yükseliyor → Potansiyel yukarı atılım (MEVCUT DURUM)`,
                        priceDiff: `${prev.price.toFixed(4)} → ${last.price.toFixed(4)} (↓)`,
                        rsiDiff: `${prevRSI.toFixed(1)} → ${lastRSI.toFixed(1)} (↑)`,
                        // Score: recency + RSI difference magnitude
                        score: (last.index / recentCount) + Math.abs(lastRSI - prevRSI) / 100
                    });
                }
            }
        }

        // --- Bearish Divergence: Price higher highs, RSI lower highs ---
        const swingHighs = findSwingHighs(recentKlines, lb);
        for (let i = 0; i < swingHighs.length; i++) {
            for (let j = i + 1; j < swingHighs.length; j++) {
                const prev = swingHighs[i];
                const last = swingHighs[j];
                const prevRSI = recentRSI[prev.index];
                const lastRSI = recentRSI[last.index];

                // Price makes higher high but RSI makes lower high
                if (last.price > prev.price && lastRSI < prevRSI && lastRSI > 50) {
                    const startDateStr = new Date(prev.time).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    allBearish.push({
                        type: 'bearish',
                        startDate: startDateStr,
                        dateRange: `${startDateStr} ➔ GÜNCEL`,
                        startTimestamp: prev.time,
                        endTimestamp: last.time,
                        description: `Fiyat yükselirken RSI düşüyor → Potansiyel aşağı kırılım (MEVCUT DURUM)`,
                        priceDiff: `${prev.price.toFixed(4)} → ${last.price.toFixed(4)} (↑)`,
                        rsiDiff: `${prevRSI.toFixed(1)} → ${lastRSI.toFixed(1)} (↓)`,
                        score: (last.index / recentCount) + Math.abs(lastRSI - prevRSI) / 100
                    });
                }
            }
        }
    }

    // Deduplicate: keep unique by startTimestamp
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

    // Pick the best divergence by score (recency + magnitude)
    const allDivergences = [...allBullish, ...allBearish];
    if (allDivergences.length === 0) return null;

    allDivergences.sort((a, b) => b.score - a.score);
    const best = allDivergences[0];
    delete best.score; // Remove internal scoring field
    return best;
}

// ========== Multi-Period Daily RSI ==========

/**
 * Get 1D RSI for a specific number of recent candles
 * periodDays: 3, 5, or 7 (just the "window" concept — we still use 14-period RSI,
 * but report the RSI value N candles ago vs now to show the trend)
 */
async function getDailyKlinesAndRSI(symbol) {
    try {
        const res = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1d&limit=100`);
        const klines = res.data.map(k => ({
            openTime: parseInt(k[0]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
        }));

        // Remove last open candle for consistency
        klines.pop();

        if (klines.length < 20) return null;

        const rsiArray = technicalService.calculateFullRSI(klines, 14);

        // Current RSI = son kapanmış mumun RSI'ı
        const currentRSI = Math.round(rsiArray[rsiArray.length - 1]);
        // 3 gün önceki RSI
        const rsi3d = Math.round(rsiArray[rsiArray.length - 3] || currentRSI);
        // 5 gün önceki RSI
        const rsi5d = Math.round(rsiArray[rsiArray.length - 5] || currentRSI);
        // 1 hafta önceki RSI
        const rsi7d = Math.round(rsiArray[rsiArray.length - 7] || currentRSI);

        // Detect divergence on daily chart
        const divergence = detectDailyDivergence(klines, rsiArray);

        return {
            currentRSI,
            rsi3d,
            rsi5d,
            rsi7d,
            divergence,
            klines
        };
    } catch (e) {
        console.error(`1D veri alınamadı (${symbol}):`, e.message);
        return null;
    }
}

// ========== RSI Star Rating ==========

function getRSIStars(rsi, type) {
    if (type === 'buy') {
        if (rsi <= 20) return '⭐⭐⭐';
        if (rsi <= 25) return '⭐⭐';
        if (rsi <= 30) return '⭐';
    } else {
        if (rsi >= 90) return '⭐⭐⭐';
        if (rsi >= 80) return '⭐⭐';
        if (rsi >= 70) return '⭐';
    }
    return '';
}

/**
 * Get simple ! warning for RSI levels (used for MTF values)
 */
function getRSIWarning(rsi) {
    if (rsi <= 30 || rsi >= 70) return '❗';
    return '';
}

// ========== Main Scan Logic ==========

let lowestRSI = [];
let highestRSI = [];

async function performScan() {
    lowestRSI = [];
    highestRSI = [];

    try {
        console.log(`\n🔍 [${new Date().toLocaleTimeString()}] RSI Uyumsuzluk Taraması Başlıyor...`);
        const symbols = await getFuturesSymbols();
        console.log(`📈 Toplam ${symbols.length} aktif Futures çifti taranacak.`);

        for (const symbol of symbols) {
            await checkCoin(symbol);
            await new Promise(r => setTimeout(r, 80)); // Rate limiting
        }

        // Sort and Log Summary
        lowestRSI.sort((a, b) => a.rsi - b.rsi);
        highestRSI.sort((a, b) => b.rsi - a.rsi);

        console.log(`✅ [${new Date().toLocaleTimeString()}] RSI Uyumsuzluk Taraması Tamamlandı.`);

        console.log('\n📉 EN DÜŞÜK 4H RSI:');
        lowestRSI.slice(0, 5).forEach(c => console.log(`   #${c.symbol}: ${c.rsi.toFixed(2)}`));

        console.log('\n📈 EN YÜKSEK 4H RSI:');
        highestRSI.slice(0, 5).forEach(c => console.log(`   #${c.symbol}: ${c.rsi.toFixed(2)}`));
        console.log('--------------------------------------------------\n');

    } catch (e) {
        console.error('Tarama Hatası:', e.message);
    }
}

async function checkCoin(symbol) {
    try {
        // Get 4H klines
        const res = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${TIMEFRAME}&limit=500`);
        let klines = res.data.map(k => ({
            close: parseFloat(k[4])
        }));

        // Remove last open candle
        klines.pop();

        if (klines.length < 50) return false;

        const rsi = technicalService.calculateFullRSI(klines, 14);
        const lastRsi = rsi[rsi.length - 1];
        const roundedRsi = Math.round(lastRsi);
        const price = klines[klines.length - 1].close;

        // Track for summary
        lowestRSI.push({ symbol, rsi: lastRsi });
        highestRSI.push({ symbol, rsi: lastRsi });

        // Signal criteria: RSI <= 30 (Buy) or RSI >= 70 (Sell)
        let signalType = null;
        let sideType = null;

        if (roundedRsi <= 30) {
            signalType = 'Buy 🟢';
            sideType = 'buy';
        } else if (roundedRsi >= 70) {
            signalType = 'Sell 🔴';
            sideType = 'sell';
        }

        if (!signalType) return false;

        const key = `${symbol}_${signalType}`;
        if (processedSignals.has(key) && (Date.now() - processedSignals.get(key) < COOLDOWN_PERIOD)) {
            return false;
        }
        processedSignals.set(key, Date.now());

        // Get daily data: multi-period RSI + divergence
        const dailyData = await getDailyKlinesAndRSI(symbol);

        const rsiStars = getRSIStars(roundedRsi, sideType);

        await sendAlert(symbol, signalType, sideType, price, roundedRsi, rsiStars, dailyData);
        return true;

    } catch (e) {
        return false;
    }
}

// ========== Alert Sender ==========

async function sendAlert(symbol, type, side, price, rsi, stars, dailyData) {
    const cleanSymbol = symbol.replace('USDT', '');
    const direction = side === 'buy' ? 'LONG (AL)' : 'SHORT (SAT)';
    const trendEmoji = side === 'buy' ? '🟢 🟢 🟢' : '🔴 🔴 🔴';
    const binanceUrl = `https://www.binance.com/en/futures/${symbol}`;

    let dailySection = '';
    let divSection = '';

    if (dailyData) {
        dailySection =
            `\n── 1G Grafik RSI Değerleri ──\n` +
            `• 3 Günlük RSI: ${dailyData.rsi3d} ${getRSIWarning(dailyData.rsi3d)}\n` +
            `• 5 Günlük RSI: ${dailyData.rsi5d} ${getRSIWarning(dailyData.rsi5d)}\n` +
            `• 1 Haftalık RSI: ${dailyData.rsi7d} ${getRSIWarning(dailyData.rsi7d)}\n` +
            `• Güncel 1G RSI: ${dailyData.currentRSI} ${getRSIWarning(dailyData.currentRSI)}\n`;

        if (dailyData.divergence) {
            const div = dailyData.divergence;
            const divEmoji = div.type === 'bullish' ? '🟢' : '🔴';
            const divLabel = div.type === 'bullish' ? 'BULLISH UYUMSUZLUK' : 'BEARISH UYUMSUZLUK';
            divSection =
                `\n── Uyumsuzluk Tespiti ──\n` +
                `${divEmoji} ${divLabel} TESPİT EDİLDİ!\n` +
                `Dönem: ${div.dateRange}\n` +
                `Fiyat: ${div.priceDiff}\n` +
                `RSI: ${div.rsiDiff}\n` +
                `Durum: ${div.description}\n`;
        }
    }

    const message =
        `\n${trendEmoji}\n` +
        `*🔍 RSI UYUMSUZLUK TARAYICI (4H)*\n` +
        `\n` +
        `#${cleanSymbol}  ➡️  *${direction}*\n` +
        `Fiyat: *${price.toFixed(4)}*\n` +
        `\n` +
        `📊 *4H RSI:* ${rsi} ${stars}\n` +
        dailySection +
        divSection +
        `\n🔗 [BINANCE'DE GÖR](${binanceUrl})`;

    console.log(`📡 [RSI-Div Signal] ${symbol} ${type.toUpperCase()} @ ${price.toFixed(4)} | RSI:${rsi} ${stars}`);
    if (dailyData && dailyData.divergence) {
        console.log(`   ⚡ ${dailyData.divergence.type.toUpperCase()} UYUMSUZLUK - Başlangıç: ${dailyData.divergence.startDate}`);
    }

    // Broadcast to Local Web Dashboard via REST API
    try {
        const signalData = {
            timeframe: 'rsi-div',
            coin: symbol,
            date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }),
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            position: side === 'buy' ? 'Long' : 'Short',
            price,
            rsi,
            rsiWarning: stars,
            // Daily RSI multi-period
            rsi3d: dailyData ? dailyData.rsi3d : 'N/A',
            rsi5d: dailyData ? dailyData.rsi5d : 'N/A',
            rsi7d: dailyData ? dailyData.rsi7d : 'N/A',
            rsi1d: dailyData ? dailyData.currentRSI : 'N/A',
            // Divergence data
            divergence: dailyData && dailyData.divergence ? {
                type: dailyData.divergence.type,
                startDate: dailyData.divergence.startDate,
                dateRange: dailyData.divergence.dateRange,
                description: dailyData.divergence.description,
                priceDiff: dailyData.divergence.priceDiff,
                rsiDiff: dailyData.divergence.rsiDiff
            } : null
        };
        await axios.post('http://localhost:3000/api/signals/emit', signalData);
    } catch (err) {
        console.error('Failed to emit RSI-Div signal to dashboard:', err.message);
    }
}

// ========== Scheduler ==========

function scheduleNextScan() {
    const now = Date.now();
    const intervalMs = 4 * 60 * 60 * 1000;
    const nextScan = Math.ceil(now / intervalMs) * intervalMs;
    const delay = nextScan - now + 5000; // 5s after candle close
    console.log(`⏰ Bir sonraki RSI-Div taraması ${new Date(nextScan).toLocaleTimeString()} saatinde yapılacak.`);
    setTimeout(async () => {
        await performScan();
        scheduleNextScan();
    }, delay);
}

async function init() {
    await loadActiveTradingPairs();
    scheduleNextScan();
    await performScan();
}

init();
