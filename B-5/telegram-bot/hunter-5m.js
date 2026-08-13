const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const technicalService = require('../backend/services/technical.service');

// Load config
dotenv.config({ path: path.join(__dirname, '.env') });

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error("❌ TELEGRAM_BOT_TOKEN eksik! .env dosyasını kontrol edin.");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Persistence for Telegram subscribers
const subscribersPath = path.join(__dirname, '..', 'data', 'subscribers_5m.json');
if (!fs.existsSync(path.dirname(subscribersPath))) {
    fs.mkdirSync(path.dirname(subscribersPath), { recursive: true });
}

let chatIds = new Set();
if (fs.existsSync(subscribersPath)) {
    try {
        const data = JSON.parse(fs.readFileSync(subscribersPath, 'utf8'));
        chatIds = new Set(data);
        console.log(`📂 Loaded ${chatIds.size} subscribers from subscribers_5m.json`);
    } catch (e) {
        console.error('Error loading subscribers:', e.message);
    }
}

function saveSubscribers() {
    try {
        fs.writeFileSync(subscribersPath, JSON.stringify(Array.from(chatIds)), 'utf8');
    } catch (e) {
        console.error('Error saving subscribers:', e.message);
    }
}

const processedSignals = new Map();
const COOLDOWN_PERIOD = 15 * 60 * 1000; // 15 minutes cooldown for 5m signals
const TIMEFRAME = '5m';

console.log('⚡ M5 Hammer Bot (5dk & Futures) Aktif!');

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!chatIds.has(chatId)) {
        chatIds.add(chatId);
        saveSubscribers();
        console.log(`✅ Yeni Abone (5m): ${chatId} - ${msg.from.first_name || 'Kullanıcı'}`);
    }
    bot.sendMessage(chatId, "🚀 *M5 Hammer Botu Aktif!* \n5 dakikalık grafikte RSI ve StochRSI değerlerini tarayıp sinyal oluştuğunda mesaj göndereceğim.", { parse_mode: 'Markdown' });
});

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
        console.log(`🔍 [${new Date().toLocaleTimeString()}] 5dk Futures Taraması Başlıyor...`);
        const symbols = await getFuturesSymbols();

        for (const symbol of symbols) {
            await checkCoin(symbol);
            await new Promise(r => setTimeout(r, 60)); // API throttle guard
        }
        console.log(`✅ [${new Date().toLocaleTimeString()}] 5dk Tarama Tamamlandı.`);
    } catch (e) {
        console.error('Tarama Hatası:', e.message);
    }
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

        const rsiArr = technicalService.calculateFullRSI(klines, 14);
        const stoch = technicalService.calculateFullStochRSI(klines, 14, 14, 3, 3);
        
        const lastRsi = rsiArr[rsiArr.length - 1];
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
    } catch (e) {
        return null;
    }
}

async function checkCoin(symbol) {
    try {
        const detail5m = await getMTFDetail(symbol, '5m');
        if (!detail5m) return false;

        const { rsi: rsi5m, stochK: stochK5m, price, prevPrice, volume, prevVolume } = detail5m;

        let signalType = null;

        // 5DK zaman diliminde SRSI >= 90 AND RSI >= 90 ise Short
        if (rsi5m >= 90 && stochK5m >= 90) {
            signalType = 'Sell 🔴';
        }
        // 5DK zaman diliminde SRSI <= 10 AND RSI <= 10 ise Long
        else if (rsi5m <= 10 && stochK5m <= 10) {
            signalType = 'Buy 🟢';
        }

        if (signalType) {
            const key = `${symbol}_${signalType}`;
            const now = Date.now();
            if (!processedSignals.has(key) || (now - processedSignals.get(key) > COOLDOWN_PERIOD)) {
                processedSignals.set(key, now);

                // Fetch other timeframes: 1m and 1h
                const detail1m = await getMTFDetail(symbol, '1m');
                const detail1h = await getMTFDetail(symbol, '1h');

                // Star Rating based on Volume Change Percentage
                const volChange = prevVolume ? ((volume - prevVolume) / prevVolume * 100) : 0;
                const absVolChange = Math.abs(volChange);
                
                let starsStr = '';
                if (absVolChange >= 2 && absVolChange < 3) starsStr = '⭐️';
                else if (absVolChange >= 3 && absVolChange < 8) starsStr = '⭐️⭐️';
                else if (absVolChange >= 8) starsStr = '⭐️⭐️⭐️';

                // Price Boost
                const boost = prevPrice ? ((price - prevPrice) / prevPrice * 100).toFixed(2) : '0.00';

                await sendAlert(symbol, signalType, boost, price, prevPrice, volChange, starsStr, detail1m, detail5m, detail1h);
                return true;
            }
        }
    } catch (e) {
        return false;
    }
}

