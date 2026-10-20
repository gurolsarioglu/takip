#!/usr/bin/env node
/**
 * m1a-drop.runner.js — M1-A Botu Bağımsız Çalıştırıcısı (Runner)
 * Visivero Tersine Mühendislik Spesifikasyonu:
 * - 1m Zaman Diliminde Ani Hızlı Fiyat Hareketi (Boost Value >= +1.00% veya Drop Value <= -1.00%)
 * - Volume % = ((V_cur - V_prev) / V_prev) * 100 (Önceki 1m bara göre hacim değişimi, eksi veya artı)
 * - RSI 14 (veya 21): >= 70 (Aşırı Alım) veya <= 30 (Aşırı Satım) durumunda '⚠️' uyarısı
 * - Stochastic K/D (14, 14, 3, 3): '84/87', aşırı uçlarda (K<=25 veya K>=80) '⚠️' uyarısı
 * - Binance Rate-Limit Koruması: Önbellek, paced batching ve istek sınırlandırma mekanizması
 */

const {
  getWatchlist,
  getKlines,
  postSignal,
  logger,
  quantIndicators,
  formatCryptoPrice
} = require('./runner-helper');

const BOT_ID = 'm1a';
const BOT_NAME = 'M1-A';
const BOT_DESC = '1m mikro zaman dilimi ani boost & drop analiz radarı';

const seenMap = new Map(); // symbol -> lastSignalTime
let totalSignalsFound = 0;

// Binance hız sınırı (Rate limit) koruma gecikmesi
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scan() {
  const watchlist = await getWatchlist();
  if (!watchlist || watchlist.length === 0) return;

  // En aktif vadeli pariteleri tara (Derinlikli hacim sırasına göre)
  const candidates = watchlist.slice(0, 60);
  let scanned = 0;

  for (const item of candidates) {
    const sym = item.symbol;
    scanned++;
    logger.scan(BOT_NAME, scanned, totalSignalsFound);

    const now = Date.now();
    const lastSeen = seenMap.get(sym) || 0;
    if (now - lastSeen < 180000) continue; // 3 dakika aynı coin için cooldown

    try {
      // 1m periyodunda son 35 mumu çek
      const klines1m = await getKlines(sym, '1m', 35);
      if (!klines1m || klines1m.length < 20) {
        await sleep(40);
        continue;
      }

      const curBar = klines1m[klines1m.length - 1];
      const prevBar = klines1m[klines1m.length - 2];

      if (!curBar || !prevBar || prevBar.close <= 0) {
        await sleep(40);
        continue;
      }

      // 1. Fiyat Değişim Yüzdesi (1 dakikalık hareket)
      const priceChangePct = ((curBar.close - prevBar.close) / prevBar.close) * 100;
      const absChange = Math.abs(priceChangePct);

      // Eşik: 1m içinde en az |1.00%| hareket (veya mikro piyasada güçlü momentum >= 0.95%)
      if (absChange < 0.95) {
        await sleep(40);
        continue;
      }

      const isDrop = priceChangePct < 0;
      const signalType = isDrop ? 'drop' : 'boost';
      const dot = isDrop ? '🔴' : '🟢';

      // 2. Hacim Hesabı (Visivero Standardı: Önceki 1m barına göre hacim değişim oranı)
      // V_cur ve V_prev karşılaştırılır: ((V_cur - V_prev) / V_prev) * 100
      let volChangePct = 0;
      if (prevBar.volume > 0) {
        volChangePct = ((curBar.volume - prevBar.volume) / prevBar.volume) * 100;
      }
      const volSign = volChangePct > 0 ? '' : ''; // Eksi ise zaten - ile gelir, pozitifse düz yüzdelik (örn: 67.92%, 0.44%, -1.94%)
      const volumeFormatted = `${volSign}${volChangePct.toFixed(2)}%`;

      // 3. RSI(14) Hesabı & Eşik Uyarıları
      const closes = klines1m.map(k => k.close);
      const rsiRes = quantIndicators.calculateRSI(closes, 14);
      const rsiVal = Math.round(rsiRes.rsi);
      // Visivero'da RSI >= 70 ise '74 ⚠️', <= 30 ise '27 ⚠️', aralıkta ise sadece '39', '57'
      const rsiFormatted = (rsiVal >= 70 || rsiVal <= 30) ? `${rsiVal} ⚠️` : `${rsiVal}`;

      // 4. Stochastic (K/D) (14, 14, 3, 3) Hesabı
      const stoch = quantIndicators.calculateStochRSI(rsiRes.rsiSeries, 14, 3, 3);
      let kVal = Math.round(stoch.k);
      let dVal = Math.round(stoch.d);
      // Sıfırın altı veya tanımsızlık durumu koruması
      if (isNaN(kVal)) kVal = 0;
      if (isNaN(dVal)) dVal = 0;
      // Stoch aşırı uç uyarıları (K/D <= 25 veya K/D >= 80)
      const stochWarning = (kVal <= 25 && dVal <= 25) || (kVal >= 80 && dVal >= 80);
      const stochasticFormatted = `${kVal}/${dVal}${stochWarning ? ' ⚠️' : ''}`;

      // 5. Kesin Tick Hassasiyetli Fiyatlar
      const currentPriceStr = formatCryptoPrice(curBar.close, sym);
      const prevPriceStr = formatCryptoPrice(prevBar.close, sym);

      seenMap.set(sym, now);
      totalSignalsFound++;

      const dateObj = new Date(now);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      const valueFormatted = isDrop
        ? `${priceChangePct.toFixed(2)}%`
        : `+${priceChangePct.toFixed(2)}%`;

      const signalPayload = {
        botId: BOT_ID,
        botType: BOT_ID,
        id: `m1a_${sym}_${now}`,
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        type: signalType,
        dot,
        dropValue: isDrop ? valueFormatted : undefined,
        boostValue: !isDrop ? valueFormatted : undefined,
        currentPrice: currentPriceStr,
        prevPrice: prevPriceStr,
        volume: volumeFormatted,
        rsi: rsiFormatted,
        stochastic: stochasticFormatted,
        btcStatus: 'Normal',
        strategy: isDrop ? '1m Mikro Drop' : '1m Mikro Boost',
        dateLabel: dateStr,
        time: nowTime
      };

      const hubResult = await postSignal(signalPayload);
      logger.signal(BOT_NAME, signalPayload, hubResult);

      // İstekler arası rate-limit nefes alma aralığı (Binance 429 koruması)
      await sleep(60);

    } catch (err) {
      // Tekil sembol hatalarında tarayıcı duraksamaz
      await sleep(50);
    }
  }
}

async function start() {
  logger.header(BOT_ID, BOT_NAME, BOT_DESC);
  logger.info(`${BOT_NAME} motoru başlatıldı. Rate-limit korumalı 1m döngüsü devrede.`);

  // İlk tarama
  await scan();

  // 1 dakikalık mumları yakalamak için periyodik akıllı tarama (10 saniye aralıkla)
  setInterval(() => {
    scan().catch(e => logger.warn(`Tarama hatası: ${e.message}`));
  }, 10000);
}

start();
