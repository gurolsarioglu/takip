#!/usr/bin/env node
/**
 * funding-rate.runner.js — Funding Rate (FR) Botu Bağımsız Çalıştırıcısı (Runner)
 * Strateji: Negatif Fonlama Oranı (Short Squeeze Adayları) ve Pozitiften Negatife Geçiş (Funding Flip)
 */

const {
  createScanLoop,
  isSignalAccepted,
  strategyRules,
  getWatchlist,
  postSignal,
  botData,
  logger
} = require('./runner-helper');

const BOT_ID = 'fr';
const BOT_NAME = 'Funding Rate';
const BOT_DESC = 'Negatif fonlama oranları, short squeeze adayları ve fonlama geçiş radarı';

const seenMap = new Map();
const prevRateMap = new Map();
let totalSignalsFound = 0;

async function scan() {
  const watchlist = await getWatchlist();
  if (!watchlist || watchlist.length === 0) return;

  // Negatif fonlama oranına göre sırala (Mod A: +/0'dan -'ye geçiş yapanlara öncelik ver)
  const previousRates = new Map(prevRateMap);
  for (const item of watchlist) {
    if (Number.isFinite(item.fr)) prevRateMap.set(item.symbol, item.fr);
  }
  const negativeList = watchlist
    .filter(w => Number.isFinite(w.fr) && w.fr < 0)
    .sort((a, b) => {
      const aFlip = previousRates.has(a.symbol) && previousRates.get(a.symbol) >= 0 ? 1 : 0;
      const bFlip = previousRates.has(b.symbol) && previousRates.get(b.symbol) >= 0 ? 1 : 0;
      if (aFlip !== bFlip) return bFlip - aFlip;
      return a.fr - b.fr;
    });

  const now = Date.now();
  const dateObj = new Date(now);
  const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  // En öncelikli ilk 15 negatif / geçiş yapan pariteyi tara
  const topNeg = negativeList.slice(0, 15);
  let scanned = 0;

  for (const item of topNeg) {
    const sym = item.symbol;
    scanned++;
    logger.scan(BOT_NAME, scanned, totalSignalsFound);

    const prevFr = previousRates.get(sym);
    const evalFr = strategyRules.evaluateFunding({
      rate: item.fr,
      prevRate: prevFr,
      nextFundingTime: item.nextFundingTime,
      now
    });
    if (!evalFr) continue;

    const lastSeen = seenMap.get(sym) || 0;
    if (now - lastSeen < 600000) continue; // 10 dk cooldown

    const signalPayload = {
      botId: BOT_ID,
      source: 'binance-rest',
      strategyVersion: evalFr.strategyVersion || strategyRules.FR_VERSION,
      observedAt: Date.now(),
      botType: BOT_ID,
      id: `fr_${sym}_${now}`,
      symbol: sym,
      timestamp: now,
      isoDate: dateObj.toISOString(),
      dateStr,
      mode: evalFr.mode,
      dot: evalFr.dot,
      alertText: evalFr.alertText,
      fundingRate: evalFr.fundingRate,
      previousFunding: evalFr.previousFunding,
      difference: evalFr.difference,
      timeRemaining: evalFr.timeRemaining,
      nextFundingTime: evalFr.nextFundingTime,
      strategy: evalFr.strategy,
      dateLabel: dateStr,
      time: nowTime
    };

    const hubResult = await postSignal(signalPayload);
    if (isSignalAccepted(hubResult)) {
      seenMap.set(sym, now);
      totalSignalsFound++;
    }
    logger.signal(BOT_NAME, signalPayload, hubResult);
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
