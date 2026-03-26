const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const technicalService = require('../backend/services/technical.service');

// Load config
dotenv.config({ path: path.join(__dirname, '.env') });

const processedSignals = new Map();
const COOLDOWN_PERIOD = 3 * 60 * 1000; // Cooldown for signals (3 minutes)
const TIMEFRAME = '1m';

console.log('⚡ HUMMER NEW Bot (1dk & Futures) Aktif! (Tam Resim Formatı)');

/**
 * Fetch all active USDT Futures symbols
 */
async function getFuturesSymbols() {
    try {
        const res = await axios.get('https://fapi.binance.com/fapi/v1/exchangeInfo');
        return res.data.symbols
            .filter(s => s.quoteAsset === 'USDT' && s.status === 'TRADING' && s.contractType === 'PERPETUAL')
            .map(s => s.symbol);
    } catch (e) {
        console.error('Sembol listesi alınamadı:', e.message);
        return [];
    }
}

async function performScan() {
    try {
        console.log(`🔍 [${new Date().toLocaleTimeString()}] Hummer New Taraması Başlıyor...`);
        const symbols = await getFuturesSymbols();

        for (const symbol of symbols) {
            await checkCoin(symbol);
            await new Promise(r => setTimeout(r, 60)); // API throttle guard
        }
        console.log(`✅ [${new Date().toLocaleTimeString()}] Hummer New Tarama Tamamlandı.`);
    } catch (e) {
        console.error('Tarama Hatası:', e.message);
    }
}

async function checkCoin(symbol) {
    try {
        const detail1m = await getMTFDetail(symbol, '1m');
        if (!detail1m) return false;

        const { rsi: lastRsi, stochK: lastK, stochD: lastD, price, prevPrice, volume, prevVolume } = detail1m;
        const boost = prevPrice ? ((price - prevPrice) / prevPrice * 100).toFixed(2) : '0.00';
        const volBoost = prevVolume ? ((volume - prevVolume) / prevVolume * 100).toFixed(2) : '0.00';

        let signalType = null;

        // HUMMER NEW CRITERIA: Focused on Extremely low/high RSI
        if (lastRsi <= 25) signalType = 'Buy 🟢';
        else if (lastRsi >= 75) signalType = 'Sell 🔴';

        if (signalType) {
            const key = `${symbol}_${signalType}`;
            if (!processedSignals.has(key) || (Date.now() - processedSignals.get(key) > COOLDOWN_PERIOD)) {
                processedSignals.set(key, Date.now());

                const detail5m = await getMTFDetail(symbol, '5m');
                const detail1h = await getMTFDetail(symbol, '1h');

                // Determine Stars (Volatility)
                const absBoost = Math.abs(parseFloat(boost));
                let starsCount = Math.floor(absBoost);
                if (starsCount < 1) starsCount = 1; // Minimum 1 star if there's a signal
                if (starsCount > 5) starsCount = 5;
                const starsStr = '⭐'.repeat(starsCount);

                const binanceService = require('../backend/services/binance.service');
                const supplyData = await binanceService.getSupplyData(symbol);
                let supplyStr = 'Bilinmiyor';
                if (supplyData) {
                    supplyStr = `%${supplyData.ratio}` + (supplyData.isMax ? ' !!!' : '');
                }

                await sendAlert(symbol, signalType, boost, price, prevPrice, volBoost, starsStr, detail1m, detail5m, detail1h, supplyStr);
                return true;
            }
        }
    } catch (e) { return false; }
}

