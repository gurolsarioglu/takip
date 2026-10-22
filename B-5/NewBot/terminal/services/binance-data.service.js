/**
 * BinanceDataService
 * Handles communication with Binance Futures REST and caching for klines, tickers, and sentiment data.
 * Zero external scraping dependencies - 100% direct official Binance Futures endpoints.
 */

const https = require('https');

class BinanceDataService {
  constructor() {
    this.baseUrl = 'https://fapi.binance.com';
    this.topSymbols = [];
    this.prices = new Map();
    this.tickers = new Map();
    this.fundingRates = new Map(); // key: symbol -> { fundingRate, nextFundingTime }
    this.klineCache = new Map(); // key: `${symbol}_${interval}_${limit}` -> { data, ts }
    this.sentimentCache = new Map(); // key: symbol -> { data, ts }
    this.lastTickerFetch = 0;
    this.lastFundingFetch = 0;
  }

  /**
   * Helper to make HTTP GET requests with JSON response and timeout
   */
  async requestJson(url) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, { headers: { 'User-Agent': 'AlphaTerminal/1.0' } }, res => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        }
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error(`JSON parse error: ${e.message}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(8000, () => {
        req.destroy(new Error(`Timeout fetching ${url}`));
      });
    });
  }

  /**
   * Initialize service by fetching 24hr tickers and populating top symbols
   */
  async init() {
    await this.refreshTickers();
    await this.refreshFundingRates();
  }

  /**
   * Refresh funding rates from Binance Futures premiumIndex
   */
  async refreshFundingRates() {
    const now = Date.now();
    if (this.fundingRates.size > 0 && (now - this.lastFundingFetch < 30000)) {
      return;
    }
    try {
      const premium = await this.requestJson(`${this.baseUrl}/fapi/v1/premiumIndex`);
      if (Array.isArray(premium)) {
        premium.forEach(p => {
          if (p.symbol) {
            this.fundingRates.set(p.symbol, {
              fundingRate: parseFloat(p.lastFundingRate || 0),
              nextFundingTime: Number(p.nextFundingTime || (now + 14400000))
            });
          }
        });
        this.lastFundingFetch = now;
      }
    } catch (err) {
      console.warn(`[BinanceDataService] Warning refreshing funding rates: ${err.message}`);
    }
  }

  /**
   * Refresh 24hr tickers and sort symbols by 24h volume
   */
  async refreshTickers() {
    const now = Date.now();
    if (this.topSymbols.length > 0 && (now - this.lastTickerFetch < 10000)) {
      return;
    }

    try {
      const data = await this.requestJson(`${this.baseUrl}/fapi/v1/ticker/24hr`);
      if (Array.isArray(data)) {
        const usdtList = data.filter(t => t.symbol && t.symbol.endsWith('USDT'));
        usdtList.sort((a, b) => parseFloat(b.quoteVolume || 0) - parseFloat(a.quoteVolume || 0));

        this.topSymbols = usdtList.map(t => t.symbol);
        usdtList.forEach(t => {
          const price = parseFloat(t.lastPrice || 0);
          this.prices.set(t.symbol, price);
          this.tickers.set(t.symbol, {
            symbol: t.symbol,
            price,
            priceChangePercent: parseFloat(t.priceChangePercent || 0),
            highPrice: parseFloat(t.highPrice || 0),
            lowPrice: parseFloat(t.lowPrice || 0),
            volume: parseFloat(t.volume || 0),
            quoteVolume: parseFloat(t.quoteVolume || 0)
          });
        });
        this.lastTickerFetch = now;
      }
    } catch (err) {
      console.warn(`[BinanceDataService] Warning refreshing tickers: ${err.message}`);
    }
  }

  /**
   * Get all available symbols
   * @returns {string[]}
   */
  getAllSymbols() {
    return this.topSymbols;
  }

  /**
   * Get cached funding rate for symbol
   * @param {string} symbol
   * @returns {{ fundingRate: number, nextFundingTime: number }}
   */
  getFundingRate(symbol) {
    return this.fundingRates.get(symbol) || { fundingRate: 0.0001, nextFundingTime: Date.now() + 14400000 };
  }

  /**
   * Get top N symbols sorted by volume
   * @param {number} limit
   * @returns {string[]}
   */
  getTopSymbols(limit = 100) {
    return this.topSymbols.slice(0, limit);
  }

  /**
   * Get high-volatility hot symbols: top volume + top gainers + top losers
   * @returns {string[]}
   */
  getHotSymbols() {
    const tickers = Array.from(this.tickers.values());
    if (!tickers.length) return this.topSymbols.slice(0, 30);

    // Top volume
    const byVolume = [...tickers].sort((a, b) => b.quoteVolume - a.quoteVolume).slice(0, 35);
    // Top gainers (highest positive price change)
    const gainers = [...tickers].sort((a, b) => b.priceChangePercent - a.priceChangePercent).slice(0, 35);
    // Top losers (most negative price change)
    const losers = [...tickers].sort((a, b) => a.priceChangePercent - b.priceChangePercent).slice(0, 35);

    const merged = new Set([
      ...byVolume.map(t => t.symbol),
      ...gainers.map(t => t.symbol),
      ...losers.map(t => t.symbol)
    ]);

    return Array.from(merged);
  }

  /**
   * Get BTC 1m status: 'Normal', 'Pumping', or 'Dumping'
   */
  getBtcStatus() {
    const btcTicker = this.tickers.get('BTCUSDT');
    if (!btcTicker) return 'Normal';
    // If BTC 24h change or recent volatility is extreme
    const chg = btcTicker.priceChangePercent;
    if (chg < -3.5) return 'Dumping';
    if (chg > 3.5) return 'Pumping';
    return 'Normal';
  }

  /**
   * Get latest cached price for symbol
   * @param {string} symbol
   * @returns {number}
   */
  getLatestPrice(symbol) {
    return this.prices.get(symbol) || 0;
  }

  /**
   * Get latest cached ticker info for symbol
   * @param {string} symbol
   */
  getTicker(symbol) {
    return this.tickers.get(symbol) || null;
  }

  /**
   * Get Kline (candlestick) history for symbol and timeframe
   * @param {string} symbol - e.g. 'BTCUSDT'
   * @param {string} interval - '1m', '5m', '15m', '1h', '4h', '1d'
   * @param {number} limit - number of candles (max 500)
   * @returns {Promise<Array<{ time: number, open: number, high: number, low: number, close: number, volume: number }>>}
   */
  async getKlines(symbol, interval = '1h', limit = 50) {
    const cacheKey = `${symbol}_${interval}_${limit}`;
    const now = Date.now();
    const cached = this.klineCache.get(cacheKey);

    // Dynamic TTL based on interval
    let ttl = 10000; // default 10s
    if (interval === '1m') ttl = 4000;
    else if (interval === '5m') ttl = 15000;
    else if (interval === '1h') ttl = 60000;
    else if (interval === '4h') ttl = 120000;
    else if (interval === '1d') ttl = 300000;

    if (cached && (now - cached.ts < ttl)) {
      return cached.data;
    }

    const url = `${this.baseUrl}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const rawKlines = await this.requestJson(url);

    if (!Array.isArray(rawKlines)) {
      throw new Error(`Invalid klines returned for ${symbol} ${interval}`);
    }

    const formatted = rawKlines.map(row => ({
      time: Number(row[0]),
      open: parseFloat(row[1]),
      high: parseFloat(row[2]),
      low: parseFloat(row[3]),
      close: parseFloat(row[4]),
      volume: parseFloat(row[5])
    }));

    if (formatted.length > 0) {
      const latestClose = formatted[formatted.length - 1].close;
      this.prices.set(symbol, latestClose);
    }

    this.klineCache.set(cacheKey, { data: formatted, ts: now });
    return formatted;
  }

  /**
   * Fetch complete watchlist with 24hr tickers and funding rates
   * @returns {Promise<Array<object>>}
   */
  async getWatchlist() {
    const now = Date.now();
    if (this.watchlistCache && (now - this.watchlistCache.ts < 2000)) {
      return this.watchlistCache.data;
    }

    try {
      const [tickers, premium] = await Promise.all([
        this.requestJson(`${this.baseUrl}/fapi/v1/ticker/24hr`),
        this.requestJson(`${this.baseUrl}/fapi/v1/premiumIndex`)
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
          if (!t.symbol || !t.symbol.endsWith('USDT')) return;
          const prem = premiumMap.get(t.symbol) || { fundingRate: 0.0001, nextFundingTime: now + 14400000 };
          const price = parseFloat(t.lastPrice || 0);
          const chg = parseFloat(t.priceChange || 0);
          const chgPct = parseFloat(t.priceChangePercent || 0);
          const volUsd = parseFloat(t.quoteVolume || 0);

          this.prices.set(t.symbol, price);

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
      this.watchlistCache = { data: result, ts: now };
      return result;
    } catch (err) {
      console.warn(`[BinanceDataService] getWatchlist error: ${err.message}`);
      if (this.watchlistCache && this.watchlistCache.data) return this.watchlistCache.data;
      throw err;
    }
  }

  /**
   * Fetch 4-Bar Sentiment Data for a symbol
   * @param {string} symbol
   * @returns {Promise<object>}
   */
  async getSentiment(symbol) {
    const now = Date.now();
    const cached = this.sentimentCache.get(symbol);
    if (cached && (now - cached.ts < 10000)) {
      return cached.data;
    }

    try {
      const [depth, posRatio, accRatio, globalRatio] = await Promise.all([
        this.requestJson(`${this.baseUrl}/fapi/v1/depth?symbol=${symbol}&limit=50`),
        this.requestJson(`${this.baseUrl}/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=5m&limit=1`),
        this.requestJson(`${this.baseUrl}/futures/data/topLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`),
        this.requestJson(`${this.baseUrl}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`)
      ]);

      let bidVol = 0;
      let askVol = 0;
      if (depth && depth.bids && depth.asks) {
        depth.bids.forEach(([p, q]) => { bidVol += parseFloat(p) * parseFloat(q); });
        depth.asks.forEach(([p, q]) => { askVol += parseFloat(p) * parseFloat(q); });
      }
      const totalDepth = bidVol + askVol || 1;
      const bidPct = parseFloat(((bidVol / totalDepth) * 100).toFixed(2));
      const askPct = parseFloat((100 - bidPct).toFixed(2));

      const pos = Array.isArray(posRatio) && posRatio.length > 0 ? posRatio[0] : null;
      const acc = Array.isArray(accRatio) && accRatio.length > 0 ? accRatio[0] : null;
      const glo = Array.isArray(globalRatio) && globalRatio.length > 0 ? globalRatio[0] : null;

      const posLong = pos ? parseFloat((parseFloat(pos.longAccount || pos.longPosition || 0.5) * 100).toFixed(2)) : 50;
      const accLong = acc ? parseFloat((parseFloat(acc.longAccount || 0.5) * 100).toFixed(2)) : 50;
      const gloLong = glo ? parseFloat((parseFloat(glo.longAccount || 0.5) * 100).toFixed(2)) : 50;

      const result = {
        symbol,
        // modal plugin naming
        orderBook: { bidPct, askPct, bid: bidPct, ask: askPct },
        topPosition: { longPct: posLong, shortPct: parseFloat((100 - posLong).toFixed(2)) },
        topAccount: { longPct: accLong, shortPct: parseFloat((100 - accLong).toFixed(2)) },
        globalExposure: { longPct: gloLong, shortPct: parseFloat((100 - gloLong).toFixed(2)) },
        // strategy evaluator naming
        longShortPositions: { long: posLong, short: parseFloat((100 - posLong).toFixed(2)) },
        longShortAccounts: { long: accLong, short: parseFloat((100 - accLong).toFixed(2)) },
        longShort: { long: gloLong, short: parseFloat((100 - gloLong).toFixed(2)) },
        updatedAt: now
      };

      this.sentimentCache.set(symbol, { data: result, ts: now });
      return result;
    } catch (e) {
      console.warn(`[BinanceDataService] Sentiment fetch error for ${symbol}: ${e.message}`);
      return {
        symbol,
        orderBook: { bidPct: 50, askPct: 50, bid: 50, ask: 50 },
        topPosition: { longPct: 50, shortPct: 50 },
        topAccount: { longPct: 50, shortPct: 50 },
        globalExposure: { longPct: 50, shortPct: 50 },
        longShortPositions: { long: 50, short: 50 },
        longShortAccounts: { long: 50, short: 50 },
        longShort: { long: 50, short: 50 },
        updatedAt: now
      };
    }
  }
}

module.exports = BinanceDataService;

