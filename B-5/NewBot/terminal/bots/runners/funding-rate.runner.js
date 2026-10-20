#!/usr/bin/env node
/**
 * funding-rate.runner.js — Funding Rate (FR) Botu Bağımsız Çalıştırıcısı (Runner)
 * Strateji: Negatif Fonlama Oranı (Short Squeeze Adayları) ve Pozitiften Negatife Geçiş (Funding Flip)
 */

const {
  getWatchlist,
  postSignal,
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

  // Negatif fonlama oranına göre sırala
  const negativeList = watchlist
    .filter(w => typeof w.fr === 'number')
    .sort((a, b) => a.fr - b.fr);

  const now = Date.now();
  const dateObj = new Date(now);
  const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const nowTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  // En negatif ilk 15 pariteyi tara
  const topNeg = negativeList.slice(0, 15);
  let scanned = 0;

  for (const item of topNeg) {
    const sym = item.symbol;
    scanned++;
    logger.scan(BOT_NAME, scanned, totalSignalsFound);

    const prevFr = prevRateMap.get(sym);
    prevRateMap.set(sym, item.fr);

    // Sadece negatif olanları veya belirgin düşenleri ele al
    if (item.fr >= 0) continue;

    const lastSeen = seenMap.get(sym) || 0;
    if (now - lastSeen < 600000) continue; // 10 dk cooldown

    seenMap.set(sym, now);
    totalSignalsFound++;

    const frPct = (item.fr * 100).toFixed(4);
    const prevFrPct = prevFr !== undefined ? (prevFr * 100).toFixed(4) : '+0.0100';
    const isFlip = prevFr !== undefined && prevFr > 0 && item.fr < 0;

    const signalPayload = {
      botId: BOT_ID,
      botType: BOT_ID,
      id: `fr_${sym}_${now}`,
      symbol: sym,
      timestamp: now,
      isoDate: dateObj.toISOString(),
      dateStr,
      dot: isFlip ? '🟢' : '🔴',
      alertText: isFlip ? 'Funding changed from + to - (Short Squeeze)' : 'Negative Funding (Short Squeeze Candidate)',
      fundingRate: `${frPct}%`,
      previousFunding: `${prevFrPct}%`,
      difference: `${(item.fr - (prevFr || 0.0001)).toFixed(4)}%`,
      timeRemaining: '04:00:00',
      strategy: isFlip ? 'Funding Flip (+ -> -)' : 'Aşırı Negatif Fonlama',
      dateLabel: dateStr,
      time: nowTime
    };

    const hubResult = await postSignal(signalPayload);
    logger.signal(BOT_NAME, signalPayload, hubResult);
  }
}

async function start() {
  logger.header(BOT_ID, BOT_NAME, BOT_DESC);
  logger.info(`${BOT_NAME} tarama motoru baslatildi (Her 20 saniyede bir tarar)...`);

  await scan();
  setInterval(() => {
    scan().catch(e => logger.warn(`Tarama hatasi: ${e.message}`));
  }, 20000);
}

start();
