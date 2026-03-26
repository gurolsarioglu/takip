const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load config
dotenv.config({ path: path.join(__dirname, '.env') });

const processedSignals = new Map();
const COOLDOWN_PERIOD = 24 * 60 * 60 * 1000; // 24 hours cooldown for 1D signals
const TIMEFRAME = '1d';

// Initialize Gemini AI (Kept inactive as requested)
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({
//     model: 'gemini-2.0-flash-exp'
// });

console.log('⚡ CoinKe V2.0 (1G & Futures) Aktif! (Telegram Devre Dışı)');

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
        console.log(`🔍 [${new Date().toLocaleTimeString()}] 1G Futures Taraması Başlıyor...`);
        const symbols = await getFuturesSymbols();
        console.log(`📈 Toplam ${symbols.length} aktif Futures çifti taranacak.`);

        for (const symbol of symbols) {
            await checkCoin(symbol);
            await new Promise(r => setTimeout(r, 60)); // API limitlerini korumak için küçük bekleme
        }
        console.log(`✅ [${new Date().toLocaleTimeString()}] Tarama Tamamlandı.`);
    } catch (e) {
        console.error('Tarama Hatası:', e.message);
    }
}

async function checkCoin(symbol) {
    try {
        const res = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${TIMEFRAME}&limit=100`);
        const klines = res.data.map(k => ({
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
        }));

        if (klines.length < 50) return false;

        // Ensure we pass the objects array to MTF-aware calculateWaveTrend, but closes array to others
        const rsi = calculateRSI(klines, 14);
        const stoch = calculateStochRSI(klines, 14, 14, 3, 3);
        const adx = calculateADX(klines, 14);

        // HLC3 mapping array for WT
        const klinesWithHlc3 = klines.map(k => ({ ...k, hlc3: (k.high + k.low + k.close) / 3 }));
        const wt = calculateWaveTrend(klinesWithHlc3);
        const closes = klines.map(k => k.close);
        const bb = calculateBollingerBands(closes, 20, 2);

        const lastRsi = rsi[rsi.length - 1];
        const lastK = stoch.k[stoch.k.length - 1];
        const lastD = stoch.d[stoch.d.length - 1];
        const lastAdx = adx[adx.length - 1];
        const lastBB = bb[bb.length - 1];

        const lastCandle = klines[klines.length - 1];
        const price = lastCandle.close;
        const currentLow = lastCandle.low;
        const prev = klines[klines.length - 2].close;
        const boost = ((price - prev) / prev * 100).toFixed(2);

        const divergence = detectDivergence(klines, rsi, stoch.k);

        let signalType = null;

        // NEW WT + BB Strategy Criteria
        const isWTBullCross = wt.cross === 'Yükseliş 🟢';
        const isDeepOversoldWT = wt.wt1 <= -50;
        const isTouchingLowerBB = currentLow <= lastBB.lower;

        if (isWTBullCross && isDeepOversoldWT && isTouchingLowerBB) {
            signalType = 'Deep Buy 🟢 (WT Dip)';
        }
        // Fallback to SCALPER CRITERIA (Focused ONLY on Extreme RSI Values)
        else if (lastRsi <= 20) signalType = 'Buy 🟢';
        else if (lastRsi >= 80) signalType = 'Sell 🔴';

        if (signalType) {
            const key = `${symbol}_${signalType}`;
            if (!processedSignals.has(key) || (Date.now() - processedSignals.get(key) > COOLDOWN_PERIOD)) {
                processedSignals.set(key, Date.now());

                const lastVol = klines[klines.length - 1].volume;
                const avgVol = klines.slice(-11, -1).reduce((s, k) => s + k.volume, 0) / 10;
                let volStatus = lastVol > (avgVol * 1.05) ? "🔥 YÜKSEK HACİM" : "Normal";
                let trendStatus = lastAdx > 25 ? "💪 Güçlü Trend" : "Zayıf Trend";

                // DEMA 9 & Yana Mum
                const closes = klines.map(k => k.close);
                const dema9 = calculateDEMA(closes, 9);
                const lastDema9 = dema9[dema9.length - 1];
                const lastCandle = klines[klines.length - 1];
                const prevCandle = klines[klines.length - 2];
                const isYanaMum = Math.abs(lastCandle.close - prevCandle.close) / prevCandle.close < 0.0008;
                const isNearDema = Math.abs(lastCandle.close - lastDema9) / lastDema9 < 0.0012;
                const demaAlert = isYanaMum && isNearDema;

                // Multi-Timeframe RSI
                const rsi1h = await getMTFRSI(symbol, '1h');
                const rsi4h = await getMTFRSI(symbol, '4h');
                const rsi1d = await getMTFRSI(symbol, '1d');

                const binanceService = require('../backend/services/binance.service');
                const supplyData = await binanceService.getSupplyData(symbol);
                let supplyStr = 'Bilinmiyor';
                if (supplyData) {
                    supplyStr = `%${supplyData.ratio}` + (supplyData.isMax ? ' !!!' : '');
                }

                await sendAlert(symbol, signalType, boost, price, prev, lastRsi, lastK, lastD, volStatus, trendStatus, demaAlert, rsi1h, rsi4h, rsi1d, supplyStr);
                return true;
            }
        }
    } catch (e) { return false; }
}

async function getMTFRSI(symbol, interval) {
    try {
        const res = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=100`);
        const klines = res.data.map(k => ({
            close: parseFloat(k[4])
        }));
        if (klines.length < 50) return null;
        const rsi = calculateRSI(klines, 14);
        return Math.round(rsi[rsi.length - 1]);
    } catch (e) {
        return 'N/A';
    }
}

