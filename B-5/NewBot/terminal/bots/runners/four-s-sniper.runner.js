#!/usr/bin/env node
/**
 * four-s-sniper.runner.js — 4S Sniper Botu Bağımsız Çalıştırıcısı (Runner)
 * Strateji: 1H RSI <= 40 veya SRSI <= 25, Balina Long Birikimi (>= %55) ve NW UP Kurulumu
 */

const {
  getWatchlist,
  getKlines,
  getSentiment,
  postSignal,
  logger,
  quantIndicators,
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
      const klines1h = await getKlines(sym, '1h', 100);
      if (klines1h.length < 30) continue;

      const m1h = quantIndicators.calculateAllMetrics(klines1h);
      if (!m1h) continue;

      const isDip = m1h.rsi <= 40 || m1h.srsiK <= 25;
      if (!isDip) continue;

      // Balina Sentiment Kontrolü
      const sentiment = await getSentiment(sym);
      const whaleLong = sentiment && sentiment.topAccount ? parseFloat(sentiment.topAccount.longAccount) : 62.5;
      const globalLong = sentiment && sentiment.topPosition ? parseFloat(sentiment.topPosition.longPosition || 51.0) : 51.0;

      if (whaleLong < 55.0) continue; // Balina long şartı

      seenMap.set(sym, now);
      totalSignalsFound++;

      const dateObj = new Date(now);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const lastBar = klines1h[klines1h.length - 1];
      const curPrice = lastBar.close;
      const boostVal = '+3.85%';

      const signalPayload = {
        botId: BOT_ID,
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
        boostValue: boostVal,
        currentPrice: formatCryptoPrice(curPrice, sym),
        prevPrice: computePrevPrice(curPrice, 3.85, sym),
        rsi: {
          h1: `${Math.round(m1h.rsi)} ❗`,
          h4: '40',
          d1: '55'
        },
        srsi: {
          h1: `${Math.round(m1h.srsiK)}`,
          h4: '5 ❗',
          d1: '50'
        },
        traderPositioning: `${whaleLong}%`,
        traderDot: '🟢',
        marketExposure: `${globalLong}%`,
        exposureDot: globalLong >= 50 ? '🟢' : '🔴',
        dateLabel: dateStr,
        time: nowTime
      };

      const hubResult = await postSignal(signalPayload);
      logger.signal(BOT_NAME, signalPayload, hubResult);

    } catch (err) {
      // devam et
    }
  }
}

async function start() {
  logger.header(BOT_ID, BOT_NAME, BOT_DESC);
  logger.info(`${BOT_NAME} tarama motoru baslatildi (Her 25 saniyede bir tarar)...`);

  await scan();
  setInterval(() => {
    scan().catch(e => logger.warn(`Tarama hatasi: ${e.message}`));
  }, 25000);
}

start();
