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
      const klines1h = await getKlines(sym, '1h', 250);
      const hasFullOhlc = Array.isArray(klines1h) && klines1h.length >= 30 && Number.isFinite(klines1h[0]?.open);

      if (hasFullOhlc) {
        const m1h = quantIndicators.calculateAllMetrics(klines1h);
        if (!m1h) continue;

        let klines4h = [];
        let m4h = null;
        let m1d = null;

        // Pre-check 1h trigger first; if 1h triggers (99% of VisiVero DIV signals), enrich with 4h and 1d
        const trigger1h = strategyRules.shouldEmit(BOT_ID, { m1h, klines1h });
        if (trigger1h) {
          const [raw4h, raw1d] = await Promise.all([
            getKlines(sym, '4h', 250).catch(() => []),
            getKlines(sym, '1d', 250).catch(() => [])
          ]);
          klines4h = Array.isArray(raw4h) ? raw4h : [];
          if (klines4h.length >= 15) m4h = quantIndicators.calculateAllMetrics(klines4h);
          if (Array.isArray(raw1d) && raw1d.length >= 15) {
            m1d = quantIndicators.calculateAllMetrics(raw1d);
          }
        } else {
          // 1% of VisiVero DIV signals are 4H RSI DIVERGENCE
          const raw4h = await getKlines(sym, '4h', 250).catch(() => []);
          klines4h = Array.isArray(raw4h) ? raw4h : [];
          if (klines4h.length >= 30) {
            m4h = quantIndicators.calculateAllMetrics(klines4h);
          }
          if (!strategyRules.shouldEmit(BOT_ID, { m1h, m4h, klines1h, klines4h })) continue;
          const raw1d = await getKlines(sym, '1d', 250).catch(() => []);
          if (Array.isArray(raw1d) && raw1d.length >= 15) {
            m1d = quantIndicators.calculateAllMetrics(raw1d);
          }
        }

        const evalDiv = strategyRules.evaluateDivergence({ m1h, m4h, m1d, klines1h, klines4h });
        if (!evalDiv) continue;

        const activeKlines = evalDiv.timeframe === '4h' && klines4h.length >= 2 ? klines4h : klines1h;
        const lastBar = activeKlines[activeKlines.length - 1];
        const observed = botData.priceChange(activeKlines);
        if (!observed) continue;

        const dateObj = new Date(now);
        const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

        const signalPayload = {
          botId: BOT_ID,
          source: 'binance-rest',
          strategyVersion: evalDiv.strategyVersion || strategyRules.DIV_VERSION,
          observedAt: Date.now(),
          botType: BOT_ID,
          id: `div_${sym}_${now}`,
          candleOpenTime: lastBar.openTime,
          timeframe: evalDiv.timeframe,
          symbol: sym,
          timestamp: now,
          isoDate: dateObj.toISOString(),
          dateStr,
          direction: evalDiv.direction,
          dot: evalDiv.dot,
          strategy: evalDiv.strategy,
          boostValue: evalDiv.boostValue,
          measuredChangePct: observed.changePct,
          currentPrice: formatCryptoPrice(observed.current, sym),
          prevPrice: formatCryptoPrice(observed.previous, sym),
          rsi: evalDiv.rsi,
          srsi: evalDiv.srsi,
          pivot: evalDiv.pivot,
          dateLabel: dateStr,
          time: nowTime
        };

        const hubResult = await postSignal(signalPayload);
        if (isSignalAccepted(hubResult)) {
          seenMap.set(sym, now);
          totalSignalsFound++;
        }
        logger.signal(BOT_NAME, signalPayload, hubResult);
        continue;
      }

      // Fallback for legacy unit test contexts where candles have no open field
      const klines5m = await getKlines(sym, '5m', 250);
      if (klines5m.length < 50 && klines1h.length < 50) continue;

      const m5 = klines5m.length >= 50 ? quantIndicators.calculateAllMetrics(klines5m) : null;
      const m1h = klines1h.length >= 50 ? quantIndicators.calculateAllMetrics(klines1h) : null;
      if (!m5 && !m1h) continue;

      const evalDiv = strategyRules.evaluateDivergence({ m5, m1h });
      if (!evalDiv) continue;

      const is1h = evalDiv.timeframe === '1h';
      const lastBar = is1h ? klines1h[klines1h.length - 1] : klines5m[klines5m.length - 1];
      const dateObj = new Date(now);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const observed = botData.priceChange(is1h ? klines1h : klines5m);
      if (!observed) continue;

      const signalPayload = {
        botId: BOT_ID,
        source: 'binance-rest',
        strategyVersion: evalDiv.strategyVersion || 'local-hypothesis-v1',
        observedAt: Date.now(),
        botType: BOT_ID,
        id: `div_${sym}_${now}`,
        candleOpenTime: lastBar.openTime,
        timeframe: evalDiv.timeframe,
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        dot: evalDiv.dot,
        strategy: evalDiv.strategy,
        boostValue: evalDiv.boostValue,
        measuredChangePct: observed.changePct,
        currentPrice: formatCryptoPrice(observed.current, sym),
        prevPrice: formatCryptoPrice(observed.previous, sym),
        rsi: evalDiv.rsi,
        srsi: evalDiv.srsi,
        pivot: evalDiv.pivot,
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
