const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const binanceService = require('../backend/services/binance.service');
const technicalService = require('../backend/services/technical.service');

dotenv.config({ path: path.join(__dirname, '.env') });

// ─── Ayarlar ─────────────────────────────────────────────────────────────────
const SCAN_INTERVAL_MS   = 60 * 1000;          // Her 1 dakikada bir tara
const COOLDOWN_MS        = 15 * 60 * 1000;     // Aynı coin 15 dk cooldown
const FR_DIFF_THRESHOLD  = 0.003;              // |Δ FR| eşiği (0.3 baz puan) - Daha hassas
const FR_ABS_THRESHOLD   = 0.1;                // |FR| > %0.1 ise her türlü incele
const DASHBOARD_URL      = 'http://localhost:3000/api/signals/emit';

// ─── State ───────────────────────────────────────────────────────────────────
const prevFRSnapshot   = new Map(); // symbol → lastFundingRate
const processedSignals = new Map(); // key → timestamp (cooldown)

console.log('🚀 FR Hunter PRO V2.0 Aktif! "Nokta Atış" Takibi Başlıyor...');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Kalan süre formatı */
function formatTimeRemaining(nextFundingTime) {
    const diff = nextFundingTime - Date.now();
    if (diff <= 0) return '00:00:00';
    const totalSec = Math.floor(diff / 1000);
    const h  = Math.floor(totalSec / 3600);
    const m  = Math.floor((totalSec % 3600) / 60);
    const s  = totalSec % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/** 4S kapanış kontrolü */
function isNear4HClose() {
    const now = new Date();
    const mins = now.getUTCMinutes();
    const hours = now.getUTCHours();
    // 4 saatlik periyotlar: 0, 4, 8, 12, 16, 20
    const isCloseToHour = (hours % 4 === 3 && mins >= 45) || (hours % 4 === 0 && mins <= 10);
    return isCloseToHour;
}

// ─── Ana tarama ───────────────────────────────────────────────────────────────
async function performScan() {
    try {
        console.log(`🔍 [${new Date().toLocaleTimeString()}] FR Pro Taraması...`);

        const allData = await axios.get('https://fapi.binance.com/fapi/v1/premiumIndex');
        const usdtData = allData.data.filter(d => d.symbol.endsWith('USDT'));

        let signalCount = 0;

        for (const item of usdtData) {
            const symbol = item.symbol;
            const currentFR = parseFloat(item.lastFundingRate);
            const prevFR = prevFRSnapshot.get(symbol);
            
            if (isNaN(currentFR)) continue;

            const diff = prevFR !== undefined ? currentFR - prevFR : 0;
            const absDiff = Math.abs(diff);
            const absFR = Math.abs(currentFR * 100);

            // Filtre: Ya FR farkı yüksek ya da FR mutlak değeri çok yüksek
            if (absDiff >= FR_DIFF_THRESHOLD || absFR >= FR_ABS_THRESHOLD) {
                
                // Cooldown kontrolü (Hızlıca geçmek için)
                const direction = diff >= 0 ? 'rising' : 'falling';
                const cooldownKey = `${symbol}_${direction}`;
                const lastAlert = processedSignals.get(cooldownKey) || 0;
                
                if (Date.now() - lastAlert > COOLDOWN_MS) {
                    // Detaylı analiz başlasın (Nokta Atış Kuralları)
                    process.stdout.write(`Analyzing ${symbol}... `);
                    await processDetailedSignal(item, prevFR, diff, direction);
                    processedSignals.set(cooldownKey, Date.now());
                    signalCount++;
                }
            }

            prevFRSnapshot.set(symbol, currentFR);
        }

        if (signalCount > 0) console.log(`\n✅ Tarama Tamamlandı. ${signalCount} potansiyel sinyal incelendi.`);
    } catch (e) {
        console.error('FR Tarama Hatası:', e.message);
    }
}

async function processDetailedSignal(item, prevFR, diff, direction) {
    const symbol = item.symbol;
    const currentFR = parseFloat(item.lastFundingRate);
    
    // 1. Piyasa Verileri (Hacim, 24s Değişim) - GET FROM FUTURES API
    const allTickers = await binanceService.getFutures24hrTickers();
    const ticker = allTickers.find(t => t.symbol === symbol);
    const priceChange24h = ticker ? ticker.priceChangePercent : 0;

    // 2. OI Delta Verisi
    const oiData = await binanceService.getOpenInterestDelta(symbol);
    const oiDelta = oiData ? oiData.delta : 0;

    // 3. MTF Teknik Veriler (4H, 1D, 5D Simülasyon)
    const mtfData = await binanceService.getMultiTimeframeData(symbol);
    
    // 5D Simülasyon (Son 5 adet 1D mumunu birleştiriyoruz)
    const k5d = technicalService.aggregateKlines(mtfData.k1d, 5);
    const is5DDoji = k5d ? technicalService.isDoji(k5d) : false;
    const is5DGreen = k5d ? k5d.close > k5d.open : false;

    // Heikin Ashi Trend (1D ve 4H)
    const is1DGreen = technicalService.isHeikinAshiGreen(mtfData.k1d);
    const is4HGreen = technicalService.isHeikinAshiGreen(mtfData.k4h);

    // WaveTrend
    const wt4H = technicalService.calculateWaveTrend(mtfData.k4h);

    // RSI & StochRSI
    const close4H = mtfData.k4h.map(k => k.close);
    const rsi4H = technicalService.calculateRSI(close4H);

    // Doji Kontrolü (Daily ve 5D)
    const isDailyDoji = mtfData.k1d.length > 0 ? technicalService.isDoji(mtfData.k1d[mtfData.k1d.length - 1]) : false;
    
    // 4. Basis (Premium/Discount) Verisi
    const premiumData = await binanceService.getPremiumIndex(symbol);
    const basis = premiumData ? premiumData.basis : 0;

    // ─── SCORING LOGIC (Nokta Atış Professional) ───
    let score = 0;
    let strategy = 'Nötr';
    let details = [];

    const isNegativeFR = currentFR < 0;
    const isFRGettingMoreNegative = diff < 0 && isNegativeFR;

    // A. 5D & MTF TREND (X + Y Koşulu)
    if (is5DGreen) {
        score += 2;
        details.push('5D Trend Yeşil 📈');
    } else {
        score -= 1;
        details.push('5D Trend Kırmızı 📉');
    }

    if (is5DDoji) {
        details.push('⚠️ 5D DOJI (Zirvede Kararsızlık)');
        if (priceChange24h > 10) score -= 2; 
    }

    // B. Extreme Move Protection
    if (priceChange24h > 15) {
        score -= 2;
        details.push('⚠️ Pik Yapmış (Over-extended)');
    }

    // C. OI vs FR Diverjans (Z Koşulu)
    if (oiDelta < -2) {
        if (isNegativeFR || Math.abs(currentFR) > 0.01) {
            score -= 3;
            strategy = 'SHORT (Exhaustion)';
            details.push('OI Düşüyor + FR Beklemede (Boşalma)');
        }
    } else if (oiDelta > 2 && isFRGettingMoreNegative) {
        score += 3;
        strategy = 'LONG (Squeeze Potansiyeli)';
        details.push('OI Artıyor + -FR Artıyor (Sıkışma)');
    }

    // D. Teknik İndikatörler
    if (wt4H.cross === 'Bullish 🟢') score += 1;
    if (wt4H.cross === 'Bearish 🔴') score -= 1;
    
    if (rsi4H > 70) score -= 1;
    if (rsi4H < 30) score += 1;

    if (is1DGreen) score += 1;
    if (is4HGreen) score += 1;

    // E. Basis & 4H Close
    if (basis < -0.05) {
        score += 1;
        details.push(`Discount %${Math.abs(basis).toFixed(2)}`);
    }

    if (isNear4HClose()) {
        details.push('⚠️ 4S Kapanış Riski');
    }

    // ─── SİNYAL GÖNDERİMİ ───
    if (Math.abs(score) >= 3) {
        await sendAdvancedSignal({
            symbol,
            currentFR,
            prevFR: prevFR || currentFR,
            diff,
            direction,
            oiDelta,
            is5DGreen,
            is5DDoji,
            score,
            strategy,
            details,
            priceChange24h,
            rsi4H: rsi4H ? rsi4H.toFixed(1) : 'N/A',
            wt4H: wt4H.cross || 'Normal',
            nextFundingTime: parseInt(item.nextFundingTime)
        });
    }
}

async function sendAdvancedSignal(data) {
    const timeRemaining = formatTimeRemaining(data.nextFundingTime);
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });

    const supplyData = await binanceService.getSupplyData(data.symbol);
    const frPct = (data.currentFR * 100).toFixed(4);
    const diffPct = (data.diff * 100).toFixed(4);
    
    const emoji = data.score >= 4 ? '💎' : (data.score >= 3 ? '🟢' : (data.score <= -3 ? '🔴' : '⚪'));
    const position = data.score > 0 ? 'Long' : 'Short';

    console.log(`\n🎯 [ALFA PRO] ${data.symbol} | Skor: ${data.score} | ${data.strategy}`);

    const signalData = {
        timeframe: 'fr',
        coin: data.symbol,
        date: nowDate,
        time: now,
        position: position,
        fundingRate: parseFloat(frPct),
        frDiff: parseFloat(diffPct),
        oiDelta: data.oiDelta,
        score: data.score,
        strategy: data.strategy,
        details: data.details.join(' | '),
        priceChange24h: data.priceChange24h,
        rsi4H: data.rsi4H,
        wt4H: data.wt4H,
        timeRemaining,
        supplyStr: supplyData ? `%${supplyData.ratio}` : 'N/A'
    };

    try {
        await axios.post(DASHBOARD_URL, signalData);
    } catch (err) {
        console.error('Dashboard emit hatası:', err.message);
    }
}

// ─── Döngü ───────────────────────────────────────────────────────────────────
async function run() {
    console.log('🔄 İlk FR snapshot alınıyor...');
    try {
        const allData = await axios.get('https://fapi.binance.com/fapi/v1/premiumIndex');
        allData.data.forEach(item => {
            const fr = parseFloat(item.lastFundingRate);
            if (!isNaN(fr)) prevFRSnapshot.set(item.symbol, fr);
        });
        console.log(`✅ ${prevFRSnapshot.size} sembol snapshot'a alındı. Başlatılıyor...`);
        
        performScan();
        setInterval(performScan, SCAN_INTERVAL_MS);
    } catch (e) {
        console.error('Başlatma hatası:', e.message);
    }
}

run();
