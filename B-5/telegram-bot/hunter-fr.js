const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const binanceService = require('../backend/services/binance.service');

dotenv.config({ path: path.join(__dirname, '.env') });

// ─── Ayarlar ─────────────────────────────────────────────────────────────────
const SCAN_INTERVAL_MS   = 60 * 1000;          // Her 1 dakikada bir tara
const COOLDOWN_MS        = 30 * 60 * 1000;     // Aynı coin 30 dk cooldown
const FR_DIFF_THRESHOLD  = 0.005;              // |Δ FR| eşiği (0.5 baz puan)
const DASHBOARD_URL      = 'http://localhost:3000/api/signals/emit';

// ─── State ───────────────────────────────────────────────────────────────────
const prevFRSnapshot   = new Map(); // symbol → lastFundingRate
const processedSignals = new Map(); // key → timestamp (cooldown)

console.log('⚡ FR Hunter V1.0 Aktif! Funding Rate Takibi Başlıyor...');

// ─── Binance API helpers ──────────────────────────────────────────────────────

/** Tüm aktif USDT Perpetual semboller */
async function getFuturesSymbols() {
    const res = await axios.get('https://fapi.binance.com/fapi/v1/exchangeInfo');
    return res.data.symbols
        .filter(s => s.quoteAsset === 'USDT' && s.status === 'TRADING' && s.contractType === 'PERPETUAL')
        .map(s => s.symbol);
}

/**
 * premiumIndex endpoint: anlık FR + nextFundingTime
 * Tek çağrıyla tüm semboller gelir (sembol verilmezse)
 */
async function getAllPremiumIndex() {
    const res = await axios.get('https://fapi.binance.com/fapi/v1/premiumIndex');
    return res.data; // Array of { symbol, markPrice, lastFundingRate, nextFundingTime, ... }
}

// ─── Kalan süre formatı ───────────────────────────────────────────────────────
function formatTimeRemaining(nextFundingTime) {
    const diff = nextFundingTime - Date.now();
    if (diff <= 0) return '00:00:00';
    const totalSec = Math.floor(diff / 1000);
    const h  = Math.floor(totalSec / 3600);
    const m  = Math.floor((totalSec % 3600) / 60);
    const s  = totalSec % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ─── Ana tarama ───────────────────────────────────────────────────────────────
async function performScan() {
    try {
        console.log(`🔍 [${new Date().toLocaleTimeString()}] FR Taraması Başlıyor...`);

        const allData = await getAllPremiumIndex();
        // Sadece USDT perpetual filtrele
        const usdtData = allData.filter(d => d.symbol.endsWith('USDT'));

        let signalCount = 0;

        for (const item of usdtData) {
            const symbol         = item.symbol;
            const currentFR      = parseFloat(item.lastFundingRate);
            const nextFundingTime= parseInt(item.nextFundingTime);

            if (isNaN(currentFR)) continue;

            const prevFR = prevFRSnapshot.get(symbol);

            if (prevFR !== undefined) {
                const diff = currentFR - prevFR;
                const absDiff = Math.abs(diff);

                if (absDiff >= FR_DIFF_THRESHOLD) {
                    const direction = diff > 0 ? 'rising' : 'falling';
                    const key = `${symbol}_${direction}`;

                    const lastAlert = processedSignals.get(key) || 0;
                    if (Date.now() - lastAlert > COOLDOWN_MS) {
                        processedSignals.set(key, Date.now());
                        await sendSignal(symbol, currentFR, prevFR, diff, nextFundingTime, direction);
                        signalCount++;
                    }
                }
            }

            prevFRSnapshot.set(symbol, currentFR);
        }

        console.log(`✅ [${new Date().toLocaleTimeString()}] Tarama Tamamlandı. ${signalCount} sinyal üretildi.`);
    } catch (e) {
        console.error('FR Tarama Hatası:', e.message);
    }
}

// ─── Dashboard + Telegram'a sinyal gönder ─────────────────────────────────────
async function sendSignal(symbol, currentFR, prevFR, diff, nextFundingTime, direction) {
    const cleanSymbol     = symbol.replace(/[^\x00-\x7F]/g, '');
    const timeRemaining   = formatTimeRemaining(nextFundingTime);
    const now             = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const nowDate         = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });

    const supplyData = await binanceService.getSupplyData(symbol);
    let supplyStr = 'Bilinmiyor';
    if (supplyData) {
        supplyStr = `%${supplyData.ratio}` + (supplyData.isMax ? ' !!!' : '');
    }

    const isFalling       = direction === 'falling';
    const emoji           = isFalling ? '🔴' : '🟢';
    const dirLabel        = isFalling ? '↓↓ HIZLA DÜŞÜYOR' : '↑↑ HIZLA ARTIYOR';
    const position        = isFalling ? 'Short' : 'Long';  // FR düşüyor → short baskısı

    const frPct           = (currentFR * 100).toFixed(4);
    const prevFRPct       = (prevFR * 100).toFixed(4);
    const diffPct         = (diff * 100).toFixed(4);

    console.log(`📡 [FR Signal] ${symbol} | FR: ${frPct}% | Δ: ${diffPct}% | ${dirLabel}`);

    // Telegram mesajı (isteğe bağlı, bot.js entegrasyon için loglanıyor)
    const telegramMsg =
        `FR\n${emoji} #${cleanSymbol}\n` +
        `Funding Rate: ${frPct}%\n` +
        `Previous Funding: ${prevFRPct}%\n` +
        `Difference: ${Math.abs(parseFloat(diffPct)).toFixed(6)}\n` +
        `Dolaşım: ${supplyStr}\n` +
        `Time Remaining: ${timeRemaining}\n` +
        `${dirLabel}`;

    console.log(telegramMsg);

    // Dashboard'a emit
    try {
        const signalData = {
            timeframe      : 'fr',
            coin           : cleanSymbol,
            date           : nowDate,
            time           : now,
            position       : position,
            fundingRate    : parseFloat(frPct),
            prevFundingRate: parseFloat(prevFRPct),
            frDiff         : parseFloat(diffPct),
            timeRemaining  : timeRemaining,
            direction      : direction,
            supplyStr
        };
        await axios.post(DASHBOARD_URL, signalData);
    } catch (err) {
        console.error('Dashboard emit hatası:', err.message);
    }
}

// ─── Döngü ───────────────────────────────────────────────────────────────────
async function run() {
    // İlk taramada snapshot'ı doldur (sinyal üretme, sadece veri al)
    console.log('🔄 İlk FR snapshot alınıyor (warm-up)...');
    try {
        const allData = await getAllPremiumIndex();
        allData.filter(d => d.symbol.endsWith('USDT')).forEach(item => {
            const fr = parseFloat(item.lastFundingRate);
            if (!isNaN(fr)) prevFRSnapshot.set(item.symbol, fr);
        });
        console.log(`✅ Warm-up tamamlandı. ${prevFRSnapshot.size} sembol snapshot'a alındı.`);
    } catch (e) {
        console.error('Warm-up hatası:', e.message);
    }

    // İlk gerçek taramayı 1 dk sonra başlat
    setTimeout(() => {
        performScan();
        setInterval(performScan, SCAN_INTERVAL_MS);
    }, SCAN_INTERVAL_MS);
}

run();
