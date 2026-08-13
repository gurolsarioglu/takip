const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const detayScanService = require('../backend/services/detayScan.service');

// Load config
dotenv.config({ path: path.join(__dirname, '.env') });

const processedSignals = new Map();
const COOLDOWN_PERIOD = 24 * 60 * 60 * 1000; // 24 hours cooldown for daily signals

console.log('⚡ Detay 1G Günlük Tarama Botu Aktif!');

async function runDailyScan() {
    try {
        console.log(`\n🔍 [${new Date().toLocaleString('tr-TR')}] Günlük Detay Taraması Başlıyor...`);
        const matches = await detayScanService.performScan();
        console.log(`📈 Tarama bitti. ${matches.length} coin eşleşti.`);

        for (const match of matches) {
            const key = `${match.symbol}_${match.signalType}`;
            
            // Check cooldown
            if (processedSignals.has(key) && (Date.now() - processedSignals.get(key) < COOLDOWN_PERIOD)) {
                continue;
            }
            processedSignals.set(key, Date.now());

            // Build signal payload matching the frontend SüperSwing (rsi-div) feed
            const signalData = {
                timeframe: 'rsi-div', // Displays inside SüperSwing (4H & 1D) column
                coin: match.symbol,
                date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }),
                time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                position: match.signalType,
                price: match.price,
                rsi: match.rsi,
                rsiWarning: match.score === 3 ? '⭐⭐⭐' : '⭐',
                // Daily RSI indicators
                rsi3d: match.rsi, // For display matching 
                rsi5d: match.rsiSma,
                rsi7d: '-',
                rsi1d: match.rsi,
                divergence: match.divergence ? {
                    type: match.divergence.type,
                    startDate: match.divergence.startDate,
                    dateRange: match.divergence.dateRange,
                    description: match.divergence.description,
                    priceDiff: match.divergence.priceDiff,
                    rsiDiff: match.divergence.rsiDiff
                } : null,
                score: match.score,
                swingComment: `1G mum açılışı ${match.isGreen ? 'YEŞİL' : 'KIRMIZI'} 🟢\n` + 
                             `RSI-SMA kesişimi gerçekleşti.\n` + 
                             (match.divergence ? `⚠️ GÜNLÜK UYUMSUZLUK TESPİT EDİLDİ!` : `Normal sinyal seviyesi.`)
            };

            // Emit signal to backend server
            try {
                await axios.post('http://localhost:3000/api/signals/emit', signalData);
                console.log(`📡 [EMITTED SIGNAL] ${match.symbol} ${match.signalType} Price: ${match.price} RSI: ${match.rsi}`);
            } catch (err) {
                console.error(`❌ Sinyal gönderilemedi (${match.symbol}):`, err.message);
            }
        }
    } catch (e) {
        console.error('Günlük tarama yürütme hatası:', e.message);
    }
}

/**
 * Schedule daily scan at 03:05 Istanbul Time (UTC+3)
 */
function scheduleNextScan() {
    const now = Date.now();
    const today = new Date();
    
    // Create target time: 03:05:00
    const targetTime = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        3, // 3 AM
        5, // 5 min
        0  // 0 sec
    );

    if (now > targetTime.getTime()) {
        // If we are already past 03:05 today, schedule for tomorrow
        targetTime.setDate(targetTime.getDate() + 1);
    }

    const delay = targetTime.getTime() - now;
    console.log(`⏰ Bir sonraki günlük Detay taraması ${targetTime.toLocaleString('tr-TR')} saatinde yapılacak.`);
    
    setTimeout(async () => {
        await runDailyScan();
        scheduleNextScan();
    }, delay);
}

// Initial scheduling and fast scan on startup
scheduleNextScan();

// Perform initial check on startup after a short delay (10s) to let the server start
setTimeout(async () => {
    console.log('🚀 Başlangıç taraması yapılıyor...');
    await runDailyScan();
}, 10000);
