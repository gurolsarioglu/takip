/**
 * hammer-pro.bot.js — Hammer Pro (Automated Pattern Analysis & Reversal Scanner)
 * VisiVero Birebir Stratejiler: #W1 (1m WaveTrend Kesişimi) ve #S1 (1m RSI/SMA Ekstrem Dönüşü)
 * Zaman Dilimleri: 1m | 5m | 1h (Hem 🟢 Long hem 🔴 Short Reversal destekler)
 */

const BaseBot = require('../base/base-bot');
const botData = require('../../services/bot-data.service');
const { formatCryptoPrice, computePrevPrice } = require('../../services/price-formatter');

class HammerProBot extends BaseBot {
  constructor() {
    super({
      id: 'hammerpro',
      name: 'Hammer Pro',
      description: 'Automated pattern analysis & reversal scanner'
    });
  }

  parseBoost(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : Math.abs(val);
    if (!val) return 0;
    const clean = String(val).replace(/[%+,\s]/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : Math.abs(parsed);
  }

  parseDistance(val) {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') return Math.abs(val);
    const clean = String(val).replace(/[%+⚠️\s]/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? null : Math.abs(parsed);
  }

  calculateStars(boostNum) {
    return botData.hammerStars(boostNum);
  }

  validateReversalQuality({ direction, rsi1m, rsi5m, srsi5m, boostNum, hasWT }) {
    if (direction === 'down') {
      if (rsi1m < 55 || rsi5m < 55) {
        return { valid: false, reason: `Short dönüş için 1m/5m RSI (${rsi1m}/${rsi5m}) aşırı alım bölgesinde değil.` };
      }
      if (!hasWT && (rsi1m < 70 || boostNum < 0.23)) {
        return { valid: false, reason: `Short #S1 için 1m RSI >= 71 ve Boost >= %0.23 gerekli.` };
      }
      if (Number.isFinite(srsi5m) && srsi5m < 60) {
        return { valid: false, reason: `5m SRSI (${srsi5m}) aşırı alım bölgesinde değil.` };
      }
      return { valid: true };
    }

    if (rsi1m > 45 || rsi5m > 45) {
      return { valid: false, reason: `Long dönüş için 1m/5m RSI (${rsi1m}/${rsi5m}) aşırı satım bölgesinde değil.` };
    }
    if (!hasWT && (rsi1m > 30 || boostNum < 0.30)) {
      return { valid: false, reason: `Long #S1 için 1m RSI <= 29 ve Boost >= %0.30 gerekli.` };
    }
    if (Number.isFinite(srsi5m) && srsi5m > 25) {
      return { valid: false, reason: `5m SRSI (${srsi5m}) aşırı satım bölgesinde değil.` };
    }
    return { valid: true };
  }

  ingest(s) {
    const symbol = (s.coin || s.symbol).toUpperCase();
    const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const direction = (s.dot === '🔴' || s.direction === 'down' || s.position === 'Short') ? 'down' : 'up';
    const dot = direction === 'down' ? '🔴' : '🟢';

    const priceNum = parseFloat(s.price || s.currentPrice || 0);
    const boostNum = this.parseBoost(s.boost || s.boostValue);
    const boostFormatted = `+${boostNum.toFixed(2)}%`;

    let prevPriceStr = s.prevPrice ? String(s.prevPrice) : '';
    if (!prevPriceStr || prevPriceStr === String(s.price || s.currentPrice)) {
      if (priceNum > 0 && boostNum !== 0) {
        prevPriceStr = computePrevPrice(priceNum, direction === 'down' ? boostNum : -boostNum, symbol);
      } else {
        prevPriceStr = formatCryptoPrice(s.price || s.currentPrice, symbol);
      }
    }

    const rawRsi = parseInt(s.rsi, 10);
    const defaultRsi = direction === 'down' ? 72 : 28;
    const rsi1mNum = parseInt(s.rsi1m ?? (!isNaN(rawRsi) ? rawRsi : defaultRsi), 10);
    const rsi5mNum = parseInt(s.rsi5m ?? (!isNaN(rawRsi) ? rawRsi : (direction === 'down' ? 68 : 30)), 10);
    const rsi1hNum = parseInt(s.rsi1h ?? (direction === 'down' ? 60 : 35), 10);

    const srsi1mNum = parseInt(s.srsi1m ?? s.stochK ?? (direction === 'down' ? 65 : 20), 10);
    const srsi5mNum = parseInt(s.srsi5m ?? s.stochD ?? (direction === 'down' ? 85 : 5), 10);
    const srsi1hNum = parseInt(s.srsi1h ?? (direction === 'down' ? 80 : 10), 10);

    const strategy = s.strategy || (s.wt ? '#W1' : (rsi1mNum <= 29 || rsi1mNum >= 71 ? '#S1' : '#W1'));
    const hasWT = Boolean(s.wt || strategy === '#W1');
    const wtDisplay = s.wt || (strategy === '#W1' ? (direction === 'down' ? '1m🔴' : '1m🟢') : null);

    const validation = this.validateReversalQuality({
      direction,
      rsi1m: rsi1mNum,
      rsi5m: rsi5mNum,
      srsi5m: srsi5mNum,
      boostNum,
      hasWT
    });

    if (!validation.valid) {
      console.warn(`[HammerPro] ⚠️ #${symbol} sinyali elendi: ${validation.reason}`);
      return null;
    }

    const pDist = this.parseDistance(s.pivot);
    const pivotDisplay = typeof s.pivot === 'string' && s.pivot.includes('%')
      ? s.pivot
      : botData.formatHammerDistanceAlert(pDist);

    const eDist = this.parseDistance(s.ema200);
    const ema200Display = typeof s.ema200 === 'string' && s.ema200.includes('%')
      ? s.ema200
      : botData.formatHammerDistanceAlert(eDist);

    const frDisplay = typeof s.fr === 'string' && s.fr.includes('⚠️')
      ? s.fr
      : botData.formatHammerFundingAlert(s.fr ?? s.fundingRate);

    const card = {
      id: 'hp_' + Date.now(),
      symbol,
      dot,
      stars: s.stars !== undefined ? s.stars : this.calculateStars(boostNum),
      strategy,
      boostValue: boostFormatted,
      currentPrice: formatCryptoPrice(s.price || s.currentPrice, symbol),
      prevPrice: prevPriceStr,
      rsi: {
        m1: botData.rsiTextWithAlert(rsi1mNum),
        m5: botData.rsiTextWithAlert(rsi5mNum),
        h1: botData.rsiTextWithAlert(rsi1hNum)
      },
      srsi: {
        m1: botData.srsiTextWithAlert(srsi1mNum),
        m5: botData.srsiTextWithAlert(srsi5mNum),
        h1: botData.srsiTextWithAlert(srsi1hNum)
      },
      dateLabel: 'Today',
      time: nowTime
    };

    if (wtDisplay) card.wt = wtDisplay;
    if (s.divergence) card.divergence = s.divergence;
    if (pivotDisplay) card.pivot = pivotDisplay;
    if (ema200Display) card.ema200 = ema200Display;
    if (frDisplay) card.fr = frDisplay;
    if (s.btcStatus) card.btcStatus = s.btcStatus;

    return this.addSignal(card);
  }
}

module.exports = new HammerProBot();
