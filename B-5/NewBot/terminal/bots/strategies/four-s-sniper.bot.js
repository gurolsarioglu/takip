/**
 * four-s-sniper.bot.js — 4S Sniper (4H Structure Reversal Scanner)
 * VisiVero Birebir Stratejiler:
 * 1. NW UP (🟢) / NW DOWN (🔴) — 4H Nadaraya-Watson Envelope (h=8, mult=3, repaint=true)
 * 2. 4H RSI SMA CROSSED (🟢 / 🔴) — 4H RSI(14) / SMA(14) kesişimi
 * 3. 4H RSI DIVERGENCE (🟢 / 🔴) — 4H Regular RSI(14) uyumsuzluğu
 * Zaman Dilimleri: 1h | 4h | 1d
 */

const BaseBot = require('../base/base-bot');
const botData = require('../../services/bot-data.service');
const { formatCryptoPrice, computePrevPrice } = require('../../services/price-formatter');

class FourSSniperBot extends BaseBot {
  constructor() {
    super({
      id: '4ssniper',
      name: '4S Sniper',
      description: 'Multi-angle view of the 4H structure (NW UP / NW DOWN / 4H RSI)'
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
   * Dominant-Side Positioning (VisiVero 200/200 doğrulanmış kural: her zaman >= %50.00)
   * Long >= %50 ise Long% 🟢, Long < %50 ise (100 - Long)% 🔴 döner.
   */
  parseDominantRatio(val, explicitDot = null) {
    if (val === undefined || val === null || val === '') {
      return { value: null, formatted: null, dot: null };
    }
    if (typeof val === 'number') {
      const dom = botData.dominantPositioning(val);
      return dom
        ? { value: dom.pct, formatted: dom.text, dot: explicitDot || dom.dot }
        : { value: null, formatted: null, dot: null };
    }
    const str = String(val).trim();
    let dotFromStr = explicitDot;
    if (!dotFromStr) {
      if (str.includes('🟢')) dotFromStr = '🟢';
      else if (str.includes('🔴')) dotFromStr = '🔴';
    }
    const clean = str.replace(/[🟢🔴⚪%+,\s]/g, '').trim();
    const parsed = parseFloat(clean);
    if (isNaN(parsed)) return { value: null, formatted: null, dot: null };

    if (dotFromStr) {
      return { value: parsed, formatted: `${parsed.toFixed(2)}%`, dot: dotFromStr };
    }
    const dom = botData.dominantPositioning(parsed);
    return dom
      ? { value: dom.pct, formatted: dom.text, dot: dom.dot }
      : { value: null, formatted: null, dot: null };
  }

  /**
   * 4S Sniper Doğrulama ve Kalite Filtresi (Hem 🟢 Long hem 🔴 Short 4H kurulumları destekler)
   */
  validateSniperReversal({ direction, rsi4h, rsi1h, boostNum }) {
    if (boostNum > 65.0) {
      return { valid: false, reason: `Boost (${boostNum.toFixed(2)}%) aşırı genişlemiş.` };
    }
    if (direction === 'down') {
      if (Number.isFinite(rsi4h) && rsi4h < 55) {
        return { valid: false, reason: `Short 4S Sniper için 4h RSI (${rsi4h}) aşırı alım bölgesinde değil (Min 58).` };
      }
      if (!Number.isFinite(rsi4h) && Number.isFinite(rsi1h) && rsi1h < 55) {
        return { valid: false, reason: `Short 4S Sniper için 1h RSI (${rsi1h}) aşırı alım bölgesinde değil.` };
      }
      return { valid: true };
    }

    if (Number.isFinite(rsi4h) && rsi4h > 52) {
      return { valid: false, reason: `Long 4S Sniper için 4h RSI (${rsi4h}) uygun bölgede değil (Max 50).` };
    }
    if (!Number.isFinite(rsi4h) && Number.isFinite(rsi1h) && rsi1h > 45) {
      return { valid: false, reason: `Long 4S Sniper için 1h RSI (${rsi1h}) uygun bölgede değil.` };
    }
    return { valid: true };
  }

  ingest(s) {
    if (!s || (!s.coin && !s.symbol)) return null;
    const symbol = (s.coin || s.symbol).toUpperCase();
    const nowTime = s.time || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const rawStrat = String(s.strategy || '').toUpperCase();
    const direction = (s.dot === '🔴' || s.direction === 'down' || s.position === 'Short' || rawStrat.includes('DOWN'))
      ? 'down'
      : 'up';
    const dot = s.dot || (direction === 'down' ? '🔴' : '🟢');
    const strategy = s.strategy || (direction === 'down' ? 'NW DOWN' : 'NW UP');

    const rawPrice = s.currentPrice ?? s.price;
    const priceNum = parseFloat(rawPrice || 0);
    const hasBoost = s.boost !== undefined && s.boost !== null || s.boostValue !== undefined && s.boostValue !== null;
    const boostNum = hasBoost ? this.parseBoost(s.boost ?? s.boostValue) : null;
    const boostFormatted = boostNum !== null && boostNum > 0 ? `+${boostNum.toFixed(2)}%` : null;

    let prevPriceStr = s.prevPrice ? String(s.prevPrice) : null;
    if (!prevPriceStr && priceNum > 0 && boostNum !== null && boostNum > 0) {
      prevPriceStr = computePrevPrice(priceNum, direction === 'down' ? boostNum : -boostNum, symbol);
    }

    const rsiObj = (typeof s.rsi === 'object' && s.rsi !== null) ? s.rsi : null;
    const srsiObj = (typeof s.srsi === 'object' && s.srsi !== null) ? s.srsi : null;

    const rsi1hVal = botData.finite(s.rsi1h ?? (!rsiObj ? s.rsi : null));
    const rsi4hVal = botData.finite(s.rsi4h);
    const rsi1dVal = botData.finite(s.rsi1d);

    const srsi1hVal = botData.finite(s.srsi1h);
    const srsi4hVal = botData.finite(s.srsi4h ?? s.stochK);
    const srsi1dVal = botData.finite(s.srsi1d);

    const parsedRsi4h = rsi4hVal !== null ? rsi4hVal : (rsiObj?.h4 ? parseFloat(String(rsiObj.h4)) : NaN);
    const parsedRsi1h = rsi1hVal !== null ? rsi1hVal : (rsiObj?.h1 ? parseFloat(String(rsiObj.h1)) : NaN);

    const validation = this.validateSniperReversal({
      direction,
      rsi4h: parsedRsi4h,
      rsi1h: parsedRsi1h,
      boostNum: boostNum || 0
    });

    if (!validation.valid) {
      console.warn(`[4SSniper] ⚠️ #${symbol} sinyali elendi: ${validation.reason}`);
      return null;
    }

    const tpData = this.parseDominantRatio(s.traderPositioning, s.traderDot);
    const meData = this.parseDominantRatio(s.marketExposure, s.exposureDot);

    const card = {
      id: s.id || ('4ss_' + Date.now()),
      symbol,
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
      traderPositioning: tpData.formatted,
      traderDot: tpData.dot,
      marketExposure: meData.formatted,
      exposureDot: meData.dot,
      dateLabel: s.dateLabel || 'Today',
      time: nowTime
    };

    if (s.displaySymbol) {
      card.displaySymbol = s.displaySymbol;
    }

    return this.addSignal(card);
  }
}

module.exports = new FourSSniperBot();
