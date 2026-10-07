/**
 * base-bot.js — Alpha Terminal Bot Taban Sınıfı (Model Layer)
 * Tüm botlar bu sınıftan türeyerek kendi bağımsız sinyal havuzunu, stratejisini
 * ve 60 günlük kalıcı arşiv deposunu yönetir.
 */

const signalStoreService = require('../../services/signal-store.service');

class BaseBot {
  constructor(options = {}) {
    this.id = (options.id || 'base_bot').toLowerCase();
    this.name = options.name || 'Base Bot';
    this.description = options.description || '';
    this.maxSignals = options.maxSignals || 50;

    // 1. Kalıcı arşivden son sinyalleri çek
    const savedSignals = signalStoreService.getRecentSignalsByBot(this.id, this.maxSignals);
    if (savedSignals && savedSignals.length > 0) {
      this.signals = [...savedSignals];
    } else if (options.initialSignals && options.initialSignals.length > 0) {
      this.signals = [...options.initialSignals];
      // İlk örnek sinyalleri de arşive kaydet
      this.signals.forEach(s => {
        signalStoreService.recordSignal(this.id, s, this.name);
      });
    } else {
      this.signals = [];
    }
  }

  /**
   * Botun tüm sinyallerini döner
   */
  getSignals() {
    return this.signals;
  }

  /**
   * Sinyal sayısını döner
   */
  getCount() {
    return this.signals.length;
  }

  /**
   * Yeni sinyali listenin en başına ekler (LIFO / en güncel ilk)
   * ve anında 60 günlük kalıcı depoya (data/signals_history.json) kaydeder.
   */
  addSignal(signal) {
    if (!signal) return null;

    const now = Date.now();
    const nowTime = new Date(now).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const formatted = {
      id: signal.id || `${this.id}_${now}`,
      timestamp: signal.timestamp || now,
      symbol: (signal.symbol || signal.coin || 'UNKNOWN').toUpperCase(),
      dateLabel: signal.dateLabel || 'Today',
      time: signal.time || nowTime,
      ...signal
    };

    // 1. Bellek havuzuna ekle
    this.signals.unshift(formatted);
    if (this.signals.length > this.maxSignals) {
      this.signals.pop();
    }

    // 2. 60 Günlük kalıcı arşiv deposuna yaz
    signalStoreService.recordSignal(this.id, formatted, this.name);

    return formatted;
  }

  /**
   * Sinyalleri filtreler
   */
  filter(predicate) {
    return this.signals.filter(predicate);
  }

  /**
   * Sinyal listesini temizler
   */
  clear() {
    this.signals = [];
  }
}

module.exports = BaseBot;
