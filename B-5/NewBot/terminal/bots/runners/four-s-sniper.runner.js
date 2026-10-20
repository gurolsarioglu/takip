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
      if (klines1h.length < 30) continue;

      const m1h = quantIndicators.calculateAllMetrics(klines1h);
      if (!m1h) continue;

      const isDip = strategyRules.isSniperSetup(m1h);
      if (!isDip) continue;

      // Balina Sentiment Kontrolü
      const sentiment = await getSentiment(sym);
      const { whaleLong, globalLong } = botData.sentimentMetrics(sentiment);

      if (!strategyRules.shouldEmit(BOT_ID, { m1h, whaleLong })) continue;

      const dateObj = new Date(now);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const lastBar = klines1h[klines1h.length - 1];
      const curPrice = lastBar.close;
      const observed = botData.priceChange(klines1h);
      if (!observed) continue;

      const signalPayload = {
        botId: BOT_ID,
        source: 'binance-rest',
        strategyVersion: 'local-hypothesis-v1',
        observedAt: Date.now(),
        botType: BOT_ID,
        id: `4ss_${sym}_${now}`,
        candleOpenTime: lastBar.openTime,
        timeframe: '1h',
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        dot: '🟢',
        strategy: 'NW UP',
        boostValue: null,
        measuredChangePct: observed.changePct,
        currentPrice: formatCryptoPrice(curPrice, sym),
        prevPrice: formatCryptoPrice(observed.previous, sym),
        rsi: {
          h1: `${Math.round(m1h.rsi)} ❗`,
          h4: '—',
          d1: '—'
        },
        srsi: {
          h1: `${Math.round(m1h.srsiK)}`,
          h4: '—',
          d1: '—'
        },
        traderPositioning: botData.percent(whaleLong),
        traderDot: '🟢',
        marketExposure: botData.percent(globalLong),
        exposureDot: globalLong === null ? null : globalLong >= 50 ? '🟢' : '🔴',
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
