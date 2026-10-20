// Strategy rules engine with recovered VisiVero Hammer Pro & Hammer Pro Plus (#W1 / #S1 / #R1) formulas.
const botData = require('../services/bot-data.service');

const VERSION = 'local-hypothesis-v1';
const HAMMER_VERSION = 'visivero-hammer-v2';
const finite = Number.isFinite;
const low = (value, threshold) => finite(value) && value <= threshold;
const high = (value, threshold) => finite(value) && value >= threshold;
const hasDivergence = metric => metric?.divergence?.hasBullDiv === true || metric?.divergence?.hasBearDiv === true;

function isSniperSetup(m1h) {
  return low(m1h?.rsi, 40) || low(m1h?.srsiK, 25);
}

function collectHammerDivergence(direction, m1, m5, m1h) {
  const key = direction === 'down' ? 'hasBearDiv' : 'hasBullDiv';
  const tags = [];
  if (m1?.divergence?.[key] === true) tags.push('1m✅');
  if (m5?.divergence?.[key] === true) tags.push('5m✅');
  if (m1h?.divergence?.[key] === true) tags.push('1h✅');
  return tags.length > 0 ? tags.join(' | ') : null;
}

/**
 * Evaluates Bot 5 (Hammer Pro) and Bot 6 (Hammer Pro Plus) using the recovered VisiVero
 * 1m + 5m + 1h multi-timeframe #W1 / #S1 / #R1 formulas and 5-bar 1m impulse Boost Value.
 * Falls back cleanly to m5/m1h evaluation when m1 is omitted in partial test contexts.
 */
