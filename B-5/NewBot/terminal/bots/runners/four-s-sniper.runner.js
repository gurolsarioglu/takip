#!/usr/bin/env node
/**
 * four-s-sniper.runner.js — 4S Sniper Botu Bağımsız Çalıştırıcısı (Runner)
 * Strateji: 1H RSI <= 40 veya SRSI <= 25, Balina Long Birikimi (>= %55) ve NW UP Kurulumu
 */

const {
  createScanLoop,
  isSignalAccepted,
  strategyRules,
  getWatchlist,
  getKlines,
  getSentiment,
  postSignal,
  logger,
  quantIndicators,
  botData,
  formatCryptoPrice,
  computePrevPrice
} = require('./runner-helper');

const BOT_ID = '4ssniper';
const BOT_NAME = '4S Sniper';
const BOT_DESC = '1H aşırı satım, balina long birikimi ve sniper dönüş radarı';

const seenMap = new Map();
let totalSignalsFound = 0;

async function scan() {
  const watchlist = await getWatchlist();
  if (!watchlist || watchlist.length === 0) return;

  const candidates = watchlist.slice(0, 50);
  let scanned = 0;

  for (const item of candidates) {
    const sym = item.symbol;
    scanned++;
    logger.scan(BOT_NAME, scanned, totalSignalsFound);

    const now = Date.now();
    const lastSeen = seenMap.get(sym) || 0;
    if (now - lastSeen < 600000) continue; // 10 dk cooldown

    try {
      const klines1h = await getKlines(sym, '1h', 250);
      if (!klines1h || klines1h.length < 30) continue;

      const m1h = quantIndicators.calculateAllMetrics(klines1h);
      if (!m1h) continue;

      const hasFullOhlc = Number.isFinite(klines1h[0]?.open);
      let klines4h = [];
      let m4h = null;
      let m1d = null;

      if (hasFullOhlc) {
        const [raw4h, raw1d] = await Promise.all([
          getKlines(sym, '4h', 250),
          getKlines(sym, '1d', 250)
        ]);
        klines4h = Array.isArray(raw4h) ? raw4h : [];
        if (klines4h.length >= 30) {
          m4h = quantIndicators.calculateAllMetrics(klines4h);
        }
        if (Array.isArray(raw1d) && raw1d.length >= 15) {
          m1d = quantIndicators.calculateAllMetrics(raw1d);
        }
      }

      if (m4h) {
        if (!strategyRules.shouldEmit(BOT_ID, { m1h, m4h, m1d, klines4h })) continue;
      } else {
        if (!strategyRules.isSniperSetup(m1h)) continue;
      }

      // Balina & Market Exposure Sentiment Kontrolü
      const sentiment = await getSentiment(sym);
      const { whaleLong, globalLong } = botData.sentimentMetrics(sentiment);

      const evalSniper = strategyRules.evaluateFourSSniper({
        m1h,
        m4h,
        m1d,
        klines4h,
        whaleLong,
        globalLong
      });
      if (!evalSniper) continue;

      const dateObj = new Date(now);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const activeKlines = (m4h && klines4h.length >= 2) ? klines4h : klines1h;
      const lastBar = activeKlines[activeKlines.length - 1];
      const observed = botData.priceChange(activeKlines);
      if (!observed) continue;

      const signalPayload = {
        botId: BOT_ID,
        source: 'binance-rest',
        strategyVersion: evalSniper.strategyVersion || strategyRules.SNIPER_VERSION,
        observedAt: Date.now(),
        botType: BOT_ID,
        id: `4ss_${sym}_${now}`,
        candleOpenTime: lastBar.openTime,
        timeframe: evalSniper.timeframe || (m4h ? '4h' : '1h'),
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        direction: evalSniper.direction,
        dot: evalSniper.dot,
        strategy: evalSniper.strategy,
        boostValue: evalSniper.boostValue,
        measuredChangePct: observed.changePct,
        currentPrice: formatCryptoPrice(observed.current, sym),
        prevPrice: formatCryptoPrice(observed.previous, sym),
        rsi: evalSniper.rsi,
        srsi: evalSniper.srsi,
        traderPositioning: evalSniper.traderPositioning,
        traderDot: evalSniper.traderDot,
        marketExposure: evalSniper.marketExposure,
        exposureDot: evalSniper.exposureDot,
        dateLabel: dateStr,
        time: nowTime
      };

      const hubResult = await postSignal(signalPayload);
      if (isSignalAccepted(hubResult)) {
        seenMap.set(sym, now);
        totalSignalsFound++;
      }
      logger.signal(BOT_NAME, signalPayload, hubResult);

    } catch (err) {
      // devam et
    }
  }
}

async function start() {
  logger.header(BOT_ID, BOT_NAME, BOT_DESC);
  logger.info(`${BOT_NAME} tarama motoru baslatildi (Her 25 saniyede bir tarar)...`);

  const loop = createScanLoop(scan, 25000, { onError: e => logger.warn(`Tarama hatasi: ${e.message}`) });
  await loop.run();
}

if (require.main === module) start();
module.exports = { scan, start };
