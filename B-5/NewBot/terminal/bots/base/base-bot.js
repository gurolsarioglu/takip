/**
 * base-bot.js — Alpha Terminal Bot Taban Sınıfı (Model Layer)
 * Tüm botlar bu sınıftan türeyerek kendi bağımsız sinyal havuzunu ve stratejisini yönetir.
 */

class BaseBot {
  constructor(options = {}) {
    this.id = options.id || 'base_bot';
    this.name = options.name || 'Base Bot';
    this.description = options.description || '';
    this.maxSignals = options.maxSignals || 50;
    this.signals = options.initialSignals ? [...options.initialSignals] : [];
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
   */
  addSignal(signal) {
    if (!signal) return null;
    
    // Temel alan garantisi
    const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const formatted = {
      id: signal.id || `${this.id}_${Date.now()}`,
      symbol: (signal.symbol || signal.coin || 'UNKNOWN').toUpperCase(),
      dateLabel: signal.dateLabel || 'Today',
      time: signal.time || nowTime,
      ...signal
    };

    this.signals.unshift(formatted);
    if (this.signals.length > this.maxSignals) {
      this.signals.pop();
    }
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
