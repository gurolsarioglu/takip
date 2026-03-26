const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const technicalService = require('../backend/services/technical.service');

// Load config
dotenv.config({ path: path.join(__dirname, '.env') });

const processedSignals = new Map();
const COOLDOWN_PERIOD = 3 * 60 * 60 * 1000; // 3 hours cooldown for 1h signals
const TIMEFRAME = '1h';

console.log('⚡ CoinKe V2.0 (1 Saatlik & Futures) Aktif! (Telegram Devre Dışı)');

/**
 * Fetch all active USDT Futures symbols and filter out delisted/leverage tokens
 */
let activeTradingPairs = new Set();
async function loadActiveTradingPairs() {
    try {
        console.log('🔄 Exchange Info yüklüyor (1H)...');
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
        console.log(`✅ ${activeTradingPairs.size} aktif USDT çifti yüklendi (1H)`);
    } catch (e) {
        console.error('❌ Exchange Info yüklenemedi:', e.message);
    }
}

async function getFuturesSymbols() {
    try {
        const res = await axios.get('https://fapi.binance.com/fapi/v1/exchangeInfo');
        return res.data.symbols
            .filter(s => s.quoteAsset === 'USDT' && s.status === 'TRADING' && s.contractType === 'PERPETUAL')
            .filter(s => activeTradingPairs.has(s.symbol)) // Delist filtresi
            .map(s => s.symbol);
    } catch (e) {
        console.error('Sembol listesi alınamadı:', e.message);
        return [];
    }
}

// We will load this in init()
// loadActiveTradingPairs();


// Global trackers for summary
let lowestRSI = [];
let highestRSI = [];

async function performScan() {

    // Reset trackers
    lowestRSI = [];
    highestRSI = [];

    try {
        console.log(`🔍 [${new Date().toLocaleTimeString()}] 1sa Futures Taraması Başlıyor...`);
        const symbols = await getFuturesSymbols();
        console.log(`📈 Toplam ${symbols.length} aktif Futures çifti taranacak.`);

        for (const symbol of symbols) {
            await checkCoin(symbol);
            await new Promise(r => setTimeout(r, 60)); // API limitlerini korumak için küçük bekleme
        }


        // Sort and Log Summary
        lowestRSI.sort((a, b) => a.rsi - b.rsi);
        highestRSI.sort((a, b) => b.rsi - a.rsi);

        console.log(`✅ [${new Date().toLocaleTimeString()}] Tarama Tamamlandı.`);

        console.log('\n📉 EN DÜŞÜK RSI (Oversold Candidates):');
        lowestRSI.slice(0, 3).forEach(c => console.log(`   #${c.symbol}: ${c.rsi.toFixed(2)}`));

        console.log('\n📈 EN YÜKSEK RSI (Overbought Candidates):');
        highestRSI.slice(0, 3).forEach(c => console.log(`   #${c.symbol}: ${c.rsi.toFixed(2)}`));
        console.log('--------------------------------------------------\n');

        // Schedule Delist Check (10 minutes after scan)
        console.log('⏳ Delist kontrolü 10 dakika sonra yapılacak...');
        setTimeout(() => checkDelistedCoins(), 10 * 60 * 1000);

    } catch (e) {
        console.error('Tarama Hatası:', e.message);
    }
}

async function checkDelistedCoins() {

    console.log(`💀 [${new Date().toLocaleTimeString()}] Delist Kontrolü Başlıyor...`);
    try {
        const res = await axios.get('https://fapi.binance.com/fapi/v1/exchangeInfo');
        const now = Date.now();

        // Filter for PERPETUAL contracts with a "soon" delivery date
        // Standard delivery date is ~2100 (4133404800000). Anything earlier is a scheduled settlement/delist.
        // REMOVED: s.status === 'TRADING' filter to catch 'SETTLING' or 'PRE_DELIVERING' coins.
        const delistingCoins = res.data.symbols.filter(s => {
            return s.contractType === 'PERPETUAL' &&
                s.deliveryDate > now &&
                s.deliveryDate < 4000000000000; // Filter out default 2100 date
        });

        if (delistingCoins.length === 0) {
            console.log('✅ Planlanmış delist/settlement bulunamadı.');
            return;
        }

        let message = '⚠️ *DELIST & SETTLEMENT UYARISI* ⚠️\n\n';

        delistingCoins.forEach(coin => {
            const delistTime = new Date(coin.deliveryDate);
            const timeLeft = coin.deliveryDate - now;

            // Calculate time left breakdown
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

            let timeString = '';
            if (days > 0) timeString += `${days}g `;
            if (hours > 0) timeString += `${hours}s `;
            timeString += `${minutes}d`;

            message += `🔻 *#${coin.symbol}*\n`;
            message += `📅 Tarih: ${delistTime.toLocaleString('tr-TR')}\n`;
            message += `⏳ Kalan: ${timeString}\n`;
            message += `──────────────────\n`;
        });

        message += `\n_Bu coinler yakın zamanda delist edilecek veya uzlaşıya (settlement) gidecektir. Pozisyonlarınızı kontrol ediniz._`;

        console.log(`⚠️ ${delistingCoins.length} adet delist uyarısı bulundu. (Log only, Telegram disabled)`);

    } catch (e) {
        console.error('Delist kontrolü hatası:', e.message);
    }
}