async function sendAlert(symbol, type, boost, price, prev, volChange, starsStr, detail1m, detail5m, detail1h) {
    console.log(`📡 [M5 Hammer Signal] ${symbol} ${type.toUpperCase()} @ ${price.toFixed(4)}`);
    const isShort = type.includes('Sell');
    
    // Assign alerts based on direction
    const assignAlerts = (detail) => {
        if (!detail) return { rsiAlert: '', stochAlert: '' };
        let rsiAlert = '';
        let stochAlert = '';

        if (isShort) {
            if (detail.rsi >= 80) rsiAlert = ' ❗';
            if (detail.stochK >= 90) stochAlert = ' ❗';
        } else {
            if (detail.rsi <= 20) rsiAlert = ' ❗';
            if (detail.stochK <= 10) stochAlert = ' ❗';
        }
        return { rsiAlert, stochAlert };
    };

    const alerts1m = assignAlerts(detail1m);
    const alerts5m = assignAlerts(detail5m);
    const alerts1h = assignAlerts(detail1h);

    const cleanSymbol = symbol.replace(/[^\x00-\x7F]/g, '');
    const circle = isShort ? '🔴' : '🟢';

    const binanceUrl = `https://www.binance.com/en/futures/${symbol}`;
    const tvUrl = `https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}`;

    // Exact requested format from user's image
    const message = `M5 Hammer\n` +
        `${circle} #${cleanSymbol} ${starsStr}\n` +
        `Boost Value: ${boost > 0 ? '+' : ''}${boost}%\n` +
        `Current Price: ${price.toFixed(4)}\n` +
        `Previous Price: ${prev.toFixed(4)}\n` +
        `RSI: 1m.${Math.round(detail1m?.rsi || 50)}${alerts1m.rsiAlert} | 5m.${Math.round(detail5m?.rsi || 50)}${alerts5m.rsiAlert} | 1h.${Math.round(detail1h?.rsi || 50)}${alerts1h.rsiAlert}\n` +
        `SRSI: 1m.${Math.round(detail1m?.stochK || 50)}${alerts1m.stochAlert} | 5m.${Math.round(detail5m?.stochK || 50)}${alerts5m.stochAlert} | 1h.${Math.round(detail1h?.stochK || 50)}${alerts1h.stochAlert}\n` +
        `[Binance](${binanceUrl}) | [TradingView](${tvUrl})`;

    // Send to Telegram subscribers
    for (const chatId of chatIds) {
        try {
            await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', disable_web_page_preview: true });
        } catch (err) {
            console.error(`Telegram send error to ${chatId}:`, err.message);
        }
    }

    // Broadcast to Local Web Dashboard via REST API
    try {
        const signalData = {
            timeframe: '5m',
            coin: symbol,
            date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }),
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            position: isShort ? 'Short' : 'Long',
            starsStr,
            price: price.toFixed(4),
            prevPrice: prev.toFixed(4),
            boost,
            volBoost: volChange.toFixed(2),
            d1m: detail1m ? { rsi: detail1m.rsi, k: detail1m.stochK, d: detail1m.stochD, rsiAlert: alerts1m.rsiAlert, stochAlert: alerts1m.stochAlert } : null,
            d5m: { rsi: detail5m.rsi, k: detail5m.stochK, d: detail5m.stochD, rsiAlert: alerts5m.rsiAlert, stochAlert: alerts5m.stochAlert },
            d1h: detail1h ? { rsi: detail1h.rsi, k: detail1h.stochK, d: detail1h.stochD, rsiAlert: alerts1h.rsiAlert, stochAlert: alerts1h.stochAlert } : null
        };
        await axios.post('http://localhost:3000/api/signals/emit', signalData);
    } catch (err) {
        console.error('Failed to emit 5m signal to dashboard:', err.message);
    }
}

/**
 * Schedule scan to run exactly at the beginning of every 5-minute candle
 */
function scheduleNextScan() {
    const now = Date.now();
    const intervalMs = 5 * 60 * 1000;
    const nextScan = Math.ceil(now / intervalMs) * intervalMs;
    // Delay slightly (3s) after the candle opens to ensure exchange data is ready
    const delay = nextScan - now + 3000;

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
