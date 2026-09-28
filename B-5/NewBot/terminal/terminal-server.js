/**
 * terminal-server.js — Alpha Terminal Node.js Sunucusu
 */

const express = require('express');
const https   = require('https');
const path    = require('path');

const app  = express();
const PORT = process.env.TERMINAL_PORT || 3000;

// ─── Static Files ────────────────────────────────────────────
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
    time: '08:41'
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
    time: '08:42'
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
    time: '08:42'
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
    time: '08:43'
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
    time: '08:50'
  },
  {
    id: 'm2',
    symbol: 'QUSDT',
    isFavorite: true,
    boostValue: '+1.94%',
    currentPrice: '0.031925',
    prevPrice: '0.031291',
    rsi: { m1: '64', m5: '53', h1: '46' },
    srsi: { m1: '98 ❗', m5: '9', h1: '71' },
    time: '08:50'
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
    time: '08:50'
  },
  {
    id: 'm4',
    symbol: 'ROBOUSDT',
    boostValue: '+1.09%',
    currentPrice: '0.00925',
    prevPrice: '0.00916',
    rsi: { m1: '65', m5: '55', h1: '40' },
    srsi: { m1: '87', m5: '76', h1: '53' },
    time: '08:51'
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
    time: '09:10'
  },
  {
    id: 'm1a_2',
    symbol: 'MARSCOINUSDT',
    type: 'drop',
    dot: '🔴',
    dropValue: '-1.04%',
    currentPrice: '0.13569',
    prevPrice: '0.13712',
    volume: '-1.79%',
    rsi: '70',
    stochastic: '68/47',
    btcStatus: 'Normal',
    time: '09:10'
  },
  {
    id: 'm1a_3',
    symbol: 'MARSCOINUSDT',
    type: 'drop',
    dot: '🔴',
    dropValue: '-1.01%',
    currentPrice: '0.13573',
    prevPrice: '0.13712',
    volume: '-2.34%',
    rsi: '71',
    stochastic: '69/47',
    btcStatus: 'Normal',
    time: '09:10'
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
    time: '09:10'
  }
];

const frSignals = [
  {
    id: 'fr_1',
    symbol: 'HOODUSDT',
    dot: '🟢',
    alertText: 'Funding changed from + to -',
    fundingRate: '-0.0001',
    previousFunding: '0.0000',
    difference: '0.000123',
    timeRemaining: '00:31:59',
    time: '02:28'
  },
  {
    id: 'fr_2',
    symbol: 'SAGAUSDT',
    fundingRate: '-0.9632',
    timeRemaining: '00:32:59',
    time: '02:27'
  },
  {
    id: 'fr_3',
    symbol: 'ORCLUSDT',
    dot: '🟢',
    alertText: 'Funding changed from + to -',
    fundingRate: '-0.0002',
    previousFunding: '0.0000',
    difference: '0.000159',
    timeRemaining: '00:27:59',
    time: '02:32'
  },
  {
    id: 'fr_4',
    symbol: 'ONEUSDT',
    dot: '🔴',
    fundingRate: '-0.3168',
    previousFunding: '-0.3262',
    difference: '-0.009391',
    timeRemaining: '00:01:59',
    time: '00:58'
  },
  {
    id: 'fr_5',
    symbol: 'ONEUSDT',
    dot: '🔴',
    fundingRate: '-0.3052',
    previousFunding: '-0.3168',
    difference: '-0.011630',
    timeRemaining: '00:00:59',
    time: '00:59'
  },
  {
    id: 'fr_6',
    symbol: 'NAVERUSDT',
    dot: '🟢',
    alertText: 'Funding changed from + to -',
    fundingRate: '-0.0008',
    previousFunding: '0.0000',
    difference: '0.000791',
    timeRemaining: '01:47:59',
    time: '05:12'
  },
  {
    id: 'fr_7',
    symbol: 'BSPUSDT',
    dot: '🟢',
    alertText: 'Funding changed from + to -',
    fundingRate: '-0.0010',
    previousFunding: '0.0000',
    difference: '0.000990',
    timeRemaining: '05:40:59',
    time: '05:19'
  }
];

