const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load config
dotenv.config({ path: path.join(__dirname, '.env') });

const processedSignals = new Map();
const COOLDOWN_PERIOD = 12 * 60 * 60 * 1000; // 12 hours cooldown for 4h signals
const TIMEFRAME = '4h';

console.log('⚡ CoinKe V2.0 (4 Saatlik & Futures) Aktif! (Telegram Devre Dışı)');

let activeTradingPairs = new Set();
async function loadActiveTradingPairs() {
    try {
        console.log('🔄 Exchange Info yüklüyor (4H)...');
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
        console.log(`✅ ${activeTradingPairs.size} aktif USDT çifti yüklendi (4H)`);
    } catch (e) {
        console.error('❌ Exchange Info yüklenemedi:', e.message);
    }
}

async function getFuturesSymbols() {
    try {
        const res = await axios.get('https://fapi.binance.com/fapi/v1/exchangeInfo');
        return res.data.symbols
            .filter(s => s.quoteAsset === 'USDT' && s.status === 'TRADING' && s.contractType === 'PERPETUAL')
            .filter(s => activeTradingPairs.has(s.symbol))
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
        console.log(`🔍 [${new Date().toLocaleTimeString()}] 4sa Futures Taraması Başlıyor...`);
        const symbols = await getFuturesSymbols();
        console.log(`📈 Toplam ${symbols.length} aktif Futures çifti taranacak.`);

        for (const symbol of symbols) {
            await checkCoin(symbol);
            await new Promise(r => setTimeout(r, 60));
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

    } catch (e) {
        console.error('Tarama Hatası:', e.message);
    }
}

async function checkCoin(symbol) {
    try {
        // Limit 500 yapıldı (Daha hassas RSI için)
        const res = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${TIMEFRAME}&limit=500`);
        let klines = res.data.map(k => ({
            close: parseFloat(k[4])
        }));

        // Remove the last candle (currently open/incomplete)
        klines.pop();

        if (klines.length < 50) return false;

        const rsi = calculateRSI(klines, 14);
        const stoch = calculateStochRSI(klines, 14, 14, 3, 3);

        // Since we popped the last one, 'last' indices refer to the closed candle
        const lastRsi = rsi[rsi.length - 1];
        const lastK = stoch.k[stoch.k.length - 1];
        const lastD = stoch.d[stoch.d.length - 1];

        const price = klines[klines.length - 1].close;

        let signalType = null;
        if (lastRsi <= 25) signalType = 'Buy 🟢';
        else if (lastRsi >= 70) signalType = 'Sell 🔴';

        // Track for summary
        lowestRSI.push({ symbol, rsi: lastRsi });
        highestRSI.push({ symbol, rsi: lastRsi });

        if (signalType) {
            const key = `${symbol}_${signalType}`;
            if (!processedSignals.has(key) || (Date.now() - processedSignals.get(key) > COOLDOWN_PERIOD)) {
                processedSignals.set(key, Date.now());

                const rsi15m = await getMTFRSI(symbol, '15m');
                const rsi1h = await getMTFRSI(symbol, '1h');
                const rsi1d = await getMTFRSI(symbol, '1d');

                await sendAlert(symbol, signalType, price, lastRsi, lastK, lastD, rsi15m, rsi1h, rsi1d);
                return true;
            }
        }
    } catch (e) { return false; }
}

async function getMTFRSI(symbol, interval) {
    try {
        const res = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=500`); // increased limit here too
        let klines = res.data.map(k => ({ close: parseFloat(k[4]) }));
        klines.pop(); // Consistency: use closed candle for MTF too

        if (klines.length < 50) return 'N/A';
        const rsi = calculateRSI(klines, 14);
        return Math.round(rsi[rsi.length - 1]);
    } catch (e) { return 'N/A'; }
}

async function sendAlert(symbol, type, price, rsi, k, d, rsi15m, rsi1h, rsi1d) {
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const binanceUrl = `https://www.binance.com/en/futures/${symbol}`;

    let rsiWarning = '⭐';
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

    const trendEmoji = type.includes('Buy') ? '🟢 🟢 🟢' : '🔴 🔴 🔴';
    const direction = type.includes('Buy') ? 'LONG (AL)' : 'SHORT (SAT)';
    const cleanSymbol = symbol.replace('USDT', '');

    // 4H Style: EXTRA LARGE VISIBILITY
    const message = `\n` +
        `${trendEmoji}\n` +
        `*🚨 4 SAATLİK DEV SİNYAL 🚨*\n` +
        `\n` +
        `#${cleanSymbol}  ➡️  *${direction}*\n` +
        `Fiyat: *${price.toFixed(4)}*\n` +
        `\n` +
        `📊 *RSI:* ${roundedRsi} ${rsiWarning}\n` +
        `📈 *Stoch:* ${Math.round(k)}/${Math.round(d)}\n` +
        `\n` +
        `-- Diğer Zamanlar --\n` +
        `1s: ${rsi1h}  |  Günlük: ${rsi1d}\n` +
        `\n` +
        `🔗 [BINANCE'DE GÖR](${binanceUrl})`;

    console.log(`📡 [4h Dashboard Signal] ${symbol} ${type.toUpperCase()} @ ${price.toFixed(4)}`);

    // Broadcast to Local Web Dashboard via REST API
    try {
        const signalData = {
            timeframe: '4h',
            coin: symbol,
            date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }),
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            position: type.includes('Buy') ? 'Long' : 'Short',
            price,
            rsi: Math.round(rsi),
            rsiWarning,
            rsi15m,
            rsi1h,
            rsi1d,
            stochK: Math.round(k),
            stochD: Math.round(d)
        };
        await axios.post('http://localhost:3000/api/signals/emit', signalData);
    } catch (err) {
        console.error('Failed to emit 4H signal to dashboard:', err.message);
    }
}

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
        if (h === low) s.push(100);
        else {
            const logStoch = Math.log(Math.max(r[i - 1], 0.01) / Math.max(low, 0.01)) / Math.log(Math.max(h, 0.01) / Math.max(low, 0.01));
            s.push(logStoch * 100);
        }
    }
    const kData = s.map((v, i, a) => a.slice(Math.max(0, i - kP + 1), i + 1).reduce((p, c) => p + c, 0) / kP);
    const dData = kData.map((v, i, a) => a.slice(Math.max(0, i - dP + 1), i + 1).reduce((p, c) => p + c, 0) / dP);
    return { k: kData, d: dData };
}

function scheduleNextScan() {
    const now = Date.now();
    const intervalMs = 4 * 60 * 60 * 1000;
    const nextScan = Math.ceil(now / intervalMs) * intervalMs;
    const delay = nextScan - now + 5000;
    console.log(`⏰ Bir sonraki tarama ${new Date(nextScan).toLocaleTimeString()} saatinde yap\u0131lacak.`);
    setTimeout(async () => { await performScan(); scheduleNextScan(); }, delay);
}

async function init() {
    await loadActiveTradingPairs();
    scheduleNextScan();
    await performScan();
}

init();