async function sendAlert(symbol, type, boost, price, prev, rsi, k, d, vol, trend, demaAlert, rsi1h, rsi4h, rsi1d, supplyStr = 'Bilinmiyor') {
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const binanceUrl = `https://www.binance.com/en/futures/${symbol}`;

    // RSI Star & Exclamation Rules
    let rsiWarning = '';
    const roundedRsi = Math.round(rsi);
    if (type.includes('Buy')) {
        if (roundedRsi <= 17) rsiWarning = '⭐⭐';
        else if (roundedRsi <= 20) rsiWarning = '⭐';
    } else {
        if (roundedRsi >= 85) rsiWarning = '⭐⭐';
        else if (roundedRsi >= 80) rsiWarning = '⭐';
    }

    const cleanSymbol = symbol.replace(/[^\x00-\x7F]/g, '');

    const message = `${type.includes('Buy') ? '📈' : '📉'} *[1 GÜN] #${cleanSymbol} ${type.toUpperCase()}*\n` +
        `──────────────────\n` +
        (demaAlert ? '🧘 *Yana Mum / DEMA Tespiti*\n' : '') +
        `• *Fiyat:* ${price.toFixed(4)}\n` +
        `• *Günlük RSI:* ${roundedRsi} ${rsiWarning} (Sinyal)\n` +
        `• *1 Saatlik RSI:* ${rsi1h}\n` +
        `• *4 Saatlik RSI:* ${rsi4h}\n` +
        `• *Günlük RSI:* ${rsi1d}\n` +
        `• *Stoch:* ${Math.round(k)}(K)/${Math.round(d)}(D)\n` +
        `• *Hacim:* ${vol}\n` +
        `──────────────────\n` +
        `🔗 [Binance Futures](${binanceUrl}) | ⏰ ${now}`;

    console.log(`📡 [1d Dashboard Signal] ${symbol} ${type.toUpperCase()} @ ${price.toFixed(4)}`);

    // Broadcast to Local Web Dashboard via REST API
    try {
        const signalData = {
            timeframe: '1d',
            coin: symbol,
            date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }),
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            position: type.includes('Buy') ? 'Long' : 'Short',
            price,
            rsi: Math.round(rsi),
            rsiWarning,
            rsi1h,
            rsi4h,
            rsi1d: Math.round(rsi), // itself
            stochK: Math.round(k),
            stochD: Math.round(d),
            volume: vol,
            trend,
            demaAlert,
            isWTDip: type.includes('WT Dip'),
            supplyStr
        };
        await axios.post('http://localhost:3000/api/signals/emit', signalData);
    } catch (err) {
        console.error('Failed to emit 1D signal to dashboard:', err.message);
    }
}

// AI Analysis Function - GEMINI SUSPENDED
async function getAIAnalysis() { return null; }

