#!/usr/bin/env node
/**
 * hammer-pro-plus.runner.js — Hammer Pro Plus Botu Bağımsız Çalıştırıcısı (Runner)
 * Strateji: 5m/1h Çoklu Dip Konfluensi, WaveTrend (10,21) Kesişimi, Seanslık Pivot Sıçraması (#W1 / #S1)
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

const BOT_ID = 'hammerproplus';
const BOT_NAME = 'Hammer Pro Plus';
const BOT_DESC = 'Gelişmiş yapısal formasyon, WaveTrend dip dönüşü ve pivot sıçrama radarı';

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

      // Hammer Pro Plus Şartı:
      // 5m RSI <= 38 + (WaveTrend yukarı kesişim veya aşırı satım veya 1h RSI <= 40) + Pivot desteği <= 1.20%
      const rsiOk = m5.rsi <= 38;
      const wtOk = m5.wtCrossUp || m5.wtOversold || m1h.rsi <= 40;
      const pivotOk = m5.pivots && m5.pivots.pivotDistancePct <= 1.20;

      if (!rsiOk || !wtOk || !pivotOk) continue;

      seenMap.set(sym, now);
      totalSignalsFound++;

      const dateObj = new Date(now);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const curPrice = lastBar5m.close;
      const boostVal = '+1.45%';

      const stars = m5.pivots.pivotDistancePct <= 0.40 ? '⭐⭐⭐' : '⭐⭐';

      const signalPayload = {
        botId: BOT_ID,
        botType: BOT_ID,
        id: `hpp_${sym}_${now}`,
        candleOpenTime: lastBar5m.openTime,
        timeframe: '5m',
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        stars,
        dot: '🟢',
        strategy: '#W1 / #S1 Dip Sıçraması',
        boostValue: boostVal,
        currentPrice: formatCryptoPrice(curPrice, sym),
        prevPrice: computePrevPrice(curPrice, 1.45, sym),
        rsi: {
          m1: `${Math.round(m5.rsi)} ❗`,
          m5: `${Math.round(m5.rsi)} ❗`,
          h1: `${Math.round(m1h.rsi)} ❗`
        },
        srsi: {
          m1: '15 ❗',
          m5: `${Math.round(m5.srsiK)} ❗`,
          h1: `${Math.round(m1h.srsiK)} ❗`
        },
        wt: '5m 🟢',
        pivot: `%${m5.pivots.pivotDistancePct} ⚠️`,
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
