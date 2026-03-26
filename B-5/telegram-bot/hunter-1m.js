const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const technicalService = require('../backend/services/technical.service');

// Load config
dotenv.config({ path: path.join(__dirname, '.env') });

const processedSignals = new Map();
const COOLDOWN_PERIOD = 3 * 60 * 1000; // Cooldown for 1m signals (3 minutes)
const TIMEFRAME = '1m';

console.log('⚡ M1 Hammer Bot (1dk & Futures) Aktif! (Telegram Devre Dışı)');

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
        console.log(`🔍 [${new Date().toLocaleTimeString()}] 1dk Futures Taraması Başlıyor...`);
        const symbols = await getFuturesSymbols();

        for (const symbol of symbols) {
            await checkCoin(symbol);
            await new Promise(r => setTimeout(r, 60)); // API limitlerini korumak için küçük bekleme
        }
        console.log(`✅ [${new Date().toLocaleTimeString()}] 1dk Tarama Tamamlandı.`);
    } catch (e) {
        console.error('Tarama Hatası:', e.message);
    }
}

function detectDivergence(klines, rsiList, kList) {
    // Simple divergence check if needed, omitted here to keep it fast and aligned with 15m structure
    return false;
}

function calculateEMA(data, period) {
    if (data.length === 0) return [];
    const k = 2 / (period + 1);
    let ema = [data[0]];
    for (let i = 1; i < data.length; i++) {
        ema.push(data[i] * k + ema[ema.length - 1] * (1 - k));
    }
    return ema;
}

function calculateDEMA(data, period) {
    if (data.length < period * 2) return new Array(data.length).fill(0);
    const ema1 = calculateEMA(data, period);
    const ema2 = calculateEMA(ema1, period);
    const dema = [];
    for (let i = 0; i < ema1.length; i++) {
        dema.push(2 * ema1[i] - ema2[i]);
    }
    return dema;
}

async function checkCoin(symbol) {
    try {
        const res = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${TIMEFRAME}&limit=50`);
        const klines = res.data.map(k => ({
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
        }));

        if (klines.length < 50) return false;

        const rsi = technicalService.calculateFullRSI(klines, 14);
        const stoch = technicalService.calculateFullStochRSI(klines, 14, 14, 3, 3);
        const adx = technicalService.calculateADX(klines, 14);

        const lastRsi = rsi[rsi.length - 1];
        const lastK = stoch.k[stoch.k.length - 1];
        const lastD = stoch.d[stoch.d.length - 1];
        const lastAdx = adx[adx.length - 1];

        const price = klines[klines.length - 1].close;
        const prev = klines[klines.length - 2].close;
        const boost = ((price - prev) / prev * 100).toFixed(2);
        
        const currVol = klines[klines.length - 1].volume;
        const prevVol = klines[klines.length - 2].volume;
        const volBoost = prevVol ? ((currVol - prevVol) / prevVol * 100).toFixed(2) : '0.00';

        let signalType = null;

        // M1 HAMMER CRITERIA (Focused ONLY on Extreme RSI Values)
        if (lastRsi <= 20) signalType = 'Buy 🟢';
        else if (lastRsi >= 80) signalType = 'Sell 🔴';

        if (signalType) {
            const key = `${symbol}_${signalType}`;
            if (!processedSignals.has(key) || (Date.now() - processedSignals.get(key) > COOLDOWN_PERIOD)) {
                processedSignals.set(key, Date.now());

                const binanceService = require('../backend/services/binance.service');
                const supplyData = await binanceService.getSupplyData(symbol);
                let supplyStr = 'Bilinmiyor';
                if (supplyData) {
                    supplyStr = `%${supplyData.ratio}` + (supplyData.isMax ? ' !!!' : '');
                }

                await sendAlert(symbol, signalType, boost, price, prev, lastRsi, lastK, lastD, volBoost, supplyStr);
                return true;
            }
        }
    } catch (e) { return false; }
}

// Removed getMTFRSI, getMTFDetail, generateSwingComment as they are no longer needed for the exact basic image format

async function sendAlert(symbol, type, boost, price, prev, rsi, k, d, volBoost, supplyStr) {
    console.log(`📡 [1m Dashboard Signal] ${symbol} ${type.toUpperCase()} @ ${price.toFixed(4)}`);

    try {
        const signalData = {
            timeframe: '1m',
            coin: symbol,
            date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }),
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            position: type.includes('Buy') ? 'Long' : 'Short',
            price: price.toFixed(4),
            prevPrice: prev.toFixed(4),
            boost: boost,
            volBoost: volBoost,
            rsi: rsi.toFixed(2),
            stochK: Math.round(k),
            stochD: Math.round(d),
            supplyStr: supplyStr
        };
        await axios.post('http://localhost:3000/api/signals/emit', signalData);
    } catch (err) {
        console.error('Failed to emit 1m signal to dashboard:', err.message);
    }
}

/**
 * Schedule scan to run exactly at the beginning of every minute candle
 */
function scheduleNextScan() {
    const now = Date.now();
    const intervalMs = 60 * 1000;
    const nextScan = Math.ceil(now / intervalMs) * intervalMs;
    // Delay slightly (2s) after the candle opens to ensure exchange data is ready
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
