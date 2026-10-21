// Shared data contract. Unknown data must never turn into a fabricated confirmation.
function finite(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function ratio(value) {
  const n = finite(value);
  return n !== null && n >= 0 && n <= 100 ? n : null;
}
function sentimentMetrics(sentiment) {
  return {
    whaleLong: ratio(sentiment?.topAccount?.longPct),
    positionLong: ratio(sentiment?.topPosition?.longPct),
    globalLong: ratio(sentiment?.globalExposure?.longPct)
  };
}
function sentimentPayload(symbol, responses, now = Date.now()) {
  const readRatio = response => {
    const row = response?.status === 'fulfilled' && Array.isArray(response.value) ? response.value.at(-1) : null;
    const long = finite(row?.longAccount);
    if (long === null || long < 0 || long > 1) return null;
    return { longPct: long * 100, shortPct: (1 - long) * 100 };
  };
  let orderBook = null;
  const depth = responses.depth?.status === 'fulfilled' ? responses.depth.value : null;
  if (Array.isArray(depth?.bids) && Array.isArray(depth?.asks)) {
    const sum = rows => rows.reduce((total, row) => {
      const quantity = finite(row[1]);
      return quantity === null || quantity < 0 ? NaN : total + quantity;
    }, 0);
    const bid = sum(depth.bids), ask = sum(depth.asks), total = bid + ask;
    if (Number.isFinite(total) && total > 0) orderBook = { bidPct: bid / total * 100, askPct: ask / total * 100 };
  }
  return { symbol, orderBook, topPosition: readRatio(responses.posRatio),
    topAccount: readRatio(responses.accRatio), globalExposure: readRatio(responses.globRatio), updatedAt: now };
}
function percent(value, digits = 2, signed = false) {
  const n = finite(value);
  return n === null ? null : `${signed && n > 0 ? '+' : ''}${n.toFixed(digits)}%`;
}
function indicatorText(value) {
  const n = finite(value);
  return n === null ? '—' : String(Math.round(n));
}
function rsiTextWithAlert(value) {
  const n = finite(value);
  if (n === null) return '—';
  const r = Math.round(n);
  return (r <= 30 || r >= 70) ? `${r}❗️` : `${r}`;
}
function srsiTextWithAlert(value) {
  const n = finite(value);
  if (n === null) return '—';
  const k = Math.round(n);
  return (k <= 10 || k >= 90) ? `${k}❗️` : `${k}`;
}
function hammerStars(boostPct) {
  const b = finite(boostPct);
  if (b === null || b < 2.0) return '';
  if (b >= 5.0) return '⭐️⭐️⭐️';
  if (b >= 3.0) return '⭐️⭐️';
  return '⭐️';
}
function impulseBoost(candles, direction = 'up', windowSize = 5) {
  if (!Array.isArray(candles) || candles.length === 0) return null;
  const slice = candles.slice(-windowSize);
  let maxPct = null;
  for (const c of slice) {
    const open = finite(c?.open);
    const high = finite(c?.high);
    const low = finite(c?.low);
    if (open === null || high === null || low === null || open <= 0 || low <= 0) continue;
    const pct = direction === 'down'
      ? ((high - open) / open) * 100
      : ((open - low) / low) * 100;
    if (Number.isFinite(pct) && pct >= 0 && (maxPct === null || pct > maxPct)) {
      maxPct = pct;
    }
  }
  return maxPct !== null ? parseFloat(maxPct.toFixed(2)) : null;
}
function formatHammerDistanceAlert(distPct) {
  const d = finite(distPct);
  if (d === null || d < 0 || d >= 1.0) return null;
  return `%${d.toFixed(2)} ⚠️`;
}
function formatHammerFundingAlert(fr) {
  const n = finite(fr);
  if (n === null) return null;
  // Accepts either decimal (-0.0023) or percentage (-0.23)
  const pct = Math.abs(n) <= 0.05 ? n * 100 : n;
  if (pct > -0.20) return null;
  return `${pct.toFixed(2)} ⚠️`;
}
function extractBaseAsset(symbol) {
  return String(symbol || '').toUpperCase().trim().replace(/(USDT|USDC|BUSD)$/i, '');
}
function formatBaseVolume24h(baseVolume, symbol) {
  const baseAsset = extractBaseAsset(symbol);
  if (typeof baseVolume === 'string' && baseAsset && baseVolume.toUpperCase().includes(baseAsset)) {
    return baseVolume.trim();
  }
  let n = finite(baseVolume);
  if (n === null && typeof baseVolume === 'string') {
    let raw = baseVolume.trim();
    if ((raw.match(/\./g) || []).length > 1) {
      raw = raw.replace(/\./g, '');
    } else if (raw.includes('.') && raw.includes(',')) {
      raw = raw.replace(/\./g, '').replace(',', '.');
    }
    n = finite(raw.replace(/[^0-9.-]/g, ''));
  }
  if (n === null || n <= 0 || !baseAsset) return null;
  const intStr = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${intStr} ${baseAsset}`;
}
function calculateV3VolumeSurge({ klines1m, vol1m, volBase24h, prevVolBase24h } = {}) {
  const v24 = finite(volBase24h);
  const prev24 = finite(prevVolBase24h);
  if (v24 !== null && prev24 !== null && prev24 > 0 && v24 > prev24) {
    return ((v24 - prev24) / prev24) * 100;
  }

  let closed1mVol = finite(vol1m);
  let targetIdx = -1;
  if (closed1mVol === null && Array.isArray(klines1m) && klines1m.length > 0) {
    targetIdx = (klines1m.length >= 2 && klines1m[klines1m.length - 1]?.isClosed === false)
      ? klines1m.length - 2
      : klines1m.length - 1;
    closed1mVol = finite(klines1m[targetIdx]?.volume);
  }

  if (v24 !== null && closed1mVol !== null && closed1mVol > 0 && v24 > closed1mVol) {
    const prior24 = v24 - closed1mVol;
    if (prior24 > 0) return (closed1mVol / prior24) * 100;
  }

  if (closed1mVol !== null && closed1mVol > 0 && Array.isArray(klines1m) && klines1m.length >= 2) {
    const idx = targetIdx >= 0 ? targetIdx : klines1m.length - 1;
    if (idx >= 1) {
      const priorSum = klines1m.slice(0, idx).reduce((acc, k) => acc + (finite(k?.volume) || 0), 0);
      if (priorSum > 0) return (closed1mVol / priorSum) * 100;
    }
  }

  return null;
}
function countdown(nextTime, now = Date.now()) {
  const end = finite(nextTime);
  if (end === null || end <= 0) return null;
  const seconds = Math.max(0, Math.floor((end - now) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]
    .map(n => String(n).padStart(2, '0')).join(':');
}
function fundingFields(current, previous, nextTime, now = Date.now()) {
  const curr = finite(current), prev = finite(previous);
  return {
    fundingRate: curr === null ? null : percent(curr * 100, 4),
    previousFunding: prev === null ? null : percent(prev * 100, 4),
    difference: curr === null || prev === null ? null : percent((curr - prev) * 100, 4),
    timeRemaining: countdown(nextTime, now),
    nextFundingTime: finite(nextTime)
  };
}
function priceChange(candles) {
  if (!Array.isArray(candles) || candles.length < 2) return null;
  const latest = candles[candles.length - 1], prior = candles[candles.length - 2];
  const current = finite(latest.close), previous = finite(prior.close);
  if (current === null || previous === null || current <= 0 || previous <= 0) return null;
  return { current, previous, changePct: (current - previous) / previous * 100 };
}
function isSignalAccepted(reply) {
  return reply?.status === 200 && (reply.data?.accepted === true ||
    (reply.data?.accepted === undefined && reply.data?.success === true));
}
module.exports = {
  finite,
  ratio,
  sentimentMetrics,
  sentimentPayload,
  percent,
  indicatorText,
  rsiTextWithAlert,
  srsiTextWithAlert,
  hammerStars,
  impulseBoost,
  formatHammerDistanceAlert,
  formatHammerFundingAlert,
  extractBaseAsset,
  formatBaseVolume24h,
  calculateV3VolumeSurge,
  countdown,
  fundingFields,
  priceChange,
  isSignalAccepted
};
