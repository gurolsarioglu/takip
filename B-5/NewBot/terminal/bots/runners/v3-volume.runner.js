#!/usr/bin/env node
/**
 * v3-volume.runner.js — V3-A Hacim Botu Bağımsız Çalıştırıcısı (Runner)
 * Strateji (VisiVero V3-A): Her dakikanın :00 saniyesinde son kapanan 1m mumunun
 * 24s Base Asset hacmini >= +8.00% artırması ve 24s Hacim değerinin Base Asset cinsinden yazılması.
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
const BOT_DESC = '1m kapanış (:00 sn) 24s Base Asset hacim sıçraması (>= +8.00%) radarı';

const seenMap = new Map();
const seenCandleMap = new Map();
const prevBaseVolMap = new Map();
let totalSignalsFound = 0;

async function scan() {
  const watchlist = await getWatchlist();
  if (!watchlist || watchlist.length === 0) return;

  const previousBaseVols = new Map(prevBaseVolMap);
  for (const item of watchlist) {
    const vb = Number(item.volBase ?? item.volume24h ?? item.volume);
    if (Number.isFinite(vb) && vb > 0) {
      prevBaseVolMap.set(item.symbol, vb);
    }
  }

  // Önce 24s base hacmi bir önceki taramaya göre >= %8 sıçrayanları, ardından en aktif 60 pariteyi seç
  const candidates = watchlist
    .filter(w => {
      const vb = Number(w.volBase ?? w.volume24h ?? w.volume);
      return (Number.isFinite(vb) && vb >= 500) || (w.volUsd || 0) >= 1000000 || watchlist.length <= 10;
    })
    .sort((a, b) => {
      const aPrev = previousBaseVols.get(a.symbol);
      const bPrev = previousBaseVols.get(b.symbol);
      const aVb = Number(a.volBase ?? a.volume24h ?? a.volume);
      const bVb = Number(b.volBase ?? b.volume24h ?? b.volume);
      const aSurge = (Number.isFinite(aPrev) && aPrev > 0 && Number.isFinite(aVb)) ? ((aVb - aPrev) / aPrev) * 100 : 0;
      const bSurge = (Number.isFinite(bPrev) && bPrev > 0 && Number.isFinite(bVb)) ? ((bVb - bPrev) / bPrev) * 100 : 0;
      if ((aSurge >= 8) !== (bSurge >= 8)) return bSurge >= 8 ? 1 : -1;
      return (b.volUsd || 0) - (a.volUsd || 0);
    })
    .slice(0, 60);

  let scanned = 0;

  for (const item of candidates) {
    const sym = item.symbol;
    scanned++;
    logger.scan(BOT_NAME, scanned, totalSignalsFound);

    const now = Date.now();
    const lastSeen = seenMap.get(sym) || 0;
    if (now - lastSeen < 300000) continue; // 5 dk cooldown

    try {
      const volBase24h = Number(item.volBase ?? item.volume24h ?? item.volume);
      const prevVolBase24h = previousBaseVols.get(sym);

      const klines1m = await getKlines(sym, '1m', 10);
      let evalV3 = strategyRules.evaluateV3({
        symbol: sym,
        klines1m: Array.isArray(klines1m) && klines1m.length > 0 ? klines1m : null,
        volBase24h: Number.isFinite(volBase24h) && volBase24h > 0 ? volBase24h : null,
        prevVolBase24h: Number.isFinite(prevVolBase24h) && prevVolBase24h > 0 ? prevVolBase24h : null
      });

      // Yalnızca 1m kline bulunmayan eski test ortamları için 5m geri dönüşü
      if (!evalV3 && (!klines1m || klines1m.length === 0) && quantIndicators?.calculateDeltaVolume) {
        const klines5m = await getKlines(sym, '5m', 250);
        if (Array.isArray(klines5m) && klines5m.length >= 20) {
          const vols = klines5m.map(k => k.volume);
          const deltaVolPct = quantIndicators.calculateDeltaVolume(vols, 20);
          evalV3 = strategyRules.evaluateV3({
            symbol: sym,
            volBase24h: Number.isFinite(volBase24h) ? volBase24h : null,
            volUsd: item.volUsd,
            deltaVolPct
          });
        }
      }

      if (!evalV3) continue;

      if (evalV3.candleOpenTime !== null && seenCandleMap.get(sym) === evalV3.candleOpenTime) {
        continue;
      }

      const dateObj = new Date(now);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      const signalPayload = {
        botId: BOT_ID,
        source: 'binance-rest',
        strategyVersion: evalV3.strategyVersion || strategyRules.V3_VERSION,
        observedAt: Date.now(),
        botType: BOT_ID,
        id: `v3_${sym}_${now}`,
        symbol: sym,
        timeframe: evalV3.timeframe || '1m',
        candleOpenTime: evalV3.candleOpenTime ?? null,
        timestamp: now,
        isoDate: dateObj.toISOString(),
        dateStr,
        dot: evalV3.dot ?? '',
        hacimChange: evalV3.hacimChange,
        hacim24s: evalV3.hacim24s,
        strategy: 'V3-A Volume Surge',
        dateLabel: dateStr,
        time: nowTime
      };

      const hubResult = await postSignal(signalPayload);
      if (isSignalAccepted(hubResult)) {
        seenMap.set(sym, now);
        if (evalV3.candleOpenTime !== null) {
          seenCandleMap.set(sym, evalV3.candleOpenTime);
        }
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
  logger.info(`${BOT_NAME} tarama motoru baslatildi (:00 sn mum kapanisi & 15sn periyodik)...`);

  const loop = createScanLoop(scan, 15000, { onError: e => logger.warn(`Tarama hatasi: ${e.message}`) });
  await loop.run();
}

if (require.main === module) start();
module.exports = { scan, start };
