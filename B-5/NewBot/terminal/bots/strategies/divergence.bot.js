/**
 * divergence.bot.js — Divergence (Momentum and price relationship analysis)
 * VisiVero Birebir Stratejiler:
 * 1. 1H RSI DIVERGENCE (🟢 / 🔴) — 1H Regular RSI(14) uyumsuzluğu (%97)
 * 2. 1H RSI SMA CROSSED (🟢 / 🔴) — 1H RSI(14) / SMA(14) kesişimi (%2)
 * 3. 4H RSI DIVERGENCE (🟢 / 🔴) — 4H Regular RSI(14) uyumsuzluğu (%1)
 * Zaman Dilimleri: 1h | 4h | 1d + 1d Pivot (< %1.00 ⚠️)
 */

const BaseBot = require('../base/base-bot');
const botData = require('../../services/bot-data.service');
const { formatCryptoPrice, computePrevPrice } = require('../../services/price-formatter');

class DivergenceBot extends BaseBot {
  constructor() {
    super({
      id: 'div',
      name: 'Divergence',
      description: 'Momentum and price relationship analysis'
    });
  }

  /**
   * Boost değerini güvenli float'a çevirir
   */
  parseBoost(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : Math.abs(val);
    if (!val) return 0;
    const clean = String(val).replace(/[%+,\s]/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : Math.abs(parsed);
  }

  /**
   * Yüzdesel mesafe string veya sayısını temiz mutlak float olarak döner
   */
  parseDistance(val) {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') return Math.abs(val);
    const clean = String(val).replace(/[%+⚠️\s]/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? null : Math.abs(parsed);
  }

  /**
   * Divergence Analiz ve Yön Karar Motoru (VisiVero 1H/4H eşikleri)
   */
  evaluateDivergence({ rsi1h, rsi4h, explicitDot, explicitStrategy, position }) {
    if (explicitDot && (explicitDot === '🟢' || explicitDot === '🔴')) {
      return { valid: true, dot: explicitDot };
    }
    if (position === 'Short') return { valid: true, dot: '🔴' };
    if (position === 'Long') return { valid: true, dot: '🟢' };

    if (Number.isFinite(rsi1h)) {
      if (rsi1h <= 42) return { valid: true, dot: '🟢' };
      if (rsi1h >= 57) return { valid: true, dot: '🔴' };
    }

    if (Number.isFinite(rsi4h)) {
      if (rsi4h <= 35) return { valid: true, dot: '🟢' };
      if (rsi4h >= 65) return { valid: true, dot: '🔴' };
    }

    if (explicitStrategy) {
      const refRsi = Number.isFinite(rsi1h) ? rsi1h : (Number.isFinite(rsi4h) ? rsi4h : 50);
      return { valid: true, dot: refRsi <= 50 ? '🟢' : '🔴' };
    }

    return { valid: false, reason: `1H RSI (${rsi1h}) nötr bölgede (43-56). Belirgin bir uyumsuzluk yok.` };
  }

  ingest(s) {
    if (!s || (!s.coin && !s.symbol)) return null;
    const symbol = (s.coin || s.symbol).toUpperCase();
    const now = s.timestamp || Date.now();
    const dateObj = new Date(now);
    const dateStr = s.dateStr || dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nowTime = s.time || dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const rawPrice = s.currentPrice ?? s.price;
    const priceNum = parseFloat(rawPrice || 0);
    const hasBoost = (s.boost !== undefined && s.boost !== null) || (s.boostValue !== undefined && s.boostValue !== null);
    const boostNum = hasBoost ? this.parseBoost(s.boost ?? s.boostValue) : null;
    const boostFormatted = boostNum !== null && boostNum > 0 ? `+${boostNum.toFixed(2)}%` : null;

    let strategy = '1H RSI DIVERGENCE';
    if (s.strategy) strategy = s.strategy;
    else if (s.rsiSmaCross) strategy = '1H RSI SMA CROSSED';
    else if (s.rsi4hDiv) strategy = '4H RSI DIVERGENCE';

    const rsiObj = (typeof s.rsi === 'object' && s.rsi !== null) ? s.rsi : null;
    const srsiObj = (typeof s.srsi === 'object' && s.srsi !== null) ? s.srsi : null;

    const rsi1hVal = botData.finite(s.rsi1h ?? (!rsiObj ? s.rsi : null));
    const rsi4hVal = botData.finite(s.rsi4h);
    const rsi1dVal = botData.finite(s.rsi1d);

    const srsi1hVal = botData.finite(s.srsi1h ?? s.stochK);
    const srsi4hVal = botData.finite(s.srsi4h ?? s.stochD);
    const srsi1dVal = botData.finite(s.srsi1d);

    const parsedRsi1h = rsi1hVal !== null ? rsi1hVal : (rsiObj?.h1 ? parseFloat(String(rsiObj.h1)) : NaN);
    const parsedRsi4h = rsi4hVal !== null ? rsi4hVal : (rsiObj?.h4 ? parseFloat(String(rsiObj.h4)) : NaN);

    const explicitDot = s.dot || (s.direction === 'down' ? '🔴' : (s.direction === 'up' ? '🟢' : null)) ||
      (s.position === 'Short' ? '🔴' : (s.position === 'Long' ? '🟢' : null));

    const analysis = this.evaluateDivergence({
      rsi1h: parsedRsi1h,
      rsi4h: parsedRsi4h,
      explicitDot,
      explicitStrategy: s.strategy,
      position: s.position
    });

    if (!analysis.valid) {
      console.warn(`[Divergence] ⚠️ #${symbol} sinyali elendi: ${analysis.reason}`);
      return null;
    }

    const dot = analysis.dot;
    const direction = dot === '🔴' ? 'down' : 'up';

    let prevPriceStr = s.prevPrice ? String(s.prevPrice) : null;
    if (!prevPriceStr && priceNum > 0 && boostNum !== null && boostNum > 0) {
      prevPriceStr = computePrevPrice(priceNum, direction === 'down' ? boostNum : -boostNum, symbol);
    }

    // Pivot Mesafesi Kontrolü (Sadece < %1.00 ise gösterilir; asla sahte %0.32 üretilmez)
    let pivotDisplay = null;
    if (s.pivot !== undefined && s.pivot !== null && s.pivot !== '') {
      if (typeof s.pivot === 'string' && s.pivot.includes('%')) {
        const pDist = this.parseDistance(s.pivot);
        pivotDisplay = (pDist !== null && pDist < 1.0) ? s.pivot : null;
      } else {
        const pDist = this.parseDistance(s.pivot);
        pivotDisplay = botData.formatHammerDistanceAlert(pDist);
      }
    }

    const card = {
      id: s.id || ('div_' + now),
      symbol,
      timestamp: now,
      isoDate: dateObj.toISOString(),
      dateStr,
      direction,
      dot,
      strategy,
      boostValue: boostFormatted,
      currentPrice: formatCryptoPrice(rawPrice, symbol),
      prevPrice: prevPriceStr ? formatCryptoPrice(prevPriceStr, symbol) : null,
      rsi: {
        h1: rsiObj?.h1 || botData.rsiTextWithAlert(rsi1hVal),
        h4: rsiObj?.h4 || botData.rsiTextWithAlert(rsi4hVal),
        d1: rsiObj?.d1 || botData.rsiTextWithAlert(rsi1dVal)
      },
      srsi: {
        h1: srsiObj?.h1 || botData.srsiTextWithAlert(srsi1hVal),
        h4: srsiObj?.h4 || botData.srsiTextWithAlert(srsi4hVal),
        d1: srsiObj?.d1 || botData.srsiTextWithAlert(srsi1dVal)
      },
      pivot: pivotDisplay,
      dateLabel: s.dateLabel || dateStr,
      time: nowTime
    };

    if (s.displaySymbol) {
      card.displaySymbol = s.displaySymbol;
    }

    return this.addSignal(card);
  }
}

module.exports = new DivergenceBot();
