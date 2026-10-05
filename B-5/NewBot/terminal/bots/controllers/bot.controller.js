/**
 * bot.controller.js — Bot MVC Controller Katmanı
 * HTTP isteklerini işler, BotManager üzerinden ilgili botu çağırır ve JSON yanıt döner.
 */

const botManager = require('../index');

class BotController {
  /**
   * GET /api/signals?bot=...
   */
  getSignals(req, res) {
    try {
      const requestedBotId = req.query.bot || 'hammerproplus';
      const bot = botManager.getBot(requestedBotId);

      return res.json({
        bot: bot.name,
        count: bot.getCount(),
        signals: bot.getSignals()
      });
    } catch (err) {
      console.error('[BotController.getSignals] Hata:', err.message);
      return res.status(500).json({ error: 'Sinyaller alinamadi' });
    }
  }

  /**
   * POST /api/signals/emit
   * Harici veya yerel botlardan gelen sinyalleri işler
   */
  emitSignal(req, res) {
    try {
      const signalData = req.body;
      if (!signalData || (!signalData.coin && !signalData.symbol)) {
        return res.status(400).json({ error: 'Gecersiz sinyal verisi' });
      }

      const result = botManager.emitSignal(signalData);
      console.log(`[Signal Ingest] ✅ Yeni sinyal eklendi: #${result.symbol} -> [${result.affectedBots.join(', ')}] [${result.time}]`);
      
      return res.json({
        success: true,
        symbol: result.symbol,
        affectedBots: result.affectedBots,
        time: result.time
      });
    } catch (err) {
      console.error('[BotController.emitSignal] Hata:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new BotController();
