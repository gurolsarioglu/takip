#!/usr/bin/env node
/**
 * hammer-pro-plus.runner.js — Hammer Pro Plus Botu Bağımsız Çalıştırıcısı (Runner)
 * Strateji: 5m/1h Çoklu Dip Konfluensi, WaveTrend (10,21) Kesişimi, Seanslık Pivot Sıçraması (#W1 / #S1)
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
        getKlines(sym, '5m', 250),
        getKlines(sym, '1h', 250)
      ]);

      if (klines5m.length < 50 && klines1h.length < 50) continue;

      const lastBar5m = klines5m[klines5m.length - 1];
      const m5 = klines5m.length >= 50 ? quantIndicators.calculateAllMetrics(klines5m) : null;
      const m1h = klines1h.length >= 50 ? quantIndicators.calculateAllMetrics(klines1h) : null;
      if (!m5 && !m1h) continue;

      const hasFullOhlc = klines5m.length > 0 && Number.isFinite(klines5m[0]?.open);
      let klines1m = [];
      let m1 = null;
      if (hasFullOhlc) {
        klines1m = await getKlines(sym, '1m', 250);
        if (klines1m.length >= 50) {
          m1 = quantIndicators.calculateAllMetrics(klines1m);
        }
      }

      const fundingRate = item.fr ?? null;
      if (!strategyRules.shouldEmit(BOT_ID, { m1, m5, m1h, klines1m, fundingRate })) continue;

      let m4h = null, m1d = null;
      const triggerBar = (m1 && klines1m.length > 0) ? klines1m[klines1m.length - 1] : lastBar5m;
      const triggerTf = (m1 && klines1m.length > 0) ? '1m' : '5m';
      if (m1 && triggerBar) {
        const [klines4h, klines1d] = await Promise.all([
          getKlines(sym, '4h', 250),
          getKlines(sym, '1d', 30)
        ]);
        if (klines4h.length >= 50 && typeof quantIndicators.calculateAllMetrics === 'function') {
          m4h = quantIndicators.calculateAllMetrics(klines4h);
        }
        if (klines1d.length >= 2 && typeof quantIndicators.calculatePivots === 'function') {
          m1d = { pivots: quantIndicators.calculatePivots(klines1d[klines1d.length - 2], triggerBar.close) };
        }
      }

      const evalHpp = strategyRules.evaluateHammer(BOT_ID, { m1, m5, m1h, m4h, m1d, klines1m, fundingRate });
      if (!evalHpp) continue;

      const dateObj = new Date(now);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const observed = (m1 && klines1m.length >= 2) ? botData.priceChange(klines1m) : botData.priceChange(klines5m);
      if (!observed || !triggerBar) continue;

      const signalPayload = {
        botId: BOT_ID,
        source: 'binance-rest',
        strategyVersion: evalHpp.strategyVersion || 'local-hypothesis-v1',
        observedAt: Date.now(),
        botType: BOT_ID,
        id: `hpp_${sym}_${now}`,
        candleOpenTime: triggerBar.openTime,
        timeframe: triggerTf,
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        stars: evalHpp.stars,
        dot: evalHpp.dot,
        strategy: evalHpp.strategy,
        boostValue: evalHpp.boostValue,
        measuredChangePct: observed.changePct,
        currentPrice: formatCryptoPrice(observed.current, sym),
        prevPrice: formatCryptoPrice(observed.previous, sym),
        rsi: evalHpp.rsi,
        srsi: evalHpp.srsi,
        wt: evalHpp.wt,
        divergence: evalHpp.divergence,
        pivot: evalHpp.pivot,
        ema200: evalHpp.ema200,
        fr: evalHpp.fr,
        btcStatus: evalHpp.btcStatus,
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
  logger.info(`${BOT_NAME} tarama motoru baslatildi (Her 15 saniyede bir tarar)...`);

  const loop = createScanLoop(scan, 15000, { onError: e => logger.warn(`Tarama hatasi: ${e.message}`) });
  await loop.run();
}

if (require.main === module) start();
module.exports = { scan, start };
