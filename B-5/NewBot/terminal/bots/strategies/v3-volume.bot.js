/**
 * v3-volume.bot.js — V3-A (Real-time volume monitoring)
 * Strateji: Anlık Hacim Patlaması & Taze Para Girişi Taraması
 */

const BaseBot = require('../base/base-bot');
const botData = require('../../services/bot-data.service');

class V3VolumeBot extends BaseBot {
  constructor() {
    super({
      id: 'v3',
      name: 'V3-A',
      description: 'Real-time volume monitoring & surge detector'
    });
  }

  /**
   * Hacim değişim yüzdesini güvenli float'a çevirir
   */
  parseVolumeChange(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).replace(/[%+,\s]/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * 24 saatlik baz hacim değerini binlik basamaklarıyla ve coin birimiyle formatlar
   * Örn: 40814, 'TSM' -> '40.814 TSM' | 1261919761, 'DOOD' -> '1.261.919.761 DOOD'
   */
  formatVolume24h(val, baseAsset) {
    return botData.formatBaseVolume24h(val, baseAsset);
  }

  /**
   * V3-A Hacim Patlama Doğrulama Filtresi (VisiVero Standardı)
   * 1. Son kapanan 1m mumunun 24s base hacmi artışı en az +8.00% olmalıdır.
   * 2. Negatif hacim veya hacim daralması bu bota giremez.
   * 3. İllikit çöp coin filtresi: 24 saatlik baz hacim en az 500 birim olmalıdır.
   */
  validateVolumeSurge({ volumeChangeNum, volume24hRaw }) {
    if (!Number.isFinite(volumeChangeNum) || volumeChangeNum < 8.00) {
      return { valid: false, reason: `Hacim artışı (%${Number(volumeChangeNum || 0).toFixed(2)}) yetersiz (Min +%8.00 olmalı).` };
    }

    if (volume24hRaw !== undefined && volume24hRaw !== null) {
      let rawStr = String(volume24hRaw).trim();
      if ((rawStr.match(/\./g) || []).length > 1) {
        rawStr = rawStr.replace(/\./g, '');
      } else if (rawStr.includes('.') && rawStr.includes(',')) {
        rawStr = rawStr.replace(/\./g, '').replace(',', '.');
      }
      const num24 = typeof volume24hRaw === 'number' ? volume24hRaw : parseFloat(rawStr.replace(/[^0-9.]/g, ''));
      if (!isNaN(num24) && num24 > 0 && num24 < 500) {
        return { valid: false, reason: `24s baz hacim (${num24}) çok düşük; illikit yapay hareket riski.` };
      }
    }

    return { valid: true };
  }

  ingest(s) {
    const symbol = (s.coin || s.symbol).toUpperCase();
    const baseAsset = botData.extractBaseAsset(symbol);
    const now = s.timestamp || Date.now();
    const dateObj = new Date(now);
    const dateStr = s.dateStr || dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nowTime = s.time || dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const volChangeNum = this.parseVolumeChange(
      s.hacimChange ?? s.volumeChange ?? s.volumeSurge ?? s.volumeSurgePct ?? s.boost
    );
    const raw24h = s.hacim24s ?? s.volume24h ?? s.volBase24h ?? s.volBase ?? s.volume;

    const validation = this.validateVolumeSurge({
      volumeChangeNum: volChangeNum,
      volume24hRaw: raw24h
    });

    if (!validation.valid) {
      console.warn(`[V3Volume] ⚠️ #${symbol} sinyali elendi: ${validation.reason}`);
      return null;
    }

    const volChangeFormatted = `+${volChangeNum.toFixed(2)}%`;
    const vol24sFormatted = this.formatVolume24h(raw24h, baseAsset);

    const card = {
      id: s.id || ('v3_' + now),
      symbol: symbol,
      timeframe: s.timeframe || '1m',
      candleOpenTime: s.candleOpenTime ?? null,
      timestamp: now,
      isoDate: s.isoDate || dateObj.toISOString(),
      dateStr,
      dot: s.dot !== undefined ? s.dot : '',
      hacimChange: volChangeFormatted,
      hacim24s: vol24sFormatted,
      dateLabel: s.dateLabel || dateStr,
      time: nowTime
    };

    return this.addSignal(card);
  }
}

module.exports = new V3VolumeBot();
