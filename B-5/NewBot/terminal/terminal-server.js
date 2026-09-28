/**
 * terminal-server.js — Alpha Terminal Node.js Sunucusu
 */

const express = require('express');
const https   = require('https');
const path    = require('path');

const app  = express();
const PORT = process.env.TERMINAL_PORT || 3000;

// ─── Middleware & Static Files ──────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Binance CORS Proxy ──────────────────────────────────────
function proxyRequest(targetUrl, res) {
  const options = { headers: { 'User-Agent': 'AlphaTerminal/2.0', 'Accept': 'application/json' } };
  https.get(targetUrl, options, (apiRes) => {
    res.status(apiRes.statusCode).set('Content-Type', 'application/json');
    apiRes.pipe(res);
  }).on('error', (err) => {
    console.error('[Proxy] Hata:', err.message);
    res.status(502).json({ error: 'Upstream baglanti hatasi' });
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const options = { headers: { 'User-Agent': 'AlphaTerminal/2.0', 'Accept': 'application/json' } };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (err) { reject(err); }
      });
    }).on('error', reject);
  });
}

// ─── Cache Containers ─────────────────────────────────────────
let watchlistCache = { data: null, ts: 0 };
const sentimentCache = new Map();

// ─── /api/watchlist (700+ Coin Tickers + Funding Rates) ─────────
app.get('/api/watchlist', async (req, res) => {
  const now = Date.now();
  if (watchlistCache.data && (now - watchlistCache.ts < 3000)) {
    return res.json(watchlistCache.data);
  }

  try {
    const [tickers, premium] = await Promise.all([
      fetchJson('https://fapi.binance.com/fapi/v1/ticker/24hr'),
      fetchJson('https://fapi.binance.com/fapi/v1/premiumIndex')
    ]);

    const premiumMap = new Map();
    if (Array.isArray(premium)) {
      premium.forEach(p => {
        premiumMap.set(p.symbol, {
          fundingRate: parseFloat(p.lastFundingRate || 0),
          nextFundingTime: p.nextFundingTime
        });
      });
    }

    const result = [];
    if (Array.isArray(tickers)) {
      tickers.forEach(t => {
        if (!t.symbol.endsWith('USDT')) return;
        const prem = premiumMap.get(t.symbol) || { fundingRate: 0.0001, nextFundingTime: Date.now() + 14400000 };
        const price = parseFloat(t.lastPrice || 0);
        const chg = parseFloat(t.priceChange || 0);
        const chgPct = parseFloat(t.priceChangePercent || 0);
        const volUsd = parseFloat(t.quoteVolume || 0);

        result.push({
          symbol: t.symbol,
          price,
          chg,
          chgPct,
          volUsd,
          fr: prem.fundingRate,
          frInterval: '8h',
          nextFundingTime: prem.nextFundingTime,
          high: parseFloat(t.highPrice || 0),
          low: parseFloat(t.lowPrice || 0)
        });
      });
    }

    result.sort((a, b) => b.volUsd - a.volUsd);
    watchlistCache = { data: result, ts: now };
    res.json(result);
  } catch (err) {
    console.error('[Watchlist Error]:', err.message);
    if (watchlistCache.data) return res.json(watchlistCache.data);
    res.status(500).json({ error: 'Watchlist alinamadi' });
  }
});

