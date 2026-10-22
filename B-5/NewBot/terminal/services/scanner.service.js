/**
 * ScannerService
 * Continuous Autonomous Background Market Scanner.
 * Monitors top Binance Futures symbols, executes mathematical indicators via IndicatorService,
 * evaluates all 10 bot strategies, and dispatches real-time signals without external scraper dependencies.
 */

class ScannerService {
  constructor(options = {}) {
    this.binanceData = options.binanceData;
    this.botManager = options.botManager;
    this.maxSymbols = options.maxSymbols || 40;
    this.debounceMs = options.debounceMs || 180000; // 3 minutes debounce per coin/bot
    this.cycleIntervalMs = options.cycleIntervalMs || 5000;

    this.lastEmitted = new Map(); // key: `${botId}_${symbol}` -> timestamp
    this.rotationCursor = 0;
    this.isRunning = false;
    this.isScanning = false;
    this.timer = null;
  }

  /**
   * Check if a signal for this bot and symbol was recently emitted
   */
  isDebounced(botId, symbol, currentPrice = 0) {
    const key = `${botId}_${symbol.toUpperCase()}`;
    const record = this.lastEmitted.get(key);
    if (!record) return false;

    // Fast debounce for 1m timeframe bots (m1a, m1premium)
    const effectiveDebounce = (botId === 'm1a' || botId === 'm1premium') ? 25000 : this.debounceMs;
    const timeDiff = Date.now() - record.time;

    if (timeDiff < effectiveDebounce) {
      // If price moved significantly (>= 0.25%) since last signal, allow cascade update
      if (currentPrice > 0 && record.price > 0) {
        const movePct = Math.abs((currentPrice - record.price) / record.price) * 100;
        if (movePct >= 0.25 && timeDiff >= 6000) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Record that a signal has been emitted to avoid duplication
   */
  recordEmission(botId, symbol, price = 0) {
    const key = `${botId}_${symbol.toUpperCase()}`;
    this.lastEmitted.set(key, { time: Date.now(), price });
  }

  /**
   * Execute a single scan cycle across active symbols
   * @returns {Promise<Array<{ symbol: string, signalsGenerated: number }>>}
   */
  async scanCycle() {
    if (!this.binanceData || !this.botManager) {
      console.warn('[ScannerService] Missing binanceData or botManager instance.');
      return [];
    }

    const allSymbols = this.binanceData.getAllSymbols();
    if (!allSymbols || allSymbols.length === 0) {
      await this.binanceData.init();
    } else {
      await this.binanceData.refreshTickers();
      await this.binanceData.refreshFundingRates();
    }

    const fullList = this.binanceData.getAllSymbols();
    // Prioritize high-volatility hot symbols (top volume, gainers, losers ~70 coins)
    const hotSymbols = this.binanceData.getHotSymbols();

    // Pick 20 rotating symbols from the full ~745 Binance Futures universe
    const rotatingBatchSize = 20;
    let rotatingSymbols = [];
    if (fullList.length > 0) {
      if (this.rotationCursor >= fullList.length) {
        this.rotationCursor = 0;
      }
      rotatingSymbols = fullList.slice(this.rotationCursor, this.rotationCursor + rotatingBatchSize);
      this.rotationCursor += rotatingBatchSize;
    }

    // Merge hot volatility leaders + rotating universe without duplicates
    const activeSymbols = Array.from(new Set([...hotSymbols, ...rotatingSymbols]));
    const cycleReports = [];

    // Process in parallel chunks of 6 symbols to maintain low latency and respect rate limits
    const chunkSize = 6;
    for (let i = 0; i < activeSymbols.length; i += chunkSize) {
      const chunk = activeSymbols.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(symbol => this.scanSymbol(symbol));
      const chunkResults = await Promise.allSettled(chunkPromises);

      chunkResults.forEach((res, idx) => {
        if (res.status === 'fulfilled' && res.value) {
          cycleReports.push(res.value);
        } else if (res.status === 'rejected') {
          console.warn(`[ScannerService] Error scanning ${chunk[idx]}:`, res.reason ? res.reason.message : res.reason);
        }
      });
    }

    return cycleReports;
  }

  /**
   * Scan an individual symbol across all bot strategies
   */
  async scanSymbol(symbol) {
    try {
      const currentPrice = this.binanceData.getLatestPrice(symbol);
      const ticker = this.binanceData.getTicker(symbol);

      // Fetch multi-timeframe klines (60 candles ensure Stoch RSI, RSI, WT have sufficient history)
      const [klines1m, klines5m, klines1h, klines4h] = await Promise.all([
        this.binanceData.getKlines(symbol, '1m', 60),
        this.binanceData.getKlines(symbol, '5m', 60),
        this.binanceData.getKlines(symbol, '1h', 60),
        this.binanceData.getKlines(symbol, '4h', 60)
      ]);

      const price = currentPrice || (klines1m.length > 0 ? klines1m[klines1m.length - 1].close : 0);
      if (!price) return { symbol, signalsGenerated: 0 };

      // Optional sentiment & real funding rate
      const sentiment = await this.binanceData.getSentiment(symbol).catch(() => null);
      const frInfo = this.binanceData.getFundingRate(symbol);

      const btcStatus = this.binanceData.getBtcStatus();

      const context = {
        symbol,
        currentPrice: price,
        ticker,
        klines1m,
        klines5m,
        klines1h,
        klines4h,
        klines: klines1m, // default klines reference
        sentiment,
        fundingRate: frInfo.fundingRate,
        nextFundingTime: frInfo.nextFundingTime,
        btcStatus
      };

      let signalsGenerated = 0;

      // 1. Hammer Pro Plus
      const hppBot = this.botManager.getBot('hammerproplus');
      if (hppBot && typeof hppBot.evaluate === 'function' && !this.isDebounced('hammerproplus', symbol)) {
        const sig = hppBot.evaluate(context);
        if (sig) {
          this.recordEmission('hammerproplus', symbol, price);
          signalsGenerated++;
        }
      }

      // 2. Hammer Pro
      const hpBot = this.botManager.getBot('hammerpro');
      if (hpBot && typeof hpBot.evaluate === 'function' && !this.isDebounced('hammerpro', symbol)) {
        const sig = hpBot.evaluate(context);
        if (sig) {
          this.recordEmission('hammerpro', symbol, price);
          signalsGenerated++;
        }
      }

      // 3. V3 Volume
      const v3Bot = this.botManager.getBot('v3');
      if (v3Bot && typeof v3Bot.evaluate === 'function' && !this.isDebounced('v3', symbol)) {
        const sig = v3Bot.evaluate(context);
        if (sig) {
          this.recordEmission('v3', symbol, price);
          signalsGenerated++;
        }
      }

      // 4. M1-A Drop
      const m1aBot = this.botManager.getBot('m1a');
      if (m1aBot && typeof m1aBot.evaluate === 'function' && !this.isDebounced('m1a', symbol, price)) {
        const sig = m1aBot.evaluate(context);
        if (sig) {
          this.recordEmission('m1a', symbol, price);
          signalsGenerated++;
        }
      }

      // 5. M1 Premium
      const m1pBot = this.botManager.getBot('m1premium');
      if (m1pBot && typeof m1pBot.evaluate === 'function' && !this.isDebounced('m1premium', symbol, price)) {
        const sig = m1pBot.evaluate(context);
        if (sig) {
          this.recordEmission('m1premium', symbol, price);
          signalsGenerated++;
        }
      }

      // 6. 4S Structure
      const fourSBot = this.botManager.getBot('4s');
      if (fourSBot && typeof fourSBot.evaluate === 'function' && !this.isDebounced('4s', symbol)) {
        const sig = fourSBot.evaluate(context);
        if (sig) {
          this.recordEmission('4s', symbol);
          signalsGenerated++;
        }
      }

      // 7. 4S Sniper
      const sniperBot = this.botManager.getBot('4ssniper');
      if (sniperBot && typeof sniperBot.evaluate === 'function' && !this.isDebounced('4ssniper', symbol)) {
        const sig = sniperBot.evaluate(context);
        if (sig) {
          this.recordEmission('4ssniper', symbol);
          signalsGenerated++;
        }
      }

      // 8. Divergence
      const divBot = this.botManager.getBot('div');
      if (divBot && typeof divBot.evaluate === 'function' && !this.isDebounced('div', symbol)) {
        const sig = divBot.evaluate(context);
        if (sig) {
          this.recordEmission('div', symbol);
          signalsGenerated++;
        }
      }

      // 9. Funding Rate
      const frBot = this.botManager.getBot('fr');
      if (frBot && typeof frBot.evaluate === 'function' && !this.isDebounced('fr', symbol)) {
        const sig = frBot.evaluate(context);
        if (sig) {
          this.recordEmission('fr', symbol);
          signalsGenerated++;
        }
      }

      return { symbol, signalsGenerated };
    } catch (err) {
      console.warn(`[ScannerService] scanSymbol error on ${symbol}:`, err.message);
      return { symbol, signalsGenerated: 0 };
    }
  }

  /**
   * Start the continuous background scanner loop
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[ScannerService] 🚀 Background scanner started.');

    const runLoop = async () => {
      if (!this.isRunning) return;
      if (!this.isScanning) {
        this.isScanning = true;
        try {
          await this.scanCycle();
        } catch (err) {
          console.warn('[ScannerService] Error in scan cycle:', err.message);
        } finally {
          this.isScanning = false;
        }
      }
      if (this.isRunning) {
        this.timer = setTimeout(runLoop, this.cycleIntervalMs);
      }
    };

    runLoop();
  }

  /**
   * Stop the scanner loop
   */
  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('[ScannerService] ⏹️ Background scanner stopped.');
  }
}

module.exports = ScannerService;
