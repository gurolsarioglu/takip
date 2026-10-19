/**
 * services/telegram-dispatcher.service.js — Telegram Bot & Sinyal Dağıtım Servisi
 * 
 * Alpha Terminal Quant Motoru tarafından üretilen tüm bot sinyallerini
 * dinler, Telegram HTML formatına dönüştürür ve belirlenen Telegram kanallarına/gruplarına iletir.
 * 
 * Tasarım Özellikleri:
 * - SignalBus dinleyicisi ile %100 Event-Driven çalışır.
 * - Sinyal motoruna bağımlılık yaratmaz (Telegram kapalıyken sıfır ek yük).
 * - Kullanıcı tokenları verdiğinde tek satırla (`enable()` veya TELEGRAM_ENABLED=true) anında aktif olur.
 * - Her bot için ayrı kanal ID'si (ör. M1-A kanalı, Hammer kanalı) veya tek bir VIP kanal desteği.
 */

const https = require('https');
const signalBus = require('./signal-bus.service');

class TelegramDispatcherService {
  constructor() {
    this.enabled = process.env.TELEGRAM_ENABLED === 'true' || false;
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.defaultChatId = process.env.TELEGRAM_DEFAULT_CHAT_ID || '';
    
    // Bot ID -> Özel Kanal/Grup ID Eşlemesi (Opsiyonel)
    // Örnek: { m1a: '-100123456789', hammerproplus: '-100987654321' }
    this.botChannels = new Map();
    if (process.env.TELEGRAM_BOT_CHANNELS) {
      try {
        const parsed = JSON.parse(process.env.TELEGRAM_BOT_CHANNELS);
        Object.entries(parsed).forEach(([k, v]) => this.botChannels.set(k.toLowerCase(), v));
      } catch (e) {
        console.warn('[TelegramDispatcher] TELEGRAM_BOT_CHANNELS JSON ayrıştırma hatası:', e.message);
      }
    }

    // Gönderim Kuyruğu ve Rate-Limiting (Telegram: 30 msg/sec genel, 1 msg/sec aynı chat)
    this.queue = [];
    this.isProcessingQueue = false;
    this.lastSendTime = 0;

    // SignalBus dinleyicisini bağla
    this._initBusListener();
  }

  /**
   * SignalBus üzerindeki sinyalleri dinler
   */
  _initBusListener() {
    signalBus.on('signal', async ({ botId, botName, signal }) => {
      if (!this.enabled || !this.botToken) return;
      try {
        await this.dispatchSignal(botId, botName, signal);
      } catch (err) {
        console.warn(`[TelegramDispatcher] Sinyal iletme hatası (${botId}):`, err.message);
      }
    });
  }

  /**
   * Çalışma zamanında dinamik yapılandırma (Kullanıcı token verdiğinde çağrılır)
   */
  configure({ token, defaultChatId, channels = {}, enabled = true }) {
    if (token) this.botToken = token;
    if (defaultChatId) this.defaultChatId = defaultChatId;
    if (channels) {
      Object.entries(channels).forEach(([k, v]) => this.botChannels.set(k.toLowerCase(), v));
    }
    this.enabled = enabled;
    console.log(`[TelegramDispatcher] Yapılandırıldı. Durum: ${this.enabled ? 'AKTİF 🟢' : 'PASİF ⚪'}`);
  }