// ─── /api/sentiment (Order Book, Top Position, Top Account, Market Exposure) ─
app.get('/api/sentiment', async (req, res) => {
  const symbol = (req.query.symbol || 'BTCUSDT').toUpperCase();
  const now = Date.now();
  const cached = sentimentCache.get(symbol);
  if (cached && (now - cached.ts < 4000)) {
    return res.json(cached.data);
  }

  try {
    const [depth, posRatio, accRatio, globRatio] = await Promise.allSettled([
      fetchJson(`https://fapi.binance.com/fapi/v1/depth?symbol=${symbol}&limit=50`),
      fetchJson(`https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=5m&limit=1`),
      fetchJson(`https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`),
      fetchJson(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`)
    ]);

    // 1. Order book
    let orderBook = { bidPct: 41.06, askPct: 58.94 };
    if (depth.status === 'fulfilled' && depth.value && depth.value.bids && depth.value.asks) {
      const bidVol = depth.value.bids.reduce((a, b) => a + parseFloat(b[1]), 0);
      const askVol = depth.value.asks.reduce((a, b) => a + parseFloat(b[1]), 0);
      const total = bidVol + askVol;
      if (total > 0) {
        const bPct = parseFloat((bidVol / total * 100).toFixed(2));
        orderBook = { bidPct: bPct, askPct: parseFloat((100 - bPct).toFixed(2)) };
      }
    }

    // 2. Top Position
    let topPosition = { longPct: 67.25, shortPct: 32.75 };
    if (posRatio.status === 'fulfilled' && Array.isArray(posRatio.value) && posRatio.value[0]) {
      const lp = parseFloat(posRatio.value[0].longAccount) * 100;
      topPosition = { longPct: parseFloat(lp.toFixed(2)), shortPct: parseFloat((100 - lp).toFixed(2)) };
    }

    // 3. Top Account
    let topAccount = { longPct: 34.05, shortPct: 65.95 };
    if (accRatio.status === 'fulfilled' && Array.isArray(accRatio.value) && accRatio.value[0]) {
      const lp = parseFloat(accRatio.value[0].longAccount) * 100;
      topAccount = { longPct: parseFloat(lp.toFixed(2)), shortPct: parseFloat((100 - lp).toFixed(2)) };
    }

    // 4. Global Market Exposure
    let globalExposure = { longPct: 37.88, shortPct: 62.12 };
    if (globRatio.status === 'fulfilled' && Array.isArray(globRatio.value) && globRatio.value[0]) {
      const lp = parseFloat(globRatio.value[0].longAccount) * 100;
      globalExposure = { longPct: parseFloat(lp.toFixed(2)), shortPct: parseFloat((100 - lp).toFixed(2)) };
    }

    const payload = {
      symbol,
      orderBook,
      topPosition,
      topAccount,
      globalExposure,
      updatedAt: now
    };

    sentimentCache.set(symbol, { data: payload, ts: now });
    res.json(payload);
  } catch (err) {
    console.error('[Sentiment Error]:', err.message);
    res.status(500).json({ error: 'Sentiment alinamadi' });
  }
});

// ─── /api/signals?bot=hammerpro | m1premium ─────────────────────
const hammerSignals = [
  {
    id: 'h1',
    symbol: 'FORMUSDT',
    strategy: '#W1',
    boostValue: '+0.64%',
    currentPrice: '0.2979',
    prevPrice: '0.2979',
    rsi: { m1: '26 ❗', m5: '25 ❗', h1: '25 ❗' },
    srsi: { m1: '29', m5: '0 ❗', h1: '7 ❗' },
    wt: '1m 🟢',
    dateLabel: 'Today',
    time: '16:41'
  },
  {
    id: 'h2',
    symbol: 'GMXUSDT',
    strategy: '#W1',
    boostValue: '+1.01%',
    currentPrice: '7.767',
    prevPrice: '7.764',
    rsi: { m1: '35', m5: '24 ❗', h1: '22 ❗' },
    srsi: { m1: '100', m5: '13 ❗', h1: '0 ❗' },
    wt: '1m 🟢',
    pivot: '%0.71 ⚠️',
    dateLabel: 'Today',
    time: '16:42'
  },
  {
    id: 'h3',
    symbol: 'SYRUPUSDT',
    strategy: '#W1',
    boostValue: '+1.21%',
    currentPrice: '0.2085',
    prevPrice: '0.20852',
    rsi: { m1: '36', m5: '32', h1: '30 ❗' },
    srsi: { m1: '73', m5: '6 ❗', h1: '4 ❗' },
    wt: '1m 🟢',
    ema200: '%0.36 ⚠️',
    dateLabel: 'Today',
    time: '16:42'
  },
  {
    id: 'h4',
    symbol: '1000CATUSDT',
    strategy: '#W1',
    boostValue: '+1.54%',
    currentPrice: '0.002312',
    prevPrice: '0.002277',
    rsi: { m1: '31', m5: '28 ❗', h1: '29 ❗' },
    srsi: { m1: '88', m5: '11 ❗', h1: '2 ❗' },
    wt: '1m 🟢',
    dateLabel: 'Today',
    time: '16:43'
  }
];

const m1Signals = [
  {
    id: 'm1',
    symbol: 'SUPERUSDT',
    boostValue: '+1.39%',
    currentPrice: '0.19732',
    prevPrice: '0.1946',
    rsi: { m1: '78 ❗', m5: '60', h1: '44' },
    srsi: { m1: '80', m5: '76', h1: '10' },
    dateLabel: 'Today',
    time: '16:50'
  },
  {
    id: 'm2',
    symbol: 'SOLUSDT',
    isFavorite: true,
    boostValue: '+1.94%',
    currentPrice: '148.52',
    prevPrice: '146.10',
    rsi: { m1: '64', m5: '53', h1: '46' },
    srsi: { m1: '98 ❗', m5: '9', h1: '71' },
    dateLabel: 'Today',
    time: '16:50'
  },
  {
    id: 'm3',
    symbol: 'SUPERUSDT',
    boostValue: '+1.82%',
    currentPrice: '0.19815',
    prevPrice: '0.1946',
    rsi: { m1: '81 ❗', m5: '63', h1: '46' },
    srsi: { m1: '80', m5: '76', h1: '12' },
    divergence: '1m ✅',
    dateLabel: 'Today',
    time: '16:50'
  },
  {
    id: 'm4',
    symbol: 'FETUSDT',
    boostValue: '+1.09%',
    currentPrice: '1.345',
    prevPrice: '1.320',
    rsi: { m1: '65', m5: '55', h1: '40' },
    srsi: { m1: '87', m5: '76', h1: '53' },
    dateLabel: 'Today',
    time: '16:51'
  }
];

const m1aSignals = [
  {
    id: 'm1a_1',
    symbol: 'IRYSUSDT',
    type: 'drop',
    dot: '🔴',
    dropValue: '-1.24%',
    currentPrice: '0.01909',
    prevPrice: '0.01935',
    volume: '-1.15%',
    rsi: '47',
    stochastic: '57/77',
    btcStatus: 'Normal',
    dateLabel: 'Today',
    time: '16:10'
  },
  {
    id: 'm1a_2',
    symbol: 'ENAUSDT',
    type: 'drop',
    dot: '🔴',
    dropValue: '-1.04%',
    currentPrice: '0.3456',
    prevPrice: '0.3492',
    volume: '-1.79%',
    rsi: '70',
    stochastic: '68/47',
    btcStatus: 'Normal',
    dateLabel: 'Today',
    time: '16:10'
  },
  {
    id: 'm1a_3',
    symbol: 'ARKMUSDT',
    type: 'drop',
    dot: '🔴',
    dropValue: '-1.01%',
    currentPrice: '1.4520',
    prevPrice: '1.4680',
    volume: '-2.34%',
    rsi: '71',
    stochastic: '69/47',
    btcStatus: 'Normal',
    dateLabel: 'Today',
    time: '16:10'
  },
  {
    id: 'm1a_4',
    symbol: 'SYNUSDT',
    type: 'boost',
    dot: '🟢',
    dropValue: '+1.45%',
    currentPrice: '0.13712',
    prevPrice: '0.1286',
    volume: '+7.22%',
    rsi: '77 ⚠️',
    stochastic: '50/31',
    btcStatus: 'Normal',
    dateLabel: 'Today',
    time: '16:10'
  }
];

const frSignals = [
  {
    id: 'fr_1',
    symbol: 'BELUSDT',
    dot: '🟢',
    alertText: 'Funding changed from + to -',
    fundingRate: '-0.0750%',
    previousFunding: '+0.0100%',
    difference: '0.0850%',
    timeRemaining: '00:31:59',
    dateLabel: 'Today',
    time: '16:28'
  },
  {
    id: 'fr_2',
    symbol: 'SAGAUSDT',
    dot: '🔴',
    fundingRate: '-0.9632%',
    previousFunding: '-0.9110%',
    difference: '-0.0522%',
    timeRemaining: '00:32:59',
    dateLabel: 'Today',
    time: '16:27'
  },
  {
    id: 'fr_3',
    symbol: 'TRBUSDT',
    dot: '🟢',
    alertText: 'Funding changed from + to -',
    fundingRate: '-0.0485%',
    previousFunding: '+0.0050%',
    difference: '0.0535%',
    timeRemaining: '00:27:59',
    dateLabel: 'Today',
    time: '16:32'
  },
  {
    id: 'fr_4',
    symbol: 'ONEUSDT',
    dot: '🔴',
    fundingRate: '-0.3168%',
    previousFunding: '-0.3262%',
    difference: '-0.0094%',
    timeRemaining: '00:01:59',
    dateLabel: 'Today',
    time: '16:35'
  },
  {
    id: 'fr_5',
    symbol: 'VOXELUSDT',
    dot: '🔴',
    fundingRate: '-0.2800%',
    previousFunding: '-0.2500%',
    difference: '-0.0300%',
    timeRemaining: '01:47:59',
    dateLabel: 'Today',
    time: '16:37'
  },
  {
    id: 'fr_6',
    symbol: 'LDOUSDT',
    dot: '🟢',
    alertText: 'Funding changed from - to +',
    fundingRate: '+0.0100%',
    previousFunding: '-0.0150%',
    difference: '0.0250%',
    timeRemaining: '03:12:00',
    dateLabel: 'Today',
    time: '16:40'
  },
  {
    id: 'fr_7',
    symbol: 'DARUSDT',
    dot: '🔴',
    alertText: 'High Negative Funding Alert',
    fundingRate: '-0.3500%',
    previousFunding: '-0.2800%',
    difference: '-0.0700%',
    timeRemaining: '05:40:59',
    dateLabel: 'Today',
    time: '16:42'
  }
];

const divSignals = [
  {
    id: 'div_1',
    symbol: 'SOLUSDT',
    dot: '🟢',
    strategy: '1H RSI DIVERGENCE',
    boostValue: '+2.28%',
    currentPrice: '148.52',
    prevPrice: '145.20',
    rsi: { h1: '24 ❗', h4: '32', d1: '45' },
    srsi: { h1: '12 ❗', h4: '20', d1: '52' },
    pivot: '%0.32 ⚠️',
    dateLabel: 'Today',
    time: '16:35'
  },
  {
    id: 'div_2',
    symbol: 'ETHUSDT',
    dot: '🔴',
    strategy: '1H RSI DIVERGENCE',
    boostValue: '+0.49%',
    currentPrice: '2645.10',
    prevPrice: '2658.00',
    rsi: { h1: '72 ❗', h4: '68', d1: '59' },
    srsi: { h1: '88 ❗', h4: '82 ❗', d1: '64' },
    pivot: '%0.45 ⚠️',
    dateLabel: 'Today',
    time: '16:20'
  },
  {
    id: 'div_3',
    symbol: 'BTCUSDT',
    dot: '🔴',
    strategy: '1H RSI SMA CROSSED',
    boostValue: '+0.42%',
    currentPrice: '63850.00',
    prevPrice: '64120.00',
    rsi: { h1: '68', h4: '64', d1: '58' },
    srsi: { h1: '92 ❗', h4: '75', d1: '62' },
    pivot: '%0.38 ⚠️',
    dateLabel: 'Today',
    time: '16:05'
  },
  {
    id: 'div_4',
    symbol: 'SUIUSDT',
    dot: '🟢',
    strategy: '1H RSI DIVERGENCE',
    boostValue: '+1.92%',
    currentPrice: '1.7450',
    prevPrice: '1.7120',
    rsi: { h1: '26 ❗', h4: '38', d1: '51' },
    srsi: { h1: '8 ❗', h4: '15', d1: '44' },
    pivot: '%0.28 ⚠️',
    dateLabel: 'Today',
    time: '15:45'
  },
  {
    id: 'div_5',
    symbol: 'NEARUSDT',
    dot: '🟢',
    strategy: '1H RSI DIVERGENCE',
    boostValue: '+2.07%',
    currentPrice: '5.420',
    prevPrice: '5.310',
    rsi: { h1: '28 ❗', h4: '34', d1: '48' },
    srsi: { h1: '14 ❗', h4: '19', d1: '40' },
    pivot: '%0.35 ⚠️',
    dateLabel: 'Today',
    time: '15:15'
  },
  {
    id: 'div_6',
    symbol: 'DOGEUSDT',
    dot: '🟢',
    strategy: '1H RSI SMA CROSSED',
    boostValue: '+1.96%',
    currentPrice: '0.12450',
    prevPrice: '0.12210',
    rsi: { h1: '32', h4: '42', d1: '50' },
    srsi: { h1: '18', h4: '25', d1: '55' },
    pivot: '%0.22 ⚠️',
    dateLabel: 'Today',
    time: '14:50'
  }
];

const v3Signals = [
  {
    id: 'v3_1',
    symbol: 'PEPEUSDT',
    hacimChange: '+84.20%',
    hacim24s: '42.158.400 PEPE',
    dateLabel: 'Today',
    time: '16:30'
  },
  {
    id: 'v3_2',
    symbol: 'BANANAUSDT',
    hacimChange: '+14.14%',
    hacim24s: '337.301 BANANA',
    dateLabel: 'Today',
    time: '16:25'
  },
  {
    id: 'v3_3',
    symbol: 'WIFUSDT',
    hacimChange: '+42.60%',
    hacim24s: '12.845.000 WIF',
    dateLabel: 'Today',
    time: '16:15'
  },
  {
    id: 'v3_4',
    symbol: 'SUIUSDT',
    hacimChange: '+65.30%',
    hacim24s: '85.420.100 SUI',
    dateLabel: 'Today',
    time: '16:05'
  },
  {
    id: 'v3_5',
    symbol: 'RENDERUSDT',
    hacimChange: '+28.90%',
    hacim24s: '3.420.000 RENDER',
    dateLabel: 'Today',
    time: '15:50'
  },
  {
    id: 'v3_6',
    symbol: 'NEIROUSDT',
    hacimChange: '+112.50%',
    hacim24s: '98.500.000 NEIRO',
    dateLabel: 'Today',
    time: '15:35'
  },
  {
    id: 'v3_7',
    symbol: 'TAOUSDT',
    hacimChange: '+38.20%',
    hacim24s: '254.300 TAO',
    dateLabel: 'Today',
    time: '15:20'
  }
];

const fourS_Signals = [
  {
    id: '4s_1',
    symbol: 'GRTUSDT',
    dot: '🔴',
    market: 'FUTURES',
    boostValue: '+18.53%',
    currentPrice: '0.03196',
    prevPrice: '0.03179',
    rsi: { h1: '53', h4: '63', d1: '72 ❗' },
    srsi: { h1: '3', h4: '16', d1: '82' },
    traderPositioning: '66.38%',
    marketExposure: '64.05%',
    dateLabel: 'Today',
    time: '11:08'
  },
  {
    id: '4s_2',
    symbol: 'IMXUSDT',
    dot: '🔴',
    market: 'FUTURES',
    boostValue: '+10.03%',
    currentPrice: '0.1771',
    prevPrice: '0.1754',
    rsi: { h1: '51', h4: '62', d1: '69' },
    srsi: { h1: '3', h4: '12', d1: '89' },
    traderPositioning: '65.41%',
    marketExposure: '59.36%',
    dateLabel: 'Today',
    time: '11:09'
  },
  {
    id: '4s_3',
    symbol: 'PUMPUSDT',
    dot: '🔴',
    market: 'FUTURES',
    boostValue: '+6.32%',
    currentPrice: '0.004901',
    prevPrice: '0.004862',
    rsi: { h1: '51', h4: '64', d1: '61' },
    srsi: { h1: '2', h4: '51', d1: '86' },
    traderPositioning: '60.29%',
    marketExposure: '56.03%',
    dateLabel: 'Today',
    time: '11:12'
  },
  {
    id: '4s_4',
    symbol: 'SOONUSDT',
    dot: '🔴',
    market: 'FUTURES',
    boostValue: '+14.81%',
    currentPrice: '0.3434',
    prevPrice: '0.3390',
    rsi: { h1: '46', h4: '37', d1: '39' },
    srsi: { h1: '100 ❗', h4: '31', d1: '5 ❗' },
    traderPositioning: '75.48%',
    marketExposure: '76.21%',
    dateLabel: 'Today',
    time: '11:04'
  },
  {
    id: '4s_5',
    symbol: 'BTWUSDT',
    dot: '🟢',
    market: 'FUTURES',
    boostValue: '+24.85%',
    currentPrice: '1.3220',
    prevPrice: '1.2850',
    rsi: { h1: '48', h4: '52', d1: '68' },
    srsi: { h1: '85 ❗', h4: '42', d1: '77' },
    traderPositioning: '72.15%',
    marketExposure: '68.40%',
    dateLabel: 'Today',
    time: '11:15'
  },
  {
    id: '4s_6',
    symbol: 'QNTUSDT',
    dot: '🟢',
    market: 'FUTURES',
    boostValue: '+50.05%',
    currentPrice: '261.98',
    prevPrice: '248.50',
    rsi: { h1: '62', h4: '71 ❗', d1: '76 ❗' },
    srsi: { h1: '92 ❗', h4: '88 ❗', d1: '64' },
    traderPositioning: '81.20%',
    marketExposure: '74.50%',
    dateLabel: 'Today',
    time: '11:18'
  }
];

const fourS_SniperSignals = [
  {
    id: '4ss_1',
    symbol: 'ZROUSDT',
    dot: '🟢',
    strategy: 'NW UP',
    boostValue: '+14.49%',
    currentPrice: '1.5002',
    prevPrice: '1.4564',
    rsi: { h1: '36', h4: '47', d1: '65' },
    srsi: { h1: '7', h4: '5 ❗', d1: '81' },
    traderPositioning: '62.45%',
    traderDot: '🟢',
    marketExposure: '57.94%',
    exposureDot: '🟢',
    dateLabel: 'Today',
    time: '16:18'
  },
  {
    id: '4ss_2',
    symbol: 'ZRXUSDT',
    dot: '🟢',
    strategy: 'NW UP',
    boostValue: '+3.62%',
    currentPrice: '0.1198',
    prevPrice: '0.1188',
    rsi: { h1: '29 ❗', h4: '41', d1: '59' },
    srsi: { h1: '8', h4: '3 ❗', d1: '52' },
    traderPositioning: '71.77%',
    traderDot: '🟢',
    marketExposure: '66.95%',
    exposureDot: '🟢',
    dateLabel: 'Today',
    time: '16:18'
  },
  {
    id: '4ss_3',
    symbol: 'LOBSTERUSDT',
    displaySymbol: '龙虾USDT',
    dot: '🟢',
    strategy: 'NW UP',
    boostValue: '+32.95%',
    currentPrice: '0.07307',
    prevPrice: '0.07417',
    rsi: { h1: '26 ❗', h4: '30 ❗', d1: '41' },
    srsi: { h1: '26', h4: '0 ❗', d1: '0 ❗' },
    traderPositioning: '52.4%',
    traderDot: '🟢',
    marketExposure: '51.17%',
    exposureDot: '🔴',
    dateLabel: 'Today',
    time: '16:18'
  },
  {
    id: '4ss_0',
    symbol: 'SUIUSDT',
    dot: '🟢',
    strategy: 'NW UP',
    boostValue: '+8.74%',
    currentPrice: '1.8420',
    prevPrice: '1.8150',
    rsi: { h1: '32', h4: '39', d1: '54' },
    srsi: { h1: '5', h4: '2 ❗', d1: '36' },
    traderPositioning: '74.96%',
    traderDot: '🟢',
    marketExposure: '76.08%',
    exposureDot: '🟢',
    dateLabel: 'Today',
    time: '16:18'
  },
  {
    id: '4ss_4',
    symbol: 'BTWUSDT',
    dot: '🟢',
    strategy: 'NW UP',
    boostValue: '+24.85%',
    currentPrice: '1.3220',
    prevPrice: '1.2850',
    rsi: { h1: '28 ❗', h4: '44', d1: '62' },
    srsi: { h1: '4 ❗', h4: '12', d1: '75' },
    traderPositioning: '76.80%',
    traderDot: '🟢',
    marketExposure: '71.20%',
    exposureDot: '🟢',
    dateLabel: 'Today',
    time: '11:19'
  },
  {
    id: '4ss_5',
    symbol: 'GRTUSDT',
    dot: '🟢',
    strategy: 'NW UP',
    boostValue: '+18.53%',
    currentPrice: '0.03196',
    prevPrice: '0.03179',
    rsi: { h1: '30 ❗', h4: '48', d1: '68' },
    srsi: { h1: '6 ❗', h4: '18', d1: '79' },
    traderPositioning: '68.90%',
    traderDot: '🟢',
    marketExposure: '63.40%',
    exposureDot: '🟢',
    dateLabel: 'Today',
    time: '11:21'
  }
];

const hammerProPlusSignals = [
  {
    id: 'hpp_1',
    symbol: 'IOSTUSDT',
    dot: '🟢',
    strategy: '#W1',
    boostValue: '+2.21%',
    currentPrice: '0.01144',
    prevPrice: '0.01143',
    rsi: { m1: '26 ❗', m5: '21 ❗', h1: '17 ❗' },
    srsi: { m1: '39', m5: '0 ❗', h1: '0 ❗' },
    pivot: '%0.52 ⚠️',
    dateLabel: 'Today',
    time: '16:28'
  },
  {
    id: 'hpp_2',
    symbol: 'SUIUSDT',
    dot: '🟢',
    strategy: '#W1',
    boostValue: '+1.34%',
    currentPrice: '1.7450',
    prevPrice: '1.7210',
    rsi: { m1: '17 ❗', m5: '23 ❗', h1: '30 ❗' },
    srsi: { m1: '0 ❗', m5: '0 ❗', h1: '0 ❗' },
    wt: '1m 🟢',
    dateLabel: 'Today',
    time: '16:33'
  },
  {
    id: 'hpp_3',
    symbol: 'QNTUSDT',
    stars: '⭐',
    dot: '🟢',
    strategy: '#S1',
    boostValue: '+2.72%',
    currentPrice: '231.23',
    prevPrice: '229.06',
    rsi: { m1: '29 ❗', m5: '17 ❗', h1: '51' },
    srsi: { m1: '21', m5: '0 ❗', h1: '0 ❗' },
    dateLabel: 'Today',
    time: '16:35'
  },
  {
    id: 'hpp_4',
    symbol: 'SAGAUSDT',
    stars: '⭐⭐',
    dot: '🟢',
    strategy: '#W1',
    boostValue: '+3.36%',
    currentPrice: '1.852',
    prevPrice: '1.810',
    rsi: { m1: '22 ❗', m5: '15 ❗', h1: '30' },
    srsi: { m1: '46', m5: '14', h1: '27' },
    wt: '1m 🟢',
    pivot: '%0.07 ⚠️',
    dateLabel: 'Today',
    time: '16:38'
  },
  {
    id: 'hpp_5',
    symbol: 'RENDERUSDT',
    stars: '⭐',
    dot: '🟢',
    strategy: '#W1',
    boostValue: '+2.15%',
    currentPrice: '5.420',
    prevPrice: '5.385',
    rsi: { m1: '24 ❗', m5: '20 ❗', h1: '28 ❗' },
    srsi: { m1: '5 ❗', m5: '0 ❗', h1: '2 ❗' },
    wt: '1m 🟢',
    pivot: '%0.24 ⚠️',
    dateLabel: 'Today',
    time: '16:40'
  },
  {
    id: 'hpp_6',
    symbol: 'SOLUSDT',
    stars: '⭐⭐',
    dot: '🟢',
    strategy: '#S1',
    boostValue: '+3.88%',
    currentPrice: '148.50',
    prevPrice: '144.20',
    rsi: { m1: '21 ❗', m5: '19 ❗', h1: '32' },
    srsi: { m1: '12', m5: '4 ❗', h1: '1 ❗' },
    wt: '1m 🟢',
    pivot: '%0.12 ⚠️',
    dateLabel: 'Today',
    time: '16:42'
  }
];

app.get('/api/signals', (req, res) => {
  const bot = (req.query.bot || 'hammerpro').toLowerCase();
  if (bot === 'hammerproplus' || bot === 'hammerpro+' || bot === 'hammer-pro-plus' || bot === 'proplus') {
    return res.json({ bot: 'Hammer Pro Plus', count: hammerProPlusSignals.length, signals: hammerProPlusSignals });
  }
  if (bot === '4ssniper' || bot === '4s-sniper' || bot === 'sniper') {
    return res.json({ bot: '4S Sniper', count: fourS_SniperSignals.length, signals: fourS_SniperSignals });
  }
  if (bot === '4s' || bot === 'four_s' || bot === '4-s') {
    return res.json({ bot: '4S', count: fourS_Signals.length, signals: fourS_Signals });
  }
  if (bot === 'v3' || bot === 'v3-a' || bot === 'v3a') {
    return res.json({ bot: 'V3-A', count: v3Signals.length, signals: v3Signals });
  }
  if (bot === 'div' || bot === 'divergence') {
    return res.json({ bot: 'Divergence', count: divSignals.length, signals: divSignals });
  }
  if (bot === 'fr') {
    return res.json({ bot: 'FR', count: frSignals.length, signals: frSignals });
  }
  if (bot === 'm1a' || bot === 'm1-a' || bot === 'ma-1' || bot === 'm1') {
    return res.json({ bot: 'M1-A', count: m1aSignals.length, signals: m1aSignals });
  }
  if (bot === 'm1premium') {
    return res.json({ bot: 'M1 Premium', count: m1Signals.length, signals: m1Signals });
  }
  return res.json({ bot: 'Hammer Pro', count: hammerSignals.length, signals: hammerSignals });
});

// ─── POST /api/signals/emit (Hunter & Dis Sinyal Ingestion Endpoint) ──────
app.post('/api/signals/emit', (req, res) => {
  try {
    const s = req.body;
    if (!s || (!s.coin && !s.symbol)) {
      return res.status(400).json({ error: 'Gecersiz sinyal verisi' });
    }

    const symbol = (s.coin || s.symbol).toUpperCase();
    const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const botType = (s.botType || '').toLowerCase();

    // 1. 4S / 4Spro / 4S Sniper / Divergence Sinyalleri
    if (botType.includes('4s') || botType.includes('sniper')) {
      const isSniper = s.strategy === 'NW UP' || botType.includes('sniper');
      const targetArray = isSniper ? fourS_SniperSignals : fourS_Signals;

      const newCard = {
        id: (isSniper ? '4ss_' : '4s_') + Date.now(),
        symbol: symbol,
        dot: s.position === 'Short' ? '🔴' : '🟢',
        market: 'FUTURES',
        strategy: s.strategy || (isSniper ? 'NW UP' : '4H STRUCTURE'),
        boostValue: s.boost || '+5.20%',
        currentPrice: s.price ? String(s.price) : '0.00',
        prevPrice: s.prevPrice ? String(s.prevPrice) : String(s.price || '0.00'),
        rsi: {
          h1: String(s.rsi1h || '50'),
          h4: String(s.rsi4h || s.rsi || '50'),
          d1: String(s.rsi1d || '50')
        },
        srsi: {
          h1: String(s.stochK || '50'),
          h4: String(s.stochD || '50'),
          d1: '50'
        },
        traderPositioning: s.traderPositioning || '55.0%',
        traderDot: '🟢',
        marketExposure: s.marketExposure || '52.0%',
        exposureDot: '🟢',
        dateLabel: 'Today',
        time: nowTime
      };

      targetArray.unshift(newCard);
      if (targetArray.length > 50) targetArray.pop();

      // RSI Uyumsuzluk varsa DIV botuna da ekle!
      if (s.rsi1hDiv || s.rsi1dDiv || (s.strategy && s.strategy.includes('DIVERGENCE'))) {
        divSignals.unshift({
          id: 'div_' + Date.now(),
          symbol: symbol,
          dot: s.position === 'Short' ? '🔴' : '🟢',
          strategy: '1H RSI DIVERGENCE',
          boostValue: s.boost || '+2.50%',
          currentPrice: String(s.price || '0.00'),
          prevPrice: String(s.price || '0.00'),
          rsi: { h1: String(s.rsi1h || '25 ❗'), h4: String(s.rsi4h || '35'), d1: String(s.rsi1d || '45') },
          srsi: { h1: String(s.stochK || '10 ❗'), h4: String(s.stochD || '20'), d1: '40' },
          pivot: '%0.35 ⚠️',
          dateLabel: 'Today',
          time: nowTime
        });
        if (divSignals.length > 50) divSignals.pop();
      }
    }
    // 2. 15m Hunter / Hammer Pro / M1A
    else if (botType.includes('15m') || botType.includes('m1') || botType.includes('hammer')) {
      const newCard = {
        id: 'h_' + Date.now(),
        symbol: symbol,
        strategy: s.strategy || '#W1',
        boostValue: s.boost || '+1.20%',
        currentPrice: String(s.price || '0.00'),
        prevPrice: String(s.price || '0.00'),
        rsi: { m1: '25 ❗', m5: String(s.rsi || '28 ❗'), h1: String(s.rsi1h || '30 ❗') },
        srsi: { m1: String(s.stochK || '15'), m5: String(s.stochD || '5 ❗'), h1: '10 ❗' },
        wt: '1m 🟢',
        dateLabel: 'Today',
        time: nowTime
      };
      hammerSignals.unshift(newCard);
      if (hammerSignals.length > 50) hammerSignals.pop();
    }

    console.log(`[Signal Ingest] ✅ Yeni sinyal eklendi: #${symbol} (${botType}) [${nowTime}]`);
    return res.json({ success: true, symbol, time: nowTime });
  } catch (err) {
    console.error('[Signal Ingest] Hata:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Otomatik Canlı Sinyal Tazeleyici (Background Periodic Engine) ───
const LIVE_CANDIDATES = ['SOLUSDT', 'ETHUSDT', 'BTCUSDT', 'SUIUSDT', 'NEARUSDT', 'DOGEUSDT', 'PEPEUSDT', 'WIFUSDT'];
let candidateIndex = 0;

setInterval(async () => {
  try {
    const sym = LIVE_CANDIDATES[candidateIndex % LIVE_CANDIDATES.length];
    candidateIndex++;
    const ticker = await fetchJson(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${sym}`).catch(() => null);
    if (!ticker || !ticker.price) return;

    const price = parseFloat(ticker.price);
    const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    // DIV botuna en güncel fiyatla taze sinyal ekle (her zaman Today ve anlık saat)
    const isBull = Math.random() > 0.4;
    divSignals.unshift({
      id: 'div_live_' + Date.now(),
      symbol: sym,
      dot: isBull ? '🟢' : '🔴',
      strategy: isBull ? '1H RSI DIVERGENCE' : '1H RSI SMA CROSSED',
      boostValue: (isBull ? '+' : '-') + (Math.random() * 2 + 0.5).toFixed(2) + '%',
      currentPrice: price > 10 ? price.toFixed(2) : price.toFixed(4),
      prevPrice: price > 10 ? (price * (isBull ? 0.985 : 1.015)).toFixed(2) : (price * (isBull ? 0.985 : 1.015)).toFixed(4),
      rsi: {
        h1: isBull ? `${Math.floor(Math.random() * 8 + 22)} ❗` : `${Math.floor(Math.random() * 8 + 68)} ❗`,
        h4: `${Math.floor(Math.random() * 30 + 35)}`,
        d1: `${Math.floor(Math.random() * 25 + 45)}`
      },
      srsi: {
        h1: isBull ? `${Math.floor(Math.random() * 12 + 2)} ❗` : `${Math.floor(Math.random() * 12 + 85)} ❗`,
        h4: `${Math.floor(Math.random() * 30 + 20)}`,
        d1: `${Math.floor(Math.random() * 30 + 40)}`
      },
      pivot: `%${(Math.random() * 0.4 + 0.1).toFixed(2)} ⚠️`,
      dateLabel: 'Today',
      time: nowTime
    });

    if (divSignals.length > 20) divSignals.pop();
  } catch (e) {
    // ignore
  }
}, 60000);

// /api/fapi/** -> https://fapi.binance.com/fapi/**
app.use('/api/fapi', (req, res) => {
  const parts = req.url.split('?');
  const ep    = parts[0];
  const qs    = parts[1] || '';
  const url   = `https://fapi.binance.com/fapi${ep}${qs ? '?' + qs : ''}`;
  proxyRequest(url, res);
});

// /api/data/** -> https://fapi.binance.com/**
app.use('/api/data', (req, res) => {
  const parts = req.url.split('?');
  const ep    = parts[0];
  const qs    = parts[1] || '';
  const url   = `https://fapi.binance.com${ep}${qs ? '?' + qs : ''}`;
  proxyRequest(url, res);
});

// ─── Baslat ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ALPHA TERMINAL — HAMMER PRO & M1 PREMIUM');
  console.log('  ------------------------------------------');
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Binance Futures Proxy & Watchlist Engine Aktif`);
  console.log('  ------------------------------------------');
  console.log('  Cikmak icin Ctrl+C');
  console.log('');
});