async function checkCoin(symbol) {
    try {
        // Limit 500 yapıldı (Daha hassas RSI için)
        const res = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${TIMEFRAME}&limit=500`);
        let klines = res.data.map(k => ({
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
        }));

        // Remove the last candle (which is the currently open/incomplete candle)
        // to rely only on CONFIRMED closed candle data.
        klines.pop();

        if (klines.length < 50) return false;

        const rsi = technicalService.calculateFullRSI(klines, 14);
        const stoch = technicalService.calculateFullStochRSI(klines, 14, 14, 3, 3);
        const adx = technicalService.calculateADX(klines, 14);

        // Now 'last' data points refer to the closed candle
        const lastRsi = rsi[rsi.length - 1];
        const lastK = stoch.k[stoch.k.length - 1];
        const lastD = stoch.d[stoch.d.length - 1];
        // const lastAdx = adx[adx.length - 1];

        const price = klines[klines.length - 1].close;
        const prev = klines[klines.length - 2].close;
        const boost = ((price - prev) / prev * 100).toFixed(2);

        // const divergence = detectDivergence(klines, rsi, stoch.k);

        let signalType = null;

        // SCALPER CRITERIA (Updated: Wider Range)
        if (lastRsi <= 25) signalType = 'Buy 🟢';
        else if (lastRsi >= 70) signalType = 'Sell 🔴';

        // Track for summary
        lowestRSI.push({ symbol, rsi: lastRsi });
        highestRSI.push({ symbol, rsi: lastRsi });

        if (signalType) {
            const key = `${symbol}_${signalType}`;
            if (!processedSignals.has(key) || (Date.now() - processedSignals.get(key) > COOLDOWN_PERIOD)) {
                processedSignals.set(key, Date.now());

                const lastVol = klines[klines.length - 1].volume;
                const avgVol = klines.slice(-11, -1).reduce((s, k) => s + k.volume, 0) / 10;
                let volStatus = lastVol > (avgVol * 1.05) ? "🔥 YÜKSEK HACİM" : "Normal";

                // Multi-Timeframe detaylı analiz
                const rsi15m    = await getMTFRSI(symbol, '15m');
                const detail4h  = await getMTFDetail(symbol, '4h');
                const detail1d  = await getMTFDetail(symbol, '1d');
                const rsi4h     = detail4h ? detail4h.rsi : 'N/A';
                const rsi1d     = detail1d ? detail1d.rsi : 'N/A';
                const swingComment = generateSwingComment(signalType, detail4h, detail1d);

                const binanceService = require('../backend/services/binance.service');
                const supplyData = await binanceService.getSupplyData(symbol);
                let supplyStr = 'Bilinmiyor';
                if (supplyData) {
                    supplyStr = `%${supplyData.ratio}` + (supplyData.isMax ? ' !!!' : '');
                }

                await sendAlert(symbol, signalType, boost, price, lastRsi, lastK, lastD, volStatus, rsi15m, rsi4h, rsi1d, swingComment, supplyStr);
                return true;
            }
        }
    } catch (e) { return false; }
}

async function getMTFRSI(symbol, interval) {
    try {
        const res = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=500`);
        let klines = res.data.map(k => ({ close: parseFloat(k[4]) }));
        klines.pop();
        if (klines.length < 50) return null;
        const rsi = technicalService.calculateFullRSI(klines, 14);
        return Math.round(rsi[rsi.length - 1]);
    } catch (e) { return 'N/A'; }
}

