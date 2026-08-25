const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const technicalService = require('../backend/services/technical.service');

// Load config
dotenv.config({ path: path.join(__dirname, '.env') });

// Telegram Bot Setup
let bot = null;
let chatIds = new Set();
const subscribersPath = path.join(__dirname, 'subscribers_trend.json');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (TELEGRAM_TOKEN && TELEGRAM_TOKEN !== 'your_telegram_bot_token_here' && TELEGRAM_TOKEN.trim() !== '') {
    try {
        const TelegramBot = require('node-telegram-bot-api');
        bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

        if (fs.existsSync(subscribersPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(subscribersPath, 'utf8'));
                chatIds = new Set(data);
                console.log(`📂 [TrendBot] ${chatIds.size} abone yüklendi.`);
            } catch (e) { }
        }

        bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            if (!chatIds.has(chatId)) {
                chatIds.add(chatId);
                try {
                    fs.writeFileSync(subscribersPath, JSON.stringify(Array.from(chatIds)), 'utf8');
                } catch (e) { }
                console.log(`✅ [TrendBot] Yeni Telegram Abonesi: ${chatId}`);
            }
            bot.sendMessage(chatId, "🚀 *Trend Bar & Sıkışma Botu Aktif!* \nGünlük, 5 Günlük ve Haftalık SMA50 kırılımı ve trend mum (Trend Bar) sinyalleri burada paylaşılacaktır.", { parse_mode: 'Markdown' });
        });

        console.log('🤖 [TrendBot] Telegram Bot entegrasyonu aktif.');
    } catch (err) {
        console.warn('⚠️ [TrendBot] Telegram başlatılamadı:', err.message);
    }
} else {
    console.log('ℹ️ [TrendBot] Telegram token bulunamadı veya geçersiz.');
}

const processedSignals = new Map();
const COOLDOWN_PERIOD = 24 * 60 * 60 * 1000; // 24 hours cooldown for same signal

console.log('⚡ CoinKe V2.0 (Trend Bar & Sıkışma Botu) Başlatıldı!');

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

async function fetchKlines(symbol, interval, limit = 100) {
    try {
        const res = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
        return res.data.map(k => ({
            openTime: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
        }));
    } catch (e) {
        return [];
    }
}

/**
 * Builds 5-Day klines from 1-Day klines
 */
function build5DKlines(dailyKlines) {
    const klines5d = [];
    for (let i = 0; i < dailyKlines.length; i += 5) {
        if (i + 4 < dailyKlines.length) {
            const chunk = dailyKlines.slice(i, i + 5);
            const merged = technicalService.aggregateKlines(chunk, 5);
            if (merged) klines5d.push(merged);
        }
    }
    return klines5d;
}

/**
 * Check if the SMA50 was previously acting as resistance, and now is broken.
 */
function checkSMA50Breakout(klines, trendBarIndex, smaArray) {
    if (trendBarIndex < 15 || !smaArray || smaArray.length <= trendBarIndex) return false;
    
    const trendBar = klines[trendBarIndex];
    const trendBarSma = smaArray[trendBarIndex];
    
    // 1. Trend Bar must close above SMA50
    if (trendBar.close <= trendBarSma) return false;
    
    // 2. Check previous 10-15 candles for rejection (High went above or near SMA, but closed below)
    let hadRejection = false;
    for (let i = 1; i <= 15; i++) {
        const pastIndex = trendBarIndex - i;
        const pastCandle = klines[pastIndex];
        const pastSma = smaArray[pastIndex];
        
        if (pastCandle && pastSma) {
            // Rejection: Price touched or crossed SMA50, but closed below it.
            if (pastCandle.high >= pastSma * 0.99 && pastCandle.close < pastSma) {
                hadRejection = true;
                break; // Found a rejection
            }
        }
    }
    
    return hadRejection;
}

