/**
 * funding-rate.bot.js — FR (Funding Rate Perspective, Simulation & Arbitrage Alerts)
 * Strateji: Funding Flip (+ to -), Negatif Fonlama Derinleşmesi, Squeeze Uyarısı
 */

const BaseBot = require('../base/base-bot');

class FundingRateBot extends BaseBot {
  constructor() {
    super({
      id: 'fr',
      name: 'FR',
      description: 'Funding rate perspective, simulation & arbitrage alerts'
    });
  }

  /**
   * Fonlama oranını güvenli float yüzdesine çevirir (yoksa null döner)
   */
  parseFundingRate(val) {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return Number.isFinite(val) ? val : null;
    const clean = String(val).replace(/[%,\s]/g, '').trim();
    if (!clean) return null;
    const parsed = parseFloat(clean);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /**
   * Binance 8 saatlik periyotlarına (UTC 00:00, 08:00, 16:00) göre kalan süreyi hesaplar
   */
  calculateFundingCountdown() {
    const now = new Date();
    const currentUtcHour = now.getUTCHours();
    const nextFundingUtcHour = Math.ceil((currentUtcHour + 0.001) / 8) * 8;
    
    const targetUtc = new Date(now);
    targetUtc.setUTCHours(nextFundingUtcHour, 0, 0, 0);

    let diffMs = targetUtc.getTime() - now.getTime();
    if (diffMs < 0) diffMs += 8 * 3600 * 1000;

    const diffSecTotal = Math.floor(diffMs / 1000);
    const hours = Math.floor(diffSecTotal / 3600);
    const minutes = Math.floor((diffSecTotal % 3600) / 60);
    const seconds = diffSecTotal % 60;

    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  /**
   * VisiVero FR 3-Modlu Karar Motoru:
   * - Mod A (🟢): Pozitiften (veya 0.0000'dan) negatife geçiş -> 'Funding changed from + to -'
   * - Mod B (🔴): Derin negatif fonlama değişimi (<= -0.25% veya negatif derinleşme)
   * - Mod C (''): Periyodik negatif fonlama taraması (Previous Funding & Difference olmadan ikonsuz #SYMBOL)
   */
  evaluateFundingRate({ currNum, prevNum, explicitAlert, explicitDot }) {
    if (currNum === null) {
      return { valid: false, reason: 'Geçerli bir fonlama oranı bulunamadı.' };
    }

    if (explicitAlert && explicitDot !== undefined) {
      return { valid: true, mode: 'explicit', alertText: explicitAlert, dot: explicitDot };
    }

    const hasPrev = prevNum !== null && prevNum !== undefined;

    // Mod A: + veya 0'dan -'ye geçiş (🟢 ⚠️ Funding changed from + to -)
    if (hasPrev && prevNum >= 0 && currNum < 0) {
      return {
        valid: true,
        mode: 'A',
        alertText: 'Funding changed from + to -',
        dot: '🟢'
      };
    }

    // Mod B: Negatif bölgede değişim / derinleşme (🔴)
    if (hasPrev && prevNum < 0 && currNum < 0 && Math.abs(currNum - prevNum) > 1e-9) {
      return {
        valid: true,
        mode: 'B',
        alertText: explicitAlert || (currNum <= -0.25 ? 'High Negative Funding Alert' : 'Negative Funding Deepening'),
        dot: '🔴'
      };
    }

    // Mod C: Periyodik negatif tarama (İkonsuz #SYMBOL, Previous Funding ve Difference yok)
    if (!hasPrev && currNum < 0) {
      return {
        valid: true,
        mode: 'C',
        alertText: explicitAlert || null,
        dot: explicitDot !== undefined ? explicitDot : ''
      };
    }

    // -'den +'ya geçiş
    if (hasPrev && prevNum < 0 && currNum > 0) {
      return {
        valid: true,
        mode: 'flip_to_plus',
        alertText: explicitAlert || 'Funding changed from - to +',
        dot: '🟢'
      };
    }

    return { valid: false, reason: `Fonlama oranı (${currNum}) negatif veya geçiş koşulunu sağlamıyor.` };
  }

  ingest(s) {
    const symbol = (s.coin || s.symbol).toUpperCase();
    const now = s.timestamp || Date.now();
    const dateObj = new Date(now);
    const dateStr = s.dateStr || dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nowTime = s.time || dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const currNum = this.parseFundingRate(s.fundingRate ?? s.funding ?? s.rate);
    const prevNum = this.parseFundingRate(s.previousFunding ?? s.prevRate);

    const explicitAlert = s.alertText ? String(s.alertText).replace(/^[⚠️\s]+/, '').trim() : null;
    const analysis = this.evaluateFundingRate({
      currNum,
      prevNum,
      explicitAlert,
      explicitDot: s.dot
    });

    if (!analysis.valid) {
      console.warn(`[FundingRate] ⚠️ #${symbol} sinyali elendi: ${analysis.reason}`);
      return null;
    }

    const hasPrev = prevNum !== null && prevNum !== undefined && analysis.mode !== 'C';
    const diffNum = hasPrev ? (currNum - prevNum) : null;
    const diffFormatted = diffNum === null ? null : `${diffNum.toFixed(4)}%`;

    const currFormatted = `${currNum.toFixed(4)}%`;
    const prevFormatted = hasPrev ? `${prevNum.toFixed(4)}%` : null;

    const timeRemaining = s.timeRemaining || this.calculateFundingCountdown();

    const card = {
      id: s.id || ('fr_' + now),
      symbol: symbol,
      timestamp: now,
      isoDate: s.isoDate || dateObj.toISOString(),
      dateStr,
      dot: analysis.dot,
      alertText: analysis.alertText,
      strategy: s.strategy || analysis.alertText || 'Negative Funding Scan',
      fundingRate: currFormatted,
      previousFunding: prevFormatted,
      difference: diffFormatted,
      timeRemaining: timeRemaining,
      dateLabel: s.dateLabel || dateStr,
      time: nowTime
    };

    return this.addSignal(card);
  }
}

module.exports = new FundingRateBot();
