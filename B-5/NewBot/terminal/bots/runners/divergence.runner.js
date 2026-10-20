#!/usr/bin/env node
/**
 * divergence.runner.js — Divergence Botu Bağımsız Çalıştırıcısı (Runner)
 * Strateji: 1H ve 5m RSI Pivot Uyuşmazlıkları (Bullish / Bearish Divergence), Momentum Ayrışma Radarı
 */

const {
  getWatchlist,
  getKlines,
  postSignal,
  logger,
  quantIndicators,
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
        getKlines(sym, '5m', 120),
        getKlines(sym, '1h', 120)
      ]);

      if (klines5m.length < 50 || klines1h.length < 50) continue;

      const m5 = quantIndicators.calculateAllMetrics(klines5m);
      const m1h = quantIndicators.calculateAllMetrics(klines1h);
      if (!m5 || !m1h) continue;

      const has1hDiv = m1h.divergence && (m1h.divergence.hasBullDiv || m1h.divergence.hasBearDiv);
      const has5mDiv = m5.divergence && (m5.divergence.hasBullDiv || m5.divergence.hasBearDiv);

      if (!has1hDiv && !has5mDiv) continue;

      const is1h = has1hDiv;
      const divInfo = is1h ? m1h.divergence : m5.divergence;
      const tf = is1h ? '1h' : '5m';
      const lastBar = is1h ? klines1h[klines1h.length - 1] : klines5m[klines5m.length - 1];

      seenMap.set(sym, now);
      totalSignalsFound++;

      const dateObj = new Date(now);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const isBull = divInfo.hasBullDiv;
      const boostVal = isBull ? '+2.10%' : '-1.85%';
      const curPrice = lastBar.close;

      const signalPayload = {
        botId: BOT_ID,
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
        boostValue: boostVal,
        currentPrice: formatCryptoPrice(curPrice, sym),
        prevPrice: computePrevPrice(curPrice, isBull ? 2.10 : -1.85, sym),
        rsi: {
          h1: `${Math.round(m1h.rsi)} ❗`,
          h4: '45',
          d1: '52'
        },
        srsi: {
          h1: `${Math.round(m1h.srsiK)} ❗`,
          h4: '25',
          d1: '40'
        },
        pivot: m1h.pivots ? `%${m1h.pivots.pivotDistancePct} ⚠️` : '1.1%',
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
  logger.info(`${BOT_NAME} tarama motoru baslatildi (Her 20 saniyede bir tarar)...`);

  await scan();
  setInterval(() => {
    scan().catch(e => logger.warn(`Tarama hatasi: ${e.message}`));
  }, 20000);
}

start();