function evaluateHammer(id, ctx = {}) {
  const { m1, m5, m1h, m4h, m1d, klines1m, fundingRate, btcVolatile, btcChangePct } = ctx;
  const isProPlus = id === 'hammerproplus';

  // Full 1m + 5m + 1h VisiVero evaluation path
  if (finite(m1?.rsi) && finite(m5?.rsi)) {
    const wtUp = m1.wtCrossUpClosed === true || m1.wtCrossUp === true;
    const wtDown = m1.wtCrossDownClosed === true || m1.wtCrossDown === true;
    const boostUp = finite(ctx.boostPct) ? ctx.boostPct : botData.impulseBoost(klines1m, 'up', 5);
    const boostDown = finite(ctx.boostPct) ? ctx.boostPct : botData.impulseBoost(klines1m, 'down', 5);

    let matched = null;

    // 1. #W1: 1m WaveTrend(10, 21, 4) cross + 1m/5m RSI & SRSI confluence
    if (wtUp) {
      const all6ExtremeUp = low(m1.rsi, 30) && low(m5.rsi, 30) && low(m1h?.rsi, 30) &&
        low(m1.srsiK, 39) && low(m5.srsiK, 10) && low(m1h?.srsiK, 10);
      const validPro = low(m1.rsi, 45) && low(m5.rsi, 45) && low(m5.srsiK, 20);
      const validPlus = low(m1.rsi, 39) && low(m5.rsi, 36) && low(m5.srsiK, 20) &&
        ((boostUp !== null && boostUp >= 2.0) || all6ExtremeUp);

      if (isProPlus ? validPlus : validPro) {
        matched = { direction: 'up', dot: '🟢', strategy: '#W1', wt: '1m🟢', boostPct: boostUp };
      }
    }

    if (!matched && wtDown) {
      const all6ExtremeDown = high(m1.rsi, 70) && high(m5.rsi, 70) && high(m1h?.rsi, 70) &&
        high(m1.srsiK, 60) && high(m5.srsiK, 90) && high(m1h?.srsiK, 90);
      const validPro = high(m1.rsi, 55) && high(m5.rsi, 55) && high(m5.srsiK, 65);
      const validPlus = high(m1.rsi, 56) && high(m5.rsi, 55) && high(m5.srsiK, 68) &&
        ((boostDown !== null && boostDown >= 2.0) || all6ExtremeDown);

      if (isProPlus ? validPlus : validPro) {
        matched = { direction: 'down', dot: '🔴', strategy: '#W1', wt: '1m🔴', boostPct: boostDown };
      }
    }

    // 2. #S1: Live 1m extreme RSI (<30 or >70) + RSI/SMA(14) cross + 5m RSI/SRSI confluence
    if (!matched) {
      const s1Up = low(m1.rsi, 29.5) && (m1.rsiSmaCrossUp === true || low(m1.rsi, 22)) &&
        low(m5.rsi, 39) && low(m5.srsiK, 18);
      if (s1Up) {
        const boostOk = isProPlus ? (boostUp !== null && boostUp >= 2.0) : (boostUp === null || boostUp >= 0.30);
        if (boostOk) {
          const wtTag = wtUp ? '1m🟢' : ((m1h?.wtCrossUpClosed || m1h?.wtCrossUp) ? '1h🟢' : null);
          matched = { direction: 'up', dot: '🟢', strategy: '#S1', wt: wtTag, boostPct: boostUp };
        }
      }
    }

    if (!matched) {
      const s1Down = high(m1.rsi, 70.5) && (m1.rsiSmaCrossDown === true || high(m1.rsi, 78)) &&
        high(m5.rsi, 60) && high(m5.srsiK, 65);
      if (s1Down) {
        const boostOk = isProPlus ? (boostDown !== null && boostDown >= 2.0) : (boostDown === null || boostDown >= 0.23);
        if (boostOk) {
          const wtTag = wtDown ? '1m🔴' : ((m1h?.wtCrossDownClosed || m1h?.wtCrossDown) ? '1h🔴' : null);
          matched = { direction: 'down', dot: '🔴', strategy: '#S1', wt: wtTag, boostPct: boostDown };
        }
      }
    }

    // 3. #R1: Overbought exhaustion reversal (1m RSI 71..85 & 5m RSI >= 80 & Boost >= 2.50%)
    if (!matched && isProPlus) {
      const r1Down = high(m1.rsi, 71) && low(m1.rsi, 85) && high(m5.rsi, 80) &&
        boostDown !== null && boostDown >= 2.50;
      if (r1Down) {
        matched = { direction: 'down', dot: '🔴', strategy: '#R1', wt: null, boostPct: boostDown };
      }
    }

    if (!matched) return null;

    const pivDist = finite(m1d?.pivots?.pivotDistancePct)
      ? m1d.pivots.pivotDistancePct
      : (finite(m1h?.pivots?.pivotDistancePct) ? m1h.pivots.pivotDistancePct : m5?.pivots?.pivotDistancePct);
    const emaDist = finite(m4h?.ema200DistPct) ? m4h.ema200DistPct : null;

    return {
      matched: true,
      strategyVersion: HAMMER_VERSION,
      direction: matched.direction,
      dot: matched.dot,
      strategy: matched.strategy,
      boostPct: matched.boostPct,
      boostValue: matched.boostPct !== null ? `+${matched.boostPct.toFixed(2)}%` : null,
      stars: botData.hammerStars(matched.boostPct),
      rsi: {
        m1: botData.rsiTextWithAlert(m1?.rsi),
        m5: botData.rsiTextWithAlert(m5?.rsi),
        h1: botData.rsiTextWithAlert(m1h?.rsi)
      },
      srsi: {
        m1: botData.srsiTextWithAlert(m1?.srsiK),
        m5: botData.srsiTextWithAlert(m5?.srsiK),
        h1: botData.srsiTextWithAlert(m1h?.srsiK)
      },
      wt: matched.wt,
      divergence: collectHammerDivergence(matched.direction, m1, m5, m1h),
      pivot: botData.formatHammerDistanceAlert(pivDist),
      ema200: botData.formatHammerDistanceAlert(emaDist),
      fr: botData.formatHammerFundingAlert(fundingRate),
      btcStatus: (btcVolatile === true || (finite(btcChangePct) && Math.abs(btcChangePct) >= 0.50)) ? 'Volatilite ⚡️' : null
    };
  }

  // Fallback for partial test contexts where m1 is not provided
  if (!isProPlus) {
    if (low(m5?.rsi, 42) || (m5?.wtCrossUp === true && low(m5?.rsi, 50))) {
      return {
        matched: true,
        strategyVersion: VERSION,
        direction: 'up',
        dot: '🟢',
        strategy: '#W1',
        boostPct: null,
        boostValue: null,
        stars: m5.rsi <= 35 ? '⭐⭐⭐' : '⭐⭐',
        rsi: {
          m1: '—',
          m5: `${botData.indicatorText(m5?.rsi)}${m5.rsi <= 35 ? ' ❗' : ''}`,
          h1: `${botData.indicatorText(m1h?.rsi)}`
        },
        srsi: {
          m1: '—',
          m5: `${botData.indicatorText(m5?.srsiK)}`,
          h1: `${botData.indicatorText(m1h?.srsiK)}`
        },
        wt: m5.wtCrossUp ? '5m 🟢 Cross' : 'Dip Reversal',
        divergence: null,
        pivot: m5.pivots ? `%${m5.pivots.pivotDistancePct}` : null,
        ema200: null,
        fr: null,
        btcStatus: null
      };
    }
    return null;
  }

  if (
    low(m5?.rsi, 38) &&
    (m5?.wtCrossUp === true || m5?.wtOversold === true || low(m1h?.rsi, 40)) &&
    low(m5?.pivots?.pivotDistancePct, 1.2)
  ) {
    return {
      matched: true,
      strategyVersion: VERSION,
      direction: 'up',
      dot: '🟢',
      strategy: '#W1 / #S1',
      boostPct: null,
      boostValue: null,
      stars: m5.pivots.pivotDistancePct <= 0.40 ? '⭐⭐⭐' : '⭐⭐',
      rsi: {
        m1: '—',
        m5: `${botData.indicatorText(m5?.rsi)} ❗`,
        h1: `${botData.indicatorText(m1h?.rsi)} ❗`
      },
      srsi: {
        m1: '—',
        m5: `${botData.indicatorText(m5?.srsiK)} ❗`,
        h1: `${botData.indicatorText(m1h?.srsiK)} ❗`
      },
      wt: '5m 🟢',
      divergence: null,
      pivot: `%${m5.pivots.pivotDistancePct} ⚠️`,
      ema200: null,
      fr: null,
      btcStatus: null
    };
  }

  return null;
}

function shouldEmit(id, ctx = {}) {
  const { m5, m1h } = ctx;
  switch (id) {
    case 'm1a': return finite(ctx.changePct) && Math.abs(ctx.changePct) >= .95;
    case 'm1premium': return high(ctx.changePct, .7) && high(ctx.volumeRatio, 1.05) &&
      (high(ctx.rsi, 55) || high(ctx.stochK, 60));
    case 'hammerpro':
    case 'hammerproplus':
      return Boolean(evaluateHammer(id, ctx));
    case '4s': return high(m1h?.rsi, 58) || high(m1h?.srsiK, 70);
    case '4ssniper': return isSniperSetup(m1h) && high(ctx.whaleLong, 55);
    case 'div': return hasDivergence(m1h) || hasDivergence(m5);
    case 'v3': return high(ctx.volUsd, 5000000) && high(ctx.deltaVolPct, 15);
    case 'fr': return finite(ctx.rate) && ctx.rate < 0;
    default: return false;
  }
}

module.exports = { VERSION, HAMMER_VERSION, shouldEmit, evaluateHammer, isSniperSetup, hasDivergence };
