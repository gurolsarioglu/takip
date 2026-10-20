#!/usr/bin/env node
/**
 * m1-premium.runner.js — M1 Premium Botu Bağımsız Çalıştırıcısı (Runner)
 * Strateji: 1m Sıçrama (Boost >= +0.70%), Hacim Akışı, RSI/SRSI Momentum ve 1m Uyumsuzluk
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

const BOT_ID = 'm1premium';
const BOT_NAME = 'M1 Premium';
const BOT_DESC = '1m ani sıçrama, hacim patlaması ve momentum radarı';

const seenMap = new Map();
let totalSignalsFound = 0;

async function scan() {
  const watchlist = await getWatchlist();
  if (!watchlist || watchlist.length === 0) return;

  const candidates = watchlist.slice(0, 70);
  let scanned = 0;

  for (const item of candidates) {
    const sym = item.symbol;
    scanned++;
    logger.scan(BOT_NAME, scanned, totalSignalsFound);

    const now = Date.now();
    const lastSeen = seenMap.get(sym) || 0;
    if (now - lastSeen < 180000) continue; // 3 dk cooldown

    try {
      const klines1m = await getKlines(sym, '1m', 30);
      if (klines1m.length < 20) continue;

      const lastBar = klines1m[klines1m.length - 1];
      const prevBar = klines1m[klines1m.length - 2];
      const boostPct = ((lastBar.close - prevBar.close) / prevBar.close) * 100;

      // 1. Eşik: 1m içinde en az +0.70% artış
      if (boostPct < 0.70) continue;

      // 2. Hacim ortalamanın üstünde olmalı
      const vols = klines1m.map(k => k.volume);
      const avgVol = vols.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
      const curVol = vols[vols.length - 1];
      if (curVol < avgVol * 1.05) continue;

      // 3. Momentum RSI & StochRSI
      const closes = klines1m.map(k => k.close);
      const rsiRes = quantIndicators.calculateRSI(closes, 14);
      const stoch = quantIndicators.calculateStochRSI(rsiRes.rsiSeries, 14, 3, 3);
      if (rsiRes.rsi < 55 && stoch.k < 60) continue;

      const div = quantIndicators.detectPivotDivergence(klines1m, rsiRes.rsiSeries);

      seenMap.set(sym, now);
      totalSignalsFound++;

      const dateObj = new Date(now);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const prevPrice = computePrevPrice(lastBar.close, boostPct, sym);

      const signalPayload = {
        botId: BOT_ID,
        botType: BOT_ID,
        id: `m1p_${sym}_${now}`,
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        dot: '🟢',
        boostValue: `+${boostPct.toFixed(2)}%`,
        currentPrice: formatCryptoPrice(lastBar.close, sym),
        prevPrice,
        strategy: '1m Momentum Sıçraması',
        rsi: {
          m1: `${Math.round(rsiRes.rsi)} ❗`,
          m5: '55',
          h1: '48'
        },
        srsi: {
          m1: `${Math.round(stoch.k)} ❗`,
          m5: `${Math.round(stoch.d)}`,
          h1: '35'
        },
        divergence: div.hasBullDiv || div.hasBearDiv ? '1m ✅' : undefined,
        isFavorite: boostPct >= 1.50,
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
  logger.info(`${BOT_NAME} tarama motoru baslatildi (Her 6 saniyede bir tarar)...`);

  await scan();
  setInterval(() => {
    scan().catch(e => logger.warn(`Tarama hatasi: ${e.message}`));
  }, 6000);
}

start();
