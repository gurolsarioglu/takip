const intervals = new Set(['1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w','1M']);
function createKlineHandler(engine) {
  return async (req, res, next) => {
    const symbol = String(req.query.symbol || '').toUpperCase().trim();
    const interval = String(req.query.interval || '');
    const limit = Number(req.query.limit || 500);
    if (!/^[A-Z0-9]{2,40}$/.test(symbol) || !intervals.has(interval) || !Number.isInteger(limit) || limit < 1) {
      return res.status(400).json({ error: 'Invalid kline parameters' });
    }
    // Large chart histories and explicit time ranges keep the existing proxy semantics.
    if (limit > 250 || req.query.startTime || req.query.endTime) return next();
    try {
      const candles = await engine.getKlines(symbol, interval, limit);
      if (!candles.length) return res.status(502).json({ error: 'Fresh kline data unavailable' });
      return res.json(candles.map(c => c.raw));
    } catch (error) {
      return res.status(502).json({ error: 'Fresh kline data unavailable' });
    }
  };
}
module.exports = { createKlineHandler };
