const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const binanceService = require('../backend/services/binance.service');
const technicalService = require('../backend/services/technical.service');

dotenv.config({ path: path.join(__dirname, '.env') });

// ─── Ayarlar ─────────────────────────────────────────────────────────────────
const SCAN_INTERVAL_MS   = 5 * 60 * 1000;      // 5 dakikada bir tarama
const COOLDOWN_MS        = 30 * 60 * 1000;     // Aynı coin 30 dk cooldown
const VOLUME_THRESHOLD   = 2.0;                // Hacim ortalamanın 2 katı olmalı
const TP_PERCENT         = 8.0;                // %8 kâr hedefi
const DASHBOARD_URL      = 'http://localhost:3000/api/signals/emit';

// ─── State ───────────────────────────────────────────────────────────────────
const processedSignals = new Map(); // symbol → timestamp

console.log('🔥 Volume Hunter (Hacim Avcısı) V1.0 Aktif! %8 Hedefli Taramalar Başlıyor...');

async function performScan() {
    try {
        console.log(`🔍 [${new Date().toLocaleTimeString()}] Hacim Taraması Başlatıldı...`);

        // Tüm aktif futures USDT çiftlerini al (24h ticker'dan filtreleyerek)
        const tickers = await binanceService.getFutures24hrTickers();
        const usdtSymbols = tickers.map(t => t.symbol);

        let signalCount = 0;

        for (const symbol of usdtSymbols) {
            // Cooldown kontrolü
            if (processedSignals.has(symbol) && (Date.now() - processedSignals.get(symbol) < COOLDOWN_MS)) {
                continue;
            }

            try {
                // 1. 5m Mum verilerini al (Hacim kontrolü için)
                const klines5m = await binanceService.getFuturesKlines(symbol, '5m', 15);
                const volumes = klines5m.map(k => k.volume);
                const relVol = technicalService.calculateRelativeVolume(volumes, 9);

                // Hacim eşiği kontrolü
                if (relVol >= VOLUME_THRESHOLD) {
                    // 2. Günlük verileri al (Pivot hesaplaması için)
                    const klines1d = await binanceService.getFuturesKlines(symbol, '1d', 2);
                    if (klines1d.length < 2) continue;
                    
                    const prevDay = klines1d[0];
                    const pivots = technicalService.calculatePivotPoints(prevDay.high, prevDay.low, prevDay.close);
                    
                    const currentPrice = klines5m[klines5m.length - 1].close;
                    const prevPrice = klines5m[klines5m.length - 2].close;
                    const isRising = currentPrice > prevPrice;
                    const position = isRising ? 'Long' : 'Short';

                    // 3. Hedef Fiyat Hesabı (%8)
                    const targetPrice = isRising 
                        ? currentPrice * (1 + TP_PERCENT / 100) 
                        : currentPrice * (1 - TP_PERCENT / 100);

                    // 4. Pivot Durumu Belirleme
                    let pivotStatus = 'Normal';
                    if (Math.abs(currentPrice - pivots.r1) / pivots.r1 < 0.002) pivotStatus = 'R1 Direncinde ⚠️';
                    else if (Math.abs(currentPrice - pivots.r2) / pivots.r2 < 0.002) pivotStatus = 'R2 Direncinde 🚨';
                    else if (Math.abs(currentPrice - pivots.s1) / pivots.s1 < 0.002) pivotStatus = 'S1 Desteğinde 🛡️';
                    else if (Math.abs(currentPrice - pivots.s2) / pivots.s2 < 0.002) pivotStatus = 'S2 Desteğinde 🛡️';
                    else if (currentPrice > pivots.r1) pivotStatus = 'R1 Üstü (Boğa) 📈';
                    else if (currentPrice < pivots.s1) pivotStatus = 'S1 Altı (Ayı) 📉';

                    // Sinyal Gönder
                    await sendVolumeSignal({
                        symbol,
                        price: currentPrice,
                        prevPrice: prevPrice,
                        relVol,
                        position,
                        pivotStatus,
                        targetPrice: targetPrice.toFixed(6),
                        tpPercent: TP_PERCENT
                    });

                    processedSignals.set(symbol, Date.now());
                    signalCount++;
                }
            } catch (err) {
                // Münferit symbol hatalarını sessiz geç
                continue;
            }
        }

        console.log(`✅ Tarama Bitti. ${signalCount} yeni hacim sinyali gönderildi.`);
    } catch (e) {
        console.error('Hacim Tarama Hatası:', e.message);
    }
}

async function sendVolumeSignal(data) {
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });

    console.log(`\n🚀 [VOLUME] ${data.symbol} | Hacim: ${data.relVol}x | Hedef: ${data.targetPrice}`);

    const signalData = {
        timeframe: 'volume',
        coin: data.symbol,
        date: nowDate,
        time: now,
        position: data.position,
        price: data.price,
        prevPrice: data.prevPrice,
        relVol: data.relVol,
        pivotStatus: data.pivotStatus,
        targetPrice: data.targetPrice,
        tpPercent: data.tpPercent,
        strategy: `${data.relVol}x Hacim Patlaması`
    };

    try {
        await axios.post(DASHBOARD_URL, signalData);
    } catch (err) {
        console.error('Dashboard emit hatası:', err.message);
    }
}

// ─── Döngü ───────────────────────────────────────────────────────────────────
function run() {
    performScan();
    setInterval(performScan, SCAN_INTERVAL_MS);
}

run();