const divSignals = [
  {
    id: 'div_1',
    symbol: 'EWJUSDT',
    dot: '🔴',
    strategy: '1H RSI DIVERGENCE',
    boostValue: '+0.55%',
    currentPrice: '98.56',
    prevPrice: '98.57',
    rsi: { h1: '69', h4: '66', d1: '58' },
    srsi: { h1: '58', h4: '78', d1: '50' },
    pivot: '%0.42 ⚠️',
    dateLabel: 'September 22',
    time: '13:04'
  },
  {
    id: 'div_2',
    symbol: 'EWJUSDT',
    dot: '🟢',
    strategy: '1H RSI DIVERGENCE',
    boostValue: '+0.84%',
    currentPrice: '95.38',
    prevPrice: '95.36',
    rsi: { h1: '23 ❗', h4: '28 ❗', d1: '42' },
    srsi: { h1: '15', h4: '0', d1: '37' },
    pivot: '%0.27 ⚠️',
    dateLabel: 'September 24',
    time: '12:04'
  },
  {
    id: 'div_3',
    symbol: 'EWJUSDT',
    dot: '🟢',
    strategy: '1H RSI DIVERGENCE',
    boostValue: '+0.37%',
    currentPrice: '96.96',
    prevPrice: '97.1',
    rsi: { h1: '26 ❗', h4: '40', d1: '49' },
    srsi: { h1: '16', h4: '25', d1: '61' },
    pivot: '%0.59 ⚠️',
    dateLabel: 'Today',
    time: '10:04'
  },
  {
    id: 'div_4',
    symbol: 'EWJUSDT',
    dot: '🔴',
    strategy: '1H RSI SMA CROSSED',
    boostValue: '+0.33%',
    currentPrice: '94.77',
    prevPrice: '94.89',
    rsi: { h1: '66', h4: '60', d1: '54' },
    srsi: { h1: '54', h4: '98 ❗', d1: '63' },
    pivot: '%0.44 ⚠️',
    dateLabel: 'July 11',
    time: '03:08'
  },
  {
    id: 'div_5',
    symbol: 'EWJUSDT',
    dot: '🔴',
    strategy: '1H RSI DIVERGENCE',
    boostValue: '+0.16%',
    currentPrice: '95.37',
    prevPrice: '95.38',
    rsi: { h1: '75 ❗', h4: '66', d1: '56' },
    srsi: { h1: '90', h4: '100 ❗', d1: '69' },
    dateLabel: 'July 11',
    time: '19:07'
  },
  {
    id: 'div_6',
    symbol: 'EWJUSDT',
    dot: '🟢',
    strategy: '1H RSI DIVERGENCE',
    boostValue: '+2.36%',
    currentPrice: '89.28',
    prevPrice: '89.33',
    rsi: { h1: '22 ❗', h4: '31', d1: '38' },
    srsi: { h1: '8 ❗', h4: '13', d1: '48' },
    pivot: '%0.27 ⚠️',
    dateLabel: 'August 3',
    time: '06:04'
  }
];

const v3Signals = [
  {
    id: 'v3_1',
    symbol: 'SOFIUSDT',
    hacimChange: '+9.48%',
    hacim24s: '8.920,77 SOFI',
    time: '11:01'
  },
  {
    id: 'v3_2',
    symbol: 'SHAZUSDT',
    hacimChange: '+23.13%',
    hacim24s: '5.926,53 SHAZ',
    time: '11:01'
  },
  {
    id: 'v3_3',
    symbol: 'GTLBUSDT',
    hacimChange: '+11.65%',
    hacim24s: '1.123,84 GTLB',
    time: '11:11'
  },
  {
    id: 'v3_4',
    symbol: 'GTLBUSDT',
    hacimChange: '+9.91%',
    hacim24s: '1.250,09 GTLB',
    time: '11:15'
  },
  {
    id: 'v3_5',
    symbol: 'BANANAUSDT',
    hacimChange: '+14.14%',
    hacim24s: '337.301,4 BANANA',
    time: '11:16'
  },
  {
    id: 'v3_6',
    symbol: 'TTWOUSDT',
    hacimChange: '+173.44%',
    hacim24s: '2.651,08 TTWO',
    time: '11:16'
  },
  {
    id: 'v3_7',
    symbol: 'LLYUSDT',
    hacimChange: '+9.91%',
    hacim24s: '778,69 LLY',
    time: '11:20'
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
    time: '11:18'
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
    time: '11:18'
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
    time: '11:18'
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
    time: '11:18'
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
    time: '10:28'
  },
  {
    id: 'hpp_2',
    symbol: 'BASEDUSDT',
    dot: '🟢',
    strategy: '#W1',
    boostValue: '+1.34%',
    currentPrice: '0.06671',
    prevPrice: '0.06671',
    rsi: { m1: '17 ❗', m5: '23 ❗', h1: '30 ❗' },
    srsi: { m1: '0 ❗', m5: '0 ❗', h1: '0 ❗' },
    wt: '1m 🟢',
    dateLabel: 'Today',
    time: '10:33'
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
    time: '12:03'
  },
  {
    id: 'hpp_4',
    symbol: 'ZSUSDT',
    stars: '⭐⭐',
    dot: '🟢',
    strategy: '#W1',
    boostValue: '+3.36%',
    currentPrice: '190.52',
    prevPrice: '190.52',
    rsi: { m1: '22 ❗', m5: '15 ❗', h1: '30' },
    srsi: { m1: '46', m5: '14', h1: '27' },
    wt: '1m 🟢',
    pivot: '%0.07 ⚠️',
    dateLabel: 'Today',
    time: '12:08'
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
    time: '12:15'
  },
  {
    id: 'hpp_6',
    symbol: 'SUIUSDT',
    stars: '⭐⭐',
    dot: '🟢',
    strategy: '#S1',
    boostValue: '+3.88%',
    currentPrice: '1.7450',
    prevPrice: '1.7210',
    rsi: { m1: '21 ❗', m5: '19 ❗', h1: '32' },
    srsi: { m1: '12', m5: '4 ❗', h1: '1 ❗' },
    wt: '1m 🟢',
    pivot: '%0.12 ⚠️',
    dateLabel: 'Today',
    time: '12:18'
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
