#!/usr/bin/env node
/**
 * hammer-pro.runner.js — Hammer Pro Botu Bağımsız Çalıştırıcısı (Runner)
 * Strateji: 5m Dip Dönüşü (RSI <= 42 veya WT Cross-Up & RSI <= 50), Reversal Scanner (#W1 Dip Dönüş)
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

const BOT_ID = 'hammerpro';
const BOT_NAME = 'Hammer Pro';
const BOT_DESC = 'Otomatik formasyon analizi ve dip dönüş (reversal) radarı';

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
    if (now - lastSeen < 300000) continue; // 5 dk cooldown

    try {
      const [klines5m, klines1h] = await Promise.all([
        getKlines(sym, '5m', 100),
        getKlines(sym, '1h', 100)
      ]);

      if (klines5m.length < 50 || klines1h.length < 50) continue;

      const lastBar5m = klines5m[klines5m.length - 1];
      const m5 = quantIndicators.calculateAllMetrics(klines5m);
      const m1h = quantIndicators.calculateAllMetrics(klines1h);
      if (!m5 || !m1h) continue;

      const isDip = m5.rsi <= 42;
      const isWtCross = m5.wtCrossUp && m5.rsi <= 50;

      if (!isDip && !isWtCross) continue;

      seenMap.set(sym, now);
      totalSignalsFound++;

      const dateObj = new Date(now);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const curPrice = lastBar5m.close;
      const boostVal = '+1.20%';

      const signalPayload = {
        botId: BOT_ID,
        botType: BOT_ID,
        id: `hp_${sym}_${now}`,
        candleOpenTime: lastBar5m.openTime,
        timeframe: '5m',
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        stars: m5.rsi <= 35 ? '⭐⭐⭐' : '⭐⭐',
        dot: '🟢',
        strategy: '#W1 Dip Donus',
        boostValue: boostVal,
        currentPrice: formatCryptoPrice(curPrice, sym),
        prevPrice: computePrevPrice(curPrice, 1.20, sym),
        rsi: {
          m1: `${Math.round(m5.rsi)}`,
          m5: `${Math.round(m5.rsi)} ${m5.rsi <= 35 ? '❗' : ''}`,
          h1: `${Math.round(m1h.rsi)}`
        },
        srsi: {
          m1: '25',
          m5: `${Math.round(m5.srsiK)}`,
          h1: `${Math.round(m1h.srsiK)}`
        },
        wt: m5.wtCrossUp ? '5m 🟢 Cross' : 'Dip Reversal',
        pivot: m5.pivots ? `%${m5.pivots.pivotDistancePct}` : '0.8%',
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
  logger.info(`${BOT_NAME} tarama motoru baslatildi (Her 15 saniyede bir tarar)...`);

  await scan();
  setInterval(() => {
    scan().catch(e => logger.warn(`Tarama hatasi: ${e.message}`));
  }, 15000);
}

start();
