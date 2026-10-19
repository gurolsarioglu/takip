/**
 * services/signal-bus.service.js — Merkezi Sinyal Olay Veriyolu (Signal Event Bus)
 * 
 * Tüm bot stratejilerinden (BaseBot) üretilen sinyalleri tek bir kanalda toplar.
 * Dinleyiciler:
 * - Web Terminal WebSocket / Socket.io (Arayüze anlık düşürme)
 * - Telegram Dispatcher Servisi (Telegram kanallarına anlık mesaj basma)
 * - Arşiv ve Analitik Hizmetleri
 */

const EventEmitter = require('events');

class SignalBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }
}

const signalBus = new SignalBus();

module.exports = signalBus;
