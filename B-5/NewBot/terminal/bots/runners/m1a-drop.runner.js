#!/usr/bin/env node
/**
 * m1a-drop.runner.js — M1-A Drop Botu Bağımsız Çalıştırıcısı (Runner)
 * Strateji: 1m Zaman Diliminde Ani Düşüş (Drop <= -0.65%), Hacim Artışı, StochRSI ve Aşırı Satım
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

const BOT_ID = 'm1a';
const BOT_NAME = 'M1-A Drop';
const BOT_DESC = '1m ani düşüş, hacim boşalması ve tepki alım radarı';

const seenMap = new Map(); // symbol -> lastSignalTime
let totalSignalsFound = 0;

async function scan() {
  const watchlist = await getWatchlist();
  if (!watchlist || watchlist.length === 0) return;

  // En aktif 70 vadeli pariteyi tara
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
      const dropPct = ((lastBar.close - prevBar.close) / prevBar.close) * 100;

      // 1. Eşik: 1m içinde en az -0.65% düşüş
      if (dropPct > -0.65) continue;

      // 2. Hacim ortalamanın üstünde olmalı
      const vols = klines1m.map(k => k.volume);
      const avgVol = vols.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
      const curVol = vols[vols.length - 1];
      if (curVol < avgVol * 1.05) continue;

      // 3. İndikatörler: RSI ve StochRSI
      const closes = klines1m.map(k => k.close);
      const rsiRes = quantIndicators.calculateRSI(closes, 14);
      const stoch = quantIndicators.calculateStochRSI(rsiRes.rsiSeries, 14, 3, 3);
      if (stoch.k > 75) continue; // Zirvede değil, düşüş bölgesinde olmalı

      seenMap.set(sym, now);
      totalSignalsFound++;

      const dateObj = new Date(now);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const prevPrice = computePrevPrice(lastBar.close, dropPct, sym);
      const volChangePct = avgVol > 0 ? ((curVol - avgVol) / avgVol * 100).toFixed(2) : '0.00';

      const signalPayload = {
        botId: BOT_ID,
        botType: BOT_ID,
        id: `m1a_${sym}_${now}`,
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        type: 'drop',
        dot: '🔴',
        dropValue: `${dropPct.toFixed(2)}%`,
        currentPrice: formatCryptoPrice(lastBar.close, sym),
        prevPrice,
        volume: `+${volChangePct}%`,
        rsi: `${Math.round(rsiRes.rsi)}${rsiRes.rsi <= 25 ? ' ⚠️' : ''}`,
        stochastic: `${Math.round(stoch.k)}/${Math.round(stoch.d)}`,
        btcStatus: 'Normal',
        strategy: '1m Ani Düşüş',
        dateLabel: dateStr,
        time: nowTime
      };

      const hubResult = await postSignal(signalPayload);
      logger.signal(BOT_NAME, signalPayload, hubResult);

    } catch (err) {
      // tek coin hatasında durma
    }
  }
}

async function start() {
  logger.header(BOT_ID, BOT_NAME, BOT_DESC);
  logger.info(`${BOT_NAME} tarama motoru baslatildi (Her 6 saniyede bir tarar)...`);

  // İlk tarama
  await scan();

  // Periyodik döngü (6 saniye)
  setInterval(() => {
    scan().catch(e => logger.warn(`Tarama hatasi: ${e.message}`));
  }, 6000);
}

start();