  /**
   * Sinyali zengin Telegram HTML şablonuna çevirir
   */
  formatSignalHtml(botId, botName, signal) {
    const sym = signal.symbol || signal.coin || 'UNKNOWN';
    const cleanSym = sym.toUpperCase();
    const dot = signal.dot || (signal.type === 'drop' ? '🔴' : '🟢');
    const price = signal.currentPrice || signal.price || '---';
    const prevPrice = signal.prevPrice || '---';
    const dateStr = signal.dateStr || new Date().toLocaleDateString('tr-TR');
    const timeStr = signal.time || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    let lines = [];
    lines.push(`${dot} <b>#${cleanSym}</b> | <b>${botName || botId.toUpperCase()}</b>`);
    
    // 1. Değer ve Fiyat
    if (signal.boostValue) lines.push(`⚡ <b>Boost:</b> <code>${signal.boostValue}</code>`);
    if (signal.dropValue)  lines.push(`📉 <b>Düşüş:</b> <code>${signal.dropValue}</code>`);
    if (signal.hacimChange) lines.push(`📊 <b>Hacim Patlaması:</b> <code>${signal.hacimChange}</code>`);
    if (signal.fundingRate) lines.push(`💰 <b>Fonlama:</b> <code>${signal.fundingRate}</code> (${signal.alertText || ''})`);

    lines.push(`💵 <b>Fiyat:</b> <code>${price}</code> (Önceki: <code>${prevPrice}</code>)`);

    // 2. İndikatör Detayları
    if (signal.rsi) {
      if (typeof signal.rsi === 'object') {
        lines.push(`📈 <b>RSI:</b> 1m: <code>${signal.rsi.m1 || '-'}</code> | 5m: <code>${signal.rsi.m5 || '-'}</code> | 1h: <code>${signal.rsi.h1 || '-'}</code>`);
      } else {
        lines.push(`📈 <b>RSI:</b> <code>${signal.rsi}</code>`);
      }
    }

    if (signal.srsi) {
      if (typeof signal.srsi === 'object') {
        lines.push(`🎯 <b>StochRSI:</b> 1m: <code>${signal.srsi.m1 || '-'}</code> | 5m: <code>${signal.srsi.m5 || '-'}</code> | 1h: <code>${signal.srsi.h1 || '-'}</code>`);
      } else {
        lines.push(`🎯 <b>StochRSI:</b> <code>${signal.srsi}</code>`);
      }
    }

    if (signal.wt) lines.push(`🌊 <b>WaveTrend:</b> <code>${signal.wt}</code>`);
    if (signal.pivot) lines.push(`📍 <b>Pivot Mesafe:</b> <code>${signal.pivot}</code>`);
    if (signal.strategy) lines.push(`🏷️ <b>Strateji:</b> <code>${signal.strategy}</code>`);
    if (signal.stars) lines.push(`✨ <b>Sinyal Gücü:</b> ${signal.stars}`);

    // 3. Alt Bilgi
    lines.push(`🕒 <i>${dateStr} ${timeStr} (UTC+3)</i>`);
    lines.push(`🔗 <a href="https://www.binance.com/en/futures/${cleanSym}">Binance Vadeli Grafiği</a>`);

    return lines.join('\n');
  }

  /**
   * Sinyali ilgili hedefe gönderir
   */
  async dispatchSignal(botId, botName, signal) {
    const targetChatId = this.botChannels.get(botId.toLowerCase()) || this.defaultChatId;
    if (!targetChatId) {
      return; // Hedef kanal tanımlı değil
    }

    const messageHtml = this.formatSignalHtml(botId, botName, signal);
    return this.enqueueMessage(targetChatId, messageHtml);
  }

  /**
   * Mesajı rate limit kuyruğuna ekler
   */
  enqueueMessage(chatId, textHtml) {
    return new Promise((resolve, reject) => {
      this.queue.push({ chatId, textHtml, resolve, reject });
      this._processQueue();
    });
  }

  async _processQueue() {
    if (this.isProcessingQueue || this.queue.length === 0) return;
    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      const now = Date.now();
      const elapsed = now - this.lastSendTime;
      
      // En az 100ms bekle (saniyede maks 10 istek, Telegram limitlerine tam uyum)
      if (elapsed < 100) {
        await new Promise(r => setTimeout(r, 100 - elapsed));
      }

      try {
        const res = await this._sendTelegramHttpRequest(item.chatId, item.textHtml);
        this.lastSendTime = Date.now();
        item.resolve(res);
      } catch (err) {
        console.warn(`[TelegramDispatcher] Mesaj gönderilemedi (${item.chatId}):`, err.message);
        item.reject(err);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Telegram Bot API'sine doğrudan HTTPS POST isteği atar
   */
  _sendTelegramHttpRequest(chatId, textHtml) {
    return new Promise((resolve, reject) => {
      if (!this.botToken) {
        return reject(new Error('TELEGRAM_BOT_TOKEN tanimli degil'));
      }

      const payload = JSON.stringify({
        chat_id: chatId,
        text: textHtml,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });

      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${this.botToken}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.ok) {
              resolve(parsed.result);
            } else {
              reject(new Error(parsed.description || 'Telegram API Error'));
            }
          } catch (e) {
            reject(new Error(`Gecersiz Telegram yaniti: ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Telegram API istek zaman asimi'));
      });

      req.write(payload);
      req.end();
    });
  }

  /**
   * Test mesajı gönderimi (Bağlantı doğrulama için)
   */
  async sendTestMessage(chatId) {
    const target = chatId || this.defaultChatId;
    if (!target) throw new Error('Hedef Chat ID belirtilmedi');
    const testHtml = `🚀 <b>Alpha Terminal — Telegram Baglanti Testi</b>\n\n✅ Sistem aktif ve sinyaller dinleniyor.\n🕒 <i>${new Date().toLocaleTimeString('tr-TR')}</i>`;
    return this._sendTelegramHttpRequest(target, testHtml);
  }

  getStatus() {
    return {
      enabled: this.enabled,
      hasToken: !!this.botToken,
      defaultChatId: this.defaultChatId ? 'TANITILDI' : 'YOK',
      channelCount: this.botChannels.size,
      queueLength: this.queue.length
    };
  }
}

const telegramDispatcher = new TelegramDispatcherService();

module.exports = telegramDispatcher;
