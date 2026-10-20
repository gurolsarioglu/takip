#!/usr/bin/env node
/**
 * divergence.runner.js — Divergence Botu Bağımsız Çalıştırıcısı (Runner)
 * Strateji: 1H ve 5m RSI Pivot Uyuşmazlıkları (Bullish / Bearish Divergence), Momentum Ayrışma Radarı
 */

const {
  createScanLoop,
  isSignalAccepted,
  strategyRules,
  getWatchlist,
  getKlines,
  postSignal,
  logger,
  quantIndicators,
  botData,
  formatCryptoPrice,
  computePrevPrice
} = require('./runner-helper');

const BOT_ID = 'div';
const BOT_NAME = 'Divergence';
const BOT_DESC = '1H ve 5m RSI Boğa / Ayı Pivot Uyumsuzluk Radarı';

const seenMap = new Map();
let totalSignalsFound = 0;

async function scan() {
  const watchlist = await getWatchlist();
  if (!watchlist || watchlist.length === 0) return;

  const candidates = watchlist.slice(0, 60);
  let scanned = 0;

  for (const item of candidates) {
    const sym = item.symbol;
    scanned++;
    logger.scan(BOT_NAME, scanned, totalSignalsFound);

    const now = Date.now();
    const lastSeen = seenMap.get(sym) || 0;
    if (now - lastSeen < 600000) continue; // 10 dk cooldown

    try {
      const [klines5m, klines1h] = await Promise.all([
        getKlines(sym, '5m', 250),
        getKlines(sym, '1h', 250)
      ]);

      if (klines5m.length < 50 && klines1h.length < 50) continue;

      const m5 = klines5m.length >= 50 ? quantIndicators.calculateAllMetrics(klines5m) : null;
      const m1h = klines1h.length >= 50 ? quantIndicators.calculateAllMetrics(klines1h) : null;
      if (!m5 && !m1h) continue;

      const has1hDiv = strategyRules.hasDivergence(m1h);
      const has5mDiv = strategyRules.hasDivergence(m5);

      if (!strategyRules.shouldEmit(BOT_ID, { m5, m1h })) continue;

      const is1h = has1hDiv;
      const divInfo = is1h ? m1h.divergence : m5.divergence;
      const tf = is1h ? '1h' : '5m';
      const lastBar = is1h ? klines1h[klines1h.length - 1] : klines5m[klines5m.length - 1];


      const dateObj = new Date(now);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const isBull = divInfo.hasBullDiv;
      const observed = botData.priceChange(is1h ? klines1h : klines5m);
      if (!observed) continue;
      const curPrice = lastBar.close;

      const signalPayload = {
        botId: BOT_ID,
        source: 'binance-rest',
        strategyVersion: 'local-hypothesis-v1',
        observedAt: Date.now(),
        botType: BOT_ID,
        id: `div_${sym}_${now}`,
        candleOpenTime: lastBar.openTime,
        timeframe: tf,
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        dot: isBull ? '🟢' : '🔴',
        strategy: `${tf.toUpperCase()} RSI DIVERGENCE`,
        boostValue: null,
        measuredChangePct: observed.changePct,
        currentPrice: formatCryptoPrice(curPrice, sym),
        prevPrice: formatCryptoPrice(observed.previous, sym),
        rsi: {
          h1: `${botData.indicatorText(m1h?.rsi)} ❗`,
          h4: '—',
          d1: '—'
        },
        srsi: {
          h1: `${botData.indicatorText(m1h?.srsiK)} ❗`,
          h4: '—',
          d1: '—'
        },
        pivot: (is1h ? m1h : m5)?.pivots ? `%${(is1h ? m1h : m5).pivots.pivotDistancePct} ⚠️` : null,
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
  logger.info(`${BOT_NAME} tarama motoru baslatildi (Her 20 saniyede bir tarar)...`);

  const loop = createScanLoop(scan, 20000, { onError: e => logger.warn(`Tarama hatasi: ${e.message}`) });
  await loop.run();
}

if (require.main === module) start();
module.exports = { scan, start };