async function getMTFDetail(symbol, interval) {
    try {
        const res = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=100`);
        const klines = res.data.map(k => ({
            high:  parseFloat(k[2]),
            low:   parseFloat(k[3]),
            close: parseFloat(k[4]),
            hlc3:  (parseFloat(k[2]) + parseFloat(k[3]) + parseFloat(k[4])) / 3
        }));
        if (klines.length < 50) return null;

        const rsiArr = technicalService.calculateFullRSI(klines, 14);
        const stoch  = technicalService.calculateFullStochRSI(klines, 14, 14, 3, 3);
        const wt     = technicalService.calculateWaveTrend(klines);

        const lastRsi  = rsiArr[rsiArr.length - 1];
        const prevRsi1 = rsiArr[rsiArr.length - 2];
        const rsiSlope = lastRsi - prevRsi1;
        const rsiDir   = rsiSlope > 1 ? '↑' : rsiSlope < -1 ? '↓' : '→';

        let periodsOB = 0;
        for (let i = rsiArr.length - 1; i >= 0; i--) {
            if (lastRsi >= 70 && rsiArr[i] >= 70) periodsOB++;
            else if (lastRsi <= 30 && rsiArr[i] <= 30) periodsOB++;
            else break;
        }

        const lastK = stoch.k[stoch.k.length - 1];
        const lastD = stoch.d[stoch.d.length - 1];
        const prevK = stoch.k[stoch.k.length - 2];
        const prevD = stoch.d[stoch.d.length - 2];
        const stochColor = lastK < lastD ? 'kırmızı' : 'yeşil';
        const stochJustFlipped = (prevK >= prevD && lastK < lastD) || (prevK <= prevD && lastK > lastD);

        return {
            rsi: Math.round(lastRsi),
            rsiDir, periodsOB,
            stochK: Math.round(lastK),
            stochD: Math.round(lastD),
            stochColor, stochJustFlipped,
            wtLevel: Math.round(wt.wt1),
            wtCross: wt.cross
        };
    } catch (e) { return null; }
}

function generateSwingComment(signalType, d4h, d1d) {
    if (!d4h && !d1d) return null;
    const isShort = signalType.toLowerCase().includes('sell');
    const lines   = [];

    if (d4h) {
        const e4h   = d4h.stochColor === 'kırmızı' ? '🔴' : '🟢';
        const wt4h  = d4h.wtCross ? ` | WT ${d4h.wtLevel} (${d4h.wtCross.includes('Düşüş') ? 'cross kırmızı' : 'cross yeşil'})` : ` | WT ${d4h.wtLevel}`;
        let l4h     = `📊 4H: RSI ${d4h.rsi}${d4h.rsiDir} | SRSI ${e4h} (K:${d4h.stochK}/D:${d4h.stochD})${wt4h}`;
        if (d4h.stochJustFlipped) l4h += d4h.stochColor === 'kırmızı' ? ' ⚡kırmızıya döndü' : ' ⚡yeşile döndü';
        lines.push(l4h);
    }
    if (d1d) {
        const e1d   = d1d.stochColor === 'kırmızı' ? '🔴' : '🟢';
        const obStr = d1d.periodsOB >= 2 ? ` (${d1d.periodsOB} muddur)` : '';
        const obLbl = (isShort && d1d.rsi >= 70) ? ` OB${obStr}` : (!isShort && d1d.rsi <= 30) ? ` OS${obStr}` : '';
        const wt1d  = d1d.wtCross ? ` | WT ${d1d.wtLevel} (${d1d.wtCross.includes('Düşüş') ? 'cross kırmızı' : 'cross yeşil'})` : ` | WT ${d1d.wtLevel}`;
        let l1d     = `📅 1D: RSI ${d1d.rsi}${d1d.rsiDir}${obLbl} | SRSI ${e1d} (K:${d1d.stochK}/D:${d1d.stochD})${wt1d}`;
        if (d1d.stochJustFlipped) l1d += d1d.stochColor === 'kırmızı' ? ' ⚡kırmızıya döndü' : ' ⚡yeşile döndü';
        lines.push(l1d);
    }

    const strong = [];
    if (isShort) {
        if (d1d && d1d.rsi >= 75 && d1d.rsiDir === '↓')      strong.push('1D RSI aşağı kıvrılıyor');
        if (d1d && d1d.stochColor === 'kırmızı')              strong.push('1D SRSI kırmızı');
        if (d1d && d1d.periodsOB >= 3)                        strong.push(`1D ${d1d.periodsOB} muddur OB`);
        if (d4h && d4h.rsiDir === '↓' && d4h.rsi >= 55)       strong.push('4H momentum kırılıyor');
        if (d4h && d4h.wtCross && d4h.wtCross.includes('Düşüş')) strong.push('4H WT kırmızı cross');
        if (d1d && d1d.wtCross && d1d.wtCross.includes('Düşüş')) strong.push('1D WT kırmızı cross');
    } else {
        if (d1d && d1d.rsi <= 25 && d1d.rsiDir === '↑')      strong.push('1D RSI yukarı kıvrılıyor');
        if (d1d && d1d.stochColor === 'yeşil')                strong.push('1D SRSI yeşil');
        if (d1d && d1d.periodsOB >= 3)                        strong.push(`1D ${d1d.periodsOB} muddur OS`);
        if (d4h && d4h.rsiDir === '↑' && d4h.rsi <= 45)       strong.push('4H momentum dönüyor');
        if (d4h && d4h.wtCross && d4h.wtCross.includes('Yükseliş')) strong.push('4H WT yeşil cross');
        if (d1d && d1d.wtCross && d1d.wtCross.includes('Yükseliş')) strong.push('1D WT yeşil cross');
    }
    if (strong.length >= 3) lines.push(`⚠️ Güçlü ${isShort ? 'short' : 'long'}: ${strong.join(' + ')}`);
    else if (strong.length >= 1) lines.push(`💡 ${strong.join(' + ')}`);

    return lines.length > 0 ? lines.join('\n') : null;
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
    const esa  = ema(ap, n1);
    const d    = ema(ap.map((v, i) => Math.abs(v - esa[i])), n1);
    const ci   = ap.map((v, i) => (v - esa[i]) / (0.015 * d[i] || 1));
    const wt1  = ema(ci, n2);
    const wt2  = wt1.map((v, i, a) => a.slice(Math.max(0, i - 3), i + 1).reduce((s, c) => s + c, 0) / (i < 3 ? i + 1 : 4));
    let cross  = null;
    const last = wt1.length - 1;
    if (wt1[last - 1] < wt2[last - 1] && wt1[last] > wt2[last]) cross = 'Yükseliş 🟢';
    else if (wt1[last - 1] > wt2[last - 1] && wt1[last] < wt2[last]) cross = 'Düşüş 🔴';
    return { wt1: wt1[last], wt2: wt2[last], cross };
}


async function sendAlert(symbol, type, boost, price, rsi, k, d, vol, rsi15m, rsi4h, rsi1d, swingComment = null, supplyStr = 'Bilinmiyor') {
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const binanceUrl = `https://www.binance.com/en/futures/${symbol}`;

    // RSI Star & Exclamation Rules (Updated)
    // BUY: <=20 (3 Stars), <=23 (2 Stars), <=25 (1 Star)
    // SELL: >=75 (3 Stars), >=73 (2 Stars), >=70 (1 Star)
    let rsiWarning = '⭐'; // Default 1 star if triggered
    const roundedRsi = Math.round(rsi);

    if (type.includes('Buy')) {
        if (roundedRsi <= 20) rsiWarning = '⭐⭐⭐';
        else if (roundedRsi <= 23) rsiWarning = '⭐⭐';
        else if (roundedRsi <= 25) rsiWarning = '⭐';
    } else {
        if (roundedRsi >= 75) rsiWarning = '⭐⭐⭐';
        else if (roundedRsi >= 73) rsiWarning = '⭐⭐';
        else if (roundedRsi >= 70) rsiWarning = '⭐';
    }

    const cleanSymbol = symbol.replace(/[^\x00-\x7F]/g, '');

    // 1H Style: Lighter emojis (Blue/Orange), Less Bold to simulate "smaller/lighter" text
    const trendEmoji = type.includes('Buy') ? '🔹' : '🔸';

    const message = `${trendEmoji} *[1 Saatlik Sinyal]*\n` +
        `#${cleanSymbol} ${type.toUpperCase()}\n` +
        `──────────────────\n` +
        `Fiyat: ${price.toFixed(4)} (${boost > 0 ? '+' : ''}${boost}%)\n` +
        `RSI (1s): ${roundedRsi} ${rsiWarning}\n` +
        `RSI (15d): ${rsi15m}\n` +
        `RSI (4s): ${rsi4h}\n` +
        `Stoch: ${Math.round(k)}/${Math.round(d)}\n` +
        `Hacim: ${vol}\n` +
        `──────────────────\n` +
        `🔗 [Binance](${binanceUrl}) | ⏰ ${now}`;

    console.log(`📡 [1h Dashboard Signal] ${symbol} ${type.toUpperCase()} @ ${price.toFixed(4)}`);

    // Broadcast to Local Web Dashboard via REST API
    try {
        const signalData = {
            timeframe: '1h',
            coin: symbol,
            date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }),
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            position: type.includes('Buy') ? 'Long' : 'Short',
            price,
            rsi: Math.round(rsi),
            rsiWarning,
            rsi15m,
            rsi4h,
            rsi1d,
            stochK: Math.round(k),
            stochD: Math.round(d),
            volume: vol,
            swingComment,
            supplyStr
        };
        await axios.post('http://localhost:3000/api/signals/emit', signalData);
    } catch (err) {
        console.error('Failed to emit 1H signal to dashboard:', err.message);
    }
}

// Backend Technical Service used instead of hard-coded logic

/**
 * Schedule scan to run exactly at the beginning of every 1-hour candle
 */
function scheduleNextScan() {
    const now = Date.now();
    const intervalMs = 60 * 60 * 1000;
    const nextScan = Math.ceil(now / intervalMs) * intervalMs;
    // Delay slightly (5s) after the candle opens to ensure exchange data is ready
    const delay = nextScan - now + 5000;

    console.log(`⏰ Bir sonraki tarama ${new Date(nextScan).toLocaleTimeString()} saatinde yap\u0131lacak.`);
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
