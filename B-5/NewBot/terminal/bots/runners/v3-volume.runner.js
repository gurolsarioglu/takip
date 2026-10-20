#!/usr/bin/env node
/**
 * v3-volume.runner.js — V3-A Hacim Botu Bağımsız Çalıştırıcısı (Runner)
 * Strateji: 5m Delta Hacim Artışı (DeltaVol >= +15%) ve 24s Hacim Eşiği (> $5M USD)
 */

const {
  createScanLoop,
  isSignalAccepted,
  strategyRules,
  getWatchlist,
  getKlines,
  postSignal,
  logger,
  quantIndicators
} = require('./runner-helper');

const BOT_ID = 'v3';
const BOT_NAME = 'V3-A Hacim';
const BOT_DESC = 'Anlık hacim patlaması, para girişi ve delta volume radarı';

const seenMap = new Map();
let totalSignalsFound = 0;

async function scan() {
  const watchlist = await getWatchlist();
  if (!watchlist || watchlist.length === 0) return;

  // 24s Hacmi $5M üzerinde olan pariteleri filtrele
  const candidates = watchlist.filter(w => (w.volUsd || 0) >= 5000000).slice(0, 60);
  let scanned = 0;

  for (const item of candidates) {
    const sym = item.symbol;
    scanned++;
    logger.scan(BOT_NAME, scanned, totalSignalsFound);

    const now = Date.now();
    const lastSeen = seenMap.get(sym) || 0;
    if (now - lastSeen < 300000) continue; // 5 dk cooldown

    try {
      const klines5m = await getKlines(sym, '5m', 250);
      if (klines5m.length < 20) continue;

      const vols = klines5m.map(k => k.volume);
      const deltaVolPct = quantIndicators.calculateDeltaVolume(vols, 20);

      // Delta Hacim Eşiği: en az +15%
      if (!strategyRules.shouldEmit(BOT_ID, { deltaVolPct, volUsd: item.volUsd })) continue;


      const dateObj = new Date(now);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      const baseAsset = sym.replace('USDT', '');
      const approxVolM = ((item.volUsd || 5000000) / 1000000).toFixed(1);

      const signalPayload = {
        botId: BOT_ID,
        source: 'binance-rest',
        strategyVersion: 'local-hypothesis-v1',
        observedAt: Date.now(),
        botType: BOT_ID,
        id: `v3_${sym}_${now}`,
        symbol: sym,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        dot: '🟢',
        hacimChange: `+${deltaVolPct.toFixed(2)}%`,
        hacim24s: `$${approxVolM}M (${baseAsset})`,
        strategy: '5m Ani Hacim Sıçraması',
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