// --- MATH HELPERS ---
function calculateRSI(d, p) {
    let g = 0, l = 0;
    for (let i = 1; i <= p; i++) {
        let diff = d[i].close - d[i - 1].close;
        if (diff >= 0) g += diff; else l -= diff;
    }
    let rsi = [100 - (100 / (1 + (g / p) / (l / p || 1)))];
    let ag = g / p, al = l / p;
    for (let i = p + 1; i < d.length; i++) {
        let diff = d[i].close - d[i - 1].close;
        ag = (ag * (p - 1) + (diff > 0 ? diff : 0)) / p;
        al = (al * (p - 1) + (diff < 0 ? -diff : 0)) / p;
        rsi.push(100 - (100 / (1 + (ag / (al || 1)))));
    }
    return rsi;
}

function calculateStochRSI(d, rP, sP, kP, dP) {
    const r = calculateRSI(d, rP);
    let s = [];
    for (let i = sP; i <= r.length; i++) {
        let w = r.slice(i - sP, i);
        let low = Math.min(...w), h = Math.max(...w);
        if (h === low) {
            s.push(100);
        } else {
            // Logaritmik Normalizasyon: ln(curr/low) / ln(high/low)
            // RSI değerlerinin 0'dan büyük olmasını garanti ediyoruz (RSI her zaman 0-100 arasıdır, 0.01 ekleyerek güvenliğe alıyoruz)
            const safeR = Math.max(r[i - 1], 0.01);
            const safeL = Math.max(low, 0.01);
            const safeH = Math.max(h, 0.01);
            const logStoch = Math.log(safeR / safeL) / Math.log(safeH / safeL);
            s.push(logStoch * 100);
        }
    }
    const kData = s.map((v, i, a) => a.slice(Math.max(0, i - kP + 1), i + 1).reduce((p, c) => p + c, 0) / kP);
    const dData = kData.map((v, i, a) => a.slice(Math.max(0, i - dP + 1), i + 1).reduce((p, c) => p + c, 0) / dP);
    return { k: kData, d: dData };
}

function calculateADX(d, p) {
    let tr = [], dmP = [], dmM = [];
    for (let i = 1; i < d.length; i++) {
        let h = d[i].high, l = d[i].low, pc = d[i - 1].close, ph = d[i - 1].high, pl = d[i - 1].low;
        tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
        dmP.push(h - ph > pl - l && h - ph > 0 ? h - ph : 0);
        dmM.push(pl - l > h - ph && pl - l > 0 ? pl - l : 0);
    }
    let smoothTR = [], smoothDMP = [], smoothDMM = [];
    let sumTR = tr.slice(0, p).reduce((a, b) => a + b, 0), sumDMP = dmP.slice(0, p).reduce((a, b) => a + b, 0), sumDMM = dmM.slice(0, p).reduce((a, b) => a + b, 0);
    smoothTR.push(sumTR); smoothDMP.push(sumDMP); smoothDMM.push(sumDMM);
    for (let i = p; i < tr.length; i++) {
        sumTR = sumTR - (sumTR / p) + tr[i];
        sumDMP = sumDMP - (sumDMP / p) + dmP[i];
        sumDMM = sumDMM - (sumDMM / p) + dmM[i];
        smoothTR.push(sumTR); smoothDMP.push(sumDMP); smoothDMM.push(sumDMM);
    }
    let dx = [];
    for (let i = 0; i < smoothTR.length; i++) {
        let diP = (smoothDMP[i] / smoothTR[i]) * 100, diM = (smoothDMM[i] / smoothTR[i]) * 100;
        dx.push(Math.abs(diP - diM) / (diP + diM) * 100);
    }
    let adx = [dx.slice(0, p).reduce((a, b) => a + b, 0) / p];
    for (let i = p; i < dx.length; i++) adx.push((adx[adx.length - 1] * (p - 1) + dx[i]) / p);
    return adx;
}