async function getMTFDetail(symbol, interval) {
    try {
        const res = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=50`);
        const klines = res.data.map(k => ({
            high:   parseFloat(k[2]),
            low:    parseFloat(k[3]),
            close:  parseFloat(k[4]),
            volume: parseFloat(k[5])
        }));
        if (klines.length < 50) return null;

        const rsiArr   = technicalService.calculateFullRSI(klines, 14);
        const stoch    = technicalService.calculateFullStochRSI(klines, 14, 14, 3, 3);
        
        const lastRsi  = rsiArr[rsiArr.length - 1];
        const lastK = stoch.k[stoch.k.length - 1];
        const lastD = stoch.d[stoch.d.length - 1];
        
        const price = klines[klines.length - 1].close;
        const prevPrice = klines[klines.length - 2].close;
        const volume = klines[klines.length - 1].volume;
        const prevVolume = klines[klines.length - 2].volume;

        return {
            rsi: parseFloat(lastRsi.toFixed(2)),
            stochK: Math.round(lastK),
            stochD: Math.round(lastD),
            price,
            prevPrice,
            volume,
            prevVolume
        };
    } catch (e) { return null; }
}

function assignAlerts(detail, isShort) {
    if (!detail) return { rsiAlert: '', stochAlert: '' };
    let rsiAlert = '';
    let stochAlert = '';

    // RSI Alerts
    if (isShort) {
        if (detail.rsi >= 75) rsiAlert = '❗';
        else if (detail.rsi >= 70) rsiAlert = '⚠️';
    } else {
        if (detail.rsi <= 25) rsiAlert = '❗';
        else if (detail.rsi <= 30) rsiAlert = '⚠️';
    }

    // StochRSI Alerts
    if (isShort) {
        if (detail.stochK >= 90) stochAlert = '❗';
        else if (detail.stochK >= 80) stochAlert = '⚠️';
    } else {
        if (detail.stochK <= 10) stochAlert = '❗';
        else if (detail.stochK <= 20) stochAlert = '⚠️';
    }
    return { rsiAlert, stochAlert };
}

async function sendAlert(symbol, type, boost, price, prev, volBoost, starsStr, detail1m, detail5m, detail1h, supplyStr = 'Bilinmiyor') {
    console.log(`📡 [Hummer New Signal] ${symbol} ${type.toUpperCase()} @ ${price.toFixed(4)}`);
    const isShort = type.includes('Sell');
    
    // Process Alerts
    const alerts1m = assignAlerts(detail1m, isShort);
    const alerts5m = assignAlerts(detail5m, isShort);
    const alerts1h = assignAlerts(detail1h, isShort);

    try {
        const signalData = {
            timeframe: 'hammer-new',
            coin: symbol,
            date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }),
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            position: isShort ? 'Short' : 'Long',
            starsStr,
            price: price.toFixed(4),
            prevPrice: prev.toFixed(4),
            boost,
            volBoost,
            
            d1m: { rsi: detail1m.rsi, k: detail1m.stochK, d: detail1m.stochD, rsiAlert: alerts1m.rsiAlert, stochAlert: alerts1m.stochAlert },
            d5m: detail5m ? { rsi: detail5m.rsi, k: detail5m.stochK, d: detail5m.stochD, rsiAlert: alerts5m.rsiAlert, stochAlert: alerts5m.stochAlert } : null,
            d1h: detail1h ? { rsi: detail1h.rsi, k: detail1h.stochK, d: detail1h.stochD, rsiAlert: alerts1h.rsiAlert, stochAlert: alerts1h.stochAlert } : null,
            supplyStr
        };
        await axios.post('http://localhost:3000/api/signals/emit', signalData);
    } catch (err) {
        console.error('Failed to emit Hummer New signal to dashboard:', err.message);
    }
}

/**
 * Schedule scan exactly on the minute
 */
function scheduleNextScan() {
    const now = Date.now();
    const intervalMs = 60 * 1000;
    const nextScan = Math.ceil(now / intervalMs) * intervalMs;
    const delay = nextScan - now + 2000;

    console.log(`⏰ Bir sonraki tarama ${new Date(nextScan).toLocaleTimeString()} saatinde yapılacak.`);
    setTimeout(async () => {
        await performScan();
        scheduleNextScan();
    }, delay);
}

async function init() {
    scheduleNextScan();
    await performScan();
}

init();