async function analyzeSymbol(symbol) {
    try {
        // Fetch Daily and Weekly
        const klines1d = await fetchKlines(symbol, '1d', 150);
        const klines1w = await fetchKlines(symbol, '1w', 100);
        const klines5d = build5DKlines(klines1d);
        
        const timeframes = [
            { name: '1G (Günlük)', klines: klines1d },
            { name: '5G (5 Günlük)', klines: klines5d },
            { name: '1W (Haftalık)', klines: klines1w }
        ];

        let signalsFound = [];

        for (const tf of timeframes) {
            const { name, klines } = tf;
            if (klines.length < 55) continue; // Need enough data for SMA50

            // We analyze the LAST CLOSED candle, which is length - 2
            const targetIndex = klines.length - 2;
            const targetCandle = klines[targetIndex];

            // 1. Is it a Trend Bar? (Body > 70%)
            if (!technicalService.isTrendBar(targetCandle, 0.70)) continue;

            // 2. Volume Check: Volume must be > 20% higher than SMA20 Volume
            const volumes = klines.map(k => k.volume);
            const smaVolume = technicalService.calculateSMA(volumes.slice(0, targetIndex + 1), 20);
            if (!smaVolume || targetCandle.volume <= smaVolume * 1.2) continue;

            // 3. Compression Check: Previous 4 candles should have small bodies
            if (!technicalService.checkCompression(klines, targetIndex, 4)) continue;

            // 4. SMA50 Breakout Check
            const closePrices = klines.map(k => k.close);
            // We need full SMA50 array to match indices
            const sma50Array = [];
            for(let i=0; i<closePrices.length; i++) {
                if(i < 50) {
                    sma50Array.push(null);
                } else {
                    sma50Array.push(technicalService.calculateSMA(closePrices.slice(i - 49, i + 1), 50));
                }
            }

            if (!checkSMA50Breakout(klines, targetIndex, sma50Array)) continue;

            // If we reached here, ALL CONDITIONS MET!
            signalsFound.push(name);
        }

        if (signalsFound.length > 0) {
            const key = `${symbol}_TREND`;
            if (!processedSignals.has(key) || (Date.now() - processedSignals.get(key) > COOLDOWN_PERIOD)) {
                processedSignals.set(key, Date.now());
                await sendTelegramAlert(symbol, signalsFound, klines1d[klines1d.length - 1].close);
            }
        }
    } catch (e) {
        // Silently fail for individual coins
    }
}

async function sendTelegramAlert(symbol, timeframes, currentPrice) {
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const binanceUrl = `https://www.binance.com/en/futures/${symbol}`;
    const cleanSymbol = symbol.replace(/[^\x00-\x7F]/g, '');

    const message = `🚀 *[TREND HUNTER] #${cleanSymbol}*\n` +
        `──────────────────\n` +
        `🟢 *TREND BAR TESPİT EDİLDİ*\n` +
        `📊 *Zaman Dilimleri:* ${timeframes.join(', ')}\n` +
        `──────────────────\n` +
        `✅ *Kriterler Sağlandı:*\n` +
        `• Hacimli Trend Mumu (Gövde > %70)\n` +
        `• Sıkışma Sonrası Kırılım\n` +
        `• SMA50 Geçmiş Ret & Güncel Kırılım\n` +
        `──────────────────\n` +
        `💰 *Anlık Fiyat:* ${currentPrice.toFixed(4)}\n` +
        `🔗 [Binance Futures](${binanceUrl}) | ⏰ ${now}`;

    console.log(`\n==============================================`);
    console.log(message.replace(/\*/g, ''));
    console.log(`==============================================\n`);

    if (bot && chatIds.size > 0) {
        for (const id of chatIds) {
            try {
                await bot.sendMessage(id, message, { parse_mode: 'Markdown', disable_web_page_preview: true });
            } catch (tgErr) {
                console.error(`Telegram gönderim hatası (${id}):`, tgErr.message);
            }
        }
    }
}

async function performScan() {
    try {
        console.log(`\n🔍 [${new Date().toLocaleTimeString()}] Trend Bar & Sıkışma Taraması Başlıyor...`);
        const symbols = await getFuturesSymbols();
        console.log(`📈 Toplam ${symbols.length} aktif Futures çifti taranacak.`);

        for (const symbol of symbols) {
            await analyzeSymbol(symbol);
            await new Promise(r => setTimeout(r, 100)); // API Rate Limit Koruması
        }
        console.log(`✅ [${new Date().toLocaleTimeString()}] Tarama Tamamlandı.`);
    } catch (e) {
        console.error('Tarama Hatası:', e.message);
    }
}

// Her 4 saatte bir çalıştır
function scheduleNextScan() {
    const intervalMs = 4 * 60 * 60 * 1000; // 4 Hours
    console.log(`⏰ Bir sonraki tarama 4 saat sonra (${new Date(Date.now() + intervalMs).toLocaleTimeString()}) yapılacak.`);
    setTimeout(async () => {
        await performScan();
        scheduleNextScan();
    }, intervalMs);
}

async function init() {
    await performScan();
    scheduleNextScan();
}

init();
