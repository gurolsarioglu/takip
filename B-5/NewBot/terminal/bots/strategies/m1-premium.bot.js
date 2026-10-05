/**
 * m1-premium.bot.js — M1 Premium (Momentum & Breakout)
 * Strateji: 1 Dakikalık Ani Mum Sıçraması (Boost), RSI >= 70 Tavan İvmesi, 1m Divergence
 */

const BaseBot = require('../base/base-bot');

const initialSignals = [
  {
    id: 'm1',
    symbol: 'SUPERUSDT',
    boostValue: '+1.39%',
    currentPrice: '0.19732',
    prevPrice: '0.1946',
    rsi: { m1: '78 ❗', m5: '60', h1: '44' },
    srsi: { m1: '80', m5: '76', h1: '10' },
    dateLabel: 'Today',
    time: '16:50'
  },
  {
    id: 'm2',
    symbol: 'SOLUSDT',
    isFavorite: true,
    boostValue: '+1.94%',
    currentPrice: '148.52',
    prevPrice: '146.10',
    rsi: { m1: '64', m5: '53', h1: '46' },
    srsi: { m1: '98 ❗', m5: '9', h1: '71' },
    dateLabel: 'Today',
    time: '16:50'
  },
  {
    id: 'm3',
    symbol: 'SUPERUSDT',
    boostValue: '+1.82%',
    currentPrice: '0.19815',
    prevPrice: '0.1946',
    rsi: { m1: '81 ❗', m5: '63', h1: '46' },
    srsi: { m1: '80', m5: '76', h1: '12' },
    divergence: '1m ✅',
    dateLabel: 'Today',
    time: '16:50'
  },
  {
    id: 'm4',
    symbol: 'FETUSDT',
    boostValue: '+1.09%',
    currentPrice: '1.345',
    prevPrice: '1.320',
    rsi: { m1: '65', m5: '55', h1: '40' },
    srsi: { m1: '87', m5: '76', h1: '53' },
    dateLabel: 'Today',
    time: '16:51'
  }
];

class M1PremiumBot extends BaseBot {
  constructor() {
    super({
      id: 'm1premium',
      name: 'M1 Premium',
      description: 'Enhanced minute-level analytics & divergence',
      initialSignals
    });
  }

  /**
   * Boost değerini güvenli float'a çevirir
   */
  parseBoost(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).replace(/[%+,\s]/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * M1 Premium Momentum & Yıldız (⭐) Değerlendirme Motoru (Trader Mantığı)
   * 1. Boost ivmesi en az +0.80% olmalıdır (doküman: +1.00% ~ +3.00%)
   * 2. 1m RSI >= 60 veya 1m SRSI >= 75 olmalıdır (Güçlü alıcı / momentum)
   * 3. Yıldız (⭐ / isFavorite): Boost >= +1.50% ve (RSI >= 68 veya Divergence veya SRSI >= 95)
   */
  evaluateM1Premium({ boostNum, rsi1m, srsi1m, divergence, explicitFav }) {
    // Breakout eşik kontrolü: En az %0.80 ani sıçrama
    if (boostNum < 0.80) {
      return { valid: false, reason: `Boost (${boostNum.toFixed(2)}%) 1m breakout ivmesi için yetersiz (Min +%0.80 olmalı).` };
    }

    // Momentum teyidi: 1m RSI veya SRSI canlı olmalı
    if (rsi1m < 60 && srsi1m < 75) {
      return { valid: false, reason: `1m RSI (${rsi1m}) ve 1m SRSI (${srsi1m}) momentum bölgesinde değil.` };
    }

    // ⭐ Yıldız / Premium Kalite Kararı
    let isFavorite = false;
    if (explicitFav === true) {
      isFavorite = true;
    } else if (boostNum >= 1.50 && (rsi1m >= 68 || divergence || srsi1m >= 90)) {
      isFavorite = true;
    }

    return { valid: true, isFavorite };
  }

  ingest(s) {
    const symbol = (s.coin || s.symbol).toUpperCase();
    const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const priceNum = parseFloat(s.price || 0);
    const boostNum = this.parseBoost(s.boost || s.boostValue);
    const boostFormatted = `+${boostNum.toFixed(2)}%`;

    // RSI Değerleri (Sayısal parse)
    const rawRsi = parseInt(s.rsi, 10);
    const rsi1mNum = parseInt(s.rsi1m || (!isNaN(rawRsi) ? rawRsi : 72), 10);
    const rsi5mNum = parseInt(s.rsi5m || 60, 10);
    const rsi1hNum = parseInt(s.rsi1h || 45, 10);

    // SRSI Değerleri
    const srsi1mNum = parseInt(s.srsi1m || s.stochK || 85, 10);
    const srsi5mNum = parseInt(s.srsi5m || s.stochD || 70, 10);
    const srsi1hNum = parseInt(s.srsi1h || 30, 10);

    // Divergence Teyidi
    const hasDiv = Boolean(s.divergence || s.rsi1mDiv || s.rsi1hDiv);
    const divDisplay = hasDiv ? '1m ✅' : undefined;

    // M1 Premium Doğrulama ve Yıldız Motoru
    const explicitFav = s.isFavorite !== undefined ? Boolean(s.isFavorite) : null;
    const analysis = this.evaluateM1Premium({
      boostNum,
      rsi1m: rsi1mNum,
      srsi1m: srsi1mNum,
      divergence: hasDiv,
      explicitFav
    });

    if (!analysis.valid) {
      console.warn(`[M1Premium] ⚠️ #${symbol} sinyali elendi: ${analysis.reason}`);
      return null;
    }

    // prevPrice güvenliği: Eğer prevPrice yoksa veya price ile aynıysa, boost üzerinden geriye doğru hesapla
    let prevPriceStr = s.prevPrice ? String(s.prevPrice) : '';
    if (!prevPriceStr || prevPriceStr === String(s.price)) {
      if (priceNum > 0 && boostNum !== 0) {
        const computedPrev = priceNum / (1 + boostNum / 100);
        prevPriceStr = priceNum > 1 ? computedPrev.toFixed(4) : computedPrev.toFixed(6);
      } else {
        prevPriceStr = priceNum > 0 ? String(priceNum) : '0.00';
      }
    }

    // Dinamik ❗ formatlama: RSI >= 70; SRSI >= 80
    const fmtRsi = (v) => `${v}${v >= 70 ? ' ❗' : ''}`;
    const fmtSrsi = (v) => `${v}${v >= 80 ? ' ❗' : ''}`;

    const card = {
      id: 'm1p_' + Date.now(),
      symbol: symbol,
      isFavorite: analysis.isFavorite,
      boostValue: boostFormatted,
      currentPrice: priceNum > 0 ? (priceNum > 1 ? priceNum.toFixed(4) : priceNum.toFixed(6)) : String(s.price || '0.00'),
      prevPrice: prevPriceStr,
      rsi: {
        m1: fmtRsi(rsi1mNum),
        m5: fmtRsi(rsi5mNum),
        h1: fmtRsi(rsi1hNum)
      },
      srsi: {
        m1: fmtSrsi(srsi1mNum),
        m5: fmtSrsi(srsi5mNum),
        h1: fmtSrsi(srsi1hNum)
      },
      dateLabel: 'Today',
      time: nowTime
    };

    if (divDisplay) {
      card.divergence = divDisplay;
    }

    return this.addSignal(card);
  }
}

module.exports = new M1PremiumBot();