function detectDivergence(klines, rsi, stochK) {
    const lookback = 10;
    if (klines.length < lookback + 5 || rsi.length < lookback + 5) return null;
    const recentPrices = klines.slice(-lookback).map(k => k.close);
    const recentRSI = rsi.slice(-lookback);
    const recentStochK = stochK.slice(-lookback);
    const midPoint = Math.floor(lookback / 2);
    const earlyPriceAvg = recentPrices.slice(0, midPoint).reduce((a, b) => a + b, 0) / midPoint;
    const latePriceAvg = recentPrices.slice(midPoint).reduce((a, b) => a + b, 0) / (lookback - midPoint);
    const priceTrend = latePriceAvg - earlyPriceAvg;
    const earlyRSIAvg = recentRSI.slice(0, midPoint).reduce((a, b) => a + b, 0) / midPoint;
    const lateRSIAvg = recentRSI.slice(midPoint).reduce((a, b) => a + b, 0) / (lookback - midPoint);
    const rsiTrend = lateRSIAvg - earlyRSIAvg;
    const earlyStochAvg = recentStochK.slice(0, midPoint).reduce((a, b) => a + b, 0) / midPoint;
    const lateStochAvg = recentStochK.slice(midPoint).reduce((a, b) => a + b, 0) / (lookback - midPoint);
    const stochTrend = lateStochAvg - earlyStochAvg;
    const threshold = 0.001;
    if (priceTrend < -threshold && (rsiTrend > threshold || stochTrend > threshold)) return 'bullish';
    if (priceTrend > threshold && (rsiTrend < -threshold || stochTrend < -threshold)) return 'bearish';
    return null;
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

function calculateWaveTrend(klines) {
    const n1 = 10, n2 = 21;
    const ap = klines.map(k => k.hlc3);
    if (ap.length < n2) return { wt1: 0, wt2: 0, cross: null };
    const ema = (data, len) => {
        const k = 2 / (len + 1);
        let res = [data[0]];
        for (let i = 1; i < data.length; i++) res.push(data[i] * k + res[i - 1] * (1 - k));
        return res;
    };
    const esa = ema(ap, n1);
    const d = ema(ap.map((v, i) => Math.abs(v - esa[i])), n1);
    const ci = ap.map((v, i) => (v - esa[i]) / (0.015 * d[i] || 1));
    const wt1 = ema(ci, n2);
    const wt2 = wt1.map((v, i, a) => a.slice(Math.max(0, i - 3), i + 1).reduce((s, c) => s + c, 0) / (i < 3 ? i + 1 : 4));
    let cross = null;
    const last = wt1.length - 1;
    if (wt1[last - 1] < wt2[last - 1] && wt1[last] > wt2[last]) cross = 'Yükseliş 🟢';
    else if (wt1[last - 1] > wt2[last - 1] && wt1[last] < wt2[last]) cross = 'Düşüş 🔴';
    return { wt1: wt1[last], wt2: wt2[last], cross };
}

function calculateBollingerBands(closes, period = 20, stdDev = 2) {
    if (closes.length < period) return Array(closes.length).fill({ lower: 0, middle: 0, upper: 0 });

    const bb = [];
    for (let i = 0; i < period - 1; i++) bb.push({ lower: 0, middle: 0, upper: 0 });

    for (let i = period - 1; i < closes.length; i++) {
        const slice = closes.slice(i - period + 1, i + 1);
        const sum = slice.reduce((a, b) => a + b, 0);
        const mean = sum / period;

        const variances = slice.map(v => Math.pow(v - mean, 2));
        const varianceSum = variances.reduce((a, b) => a + b, 0);
        const varianceAvg = varianceSum / period;
        const stdDeviation = Math.sqrt(varianceAvg);

        bb.push({
            lower: mean - (stdDeviation * stdDev),
            middle: mean,
            upper: mean + (stdDeviation * stdDev)
        });
    }
    return bb;
}

/**
 * Schedule scan to run exactly at the beginning of every daily candle (00:00 UTC)
 */
function scheduleNextScan() {
    const now = Date.now();
    const intervalMs = 24 * 60 * 60 * 1000;
    const nextScan = Math.ceil(now / intervalMs) * intervalMs;
    // Delay slightly (5s) after the candle opens to ensure exchange data is ready
    const delay = nextScan - now + 5000;

    console.log(`⏰ Bir sonraki 1G tarama ${new Date(nextScan).toLocaleTimeString()} saatinde yapılacak.`);
    setTimeout(async () => {
        await performScan();
        scheduleNextScan();
    }, delay);
}

// Initial start
scheduleNextScan();
performScan();
