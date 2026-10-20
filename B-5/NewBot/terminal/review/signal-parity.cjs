// Research-only comparator. Never fetches reference feeds or emits trading signals.
const { createHash } = require('node:crypto');
const aliases = { m1: 'm1a', 'm1-premium': 'm1premium', 'hammer-pro': 'hammerpro',
  'hammer-pro-plus': 'hammerproplus', '4sniper': '4ssniper' };
function parseObservation(bot, raw, observedAt, context = {}) {
  const text = String(raw);
  return { id: createHash('sha256').update(bot + '\n' + text).digest('hex'),
    identityKind: 'visible-content-hash', bot: aliases[bot] || bot,
    symbol: text.match(/#([A-Z0-9]+?USDT)/)?.[1] || null,
    direction: /^\s*🟢/.test(text) ? 'up' : /^\s*🔴/.test(text) ? 'down' : 'none',
    strategy: text.match(/Strategy:\s*(.*?)(?=Boost Value:|Drop Value:|Current Price:|$)/)?.[1]?.trim() || '',
    exchange: context.exchange || 'binance', market: context.market || 'FUTURES',
    eventTime: null, timeResolutionMs: 60000, displayedTime: text.match(/(\d{2}:\d{2})$/)?.[1] || null,
    observedAt, raw: text };
}
function parseApiMessage(row, observedAt) {
  const parsed = parseObservation(row.botId, row.message, observedAt,
    { exchange: row.exchange, market: String(row.marketType || '').toUpperCase() });
  return { ...parsed, id: row.id, identityKind: 'reference-message-id', symbol: row.symbol,
    eventTime: Number.isFinite(Date.parse(row.createdAt)) ? row.createdAt : null, timeResolutionMs: 1 };
}
function interval(event) {
  const value = event.eventTime;
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const start = typeof value === 'number' ? value : Date.parse(value);
  const resolution = event.timeResolutionMs ?? 0;
  if (!Number.isFinite(start) || !Number.isFinite(resolution) || resolution < 0 || resolution > 86400000) return null;
  return { start, end: start + Math.max(0, resolution - 1) };
}
function compareSignals(reference, local, options = {}) {
  const toleranceMs = options.toleranceMs ?? 1000;
  if (!Number.isFinite(toleranceMs) || toleranceMs < 0) throw new Error('Invalid time tolerance');
  const groups = new Map();
  const unscorableReference = [], unscorableLocal = [];
  const add = (events, side, unscorable) => {
    const offset = options[side + 'ClockOffsetMs'] ?? 0;
    const uncertainty = options[side + 'ClockUncertaintyMs'] ?? 0;
    if (!Number.isFinite(offset) || !Number.isFinite(uncertainty) || uncertainty < 0) throw new Error('Invalid clock correction');
    for (const event of events) {
      const time = interval(event);
      if (!time || !event.bot || !event.symbol || !event.exchange || !event.market ||
        !['up', 'down', 'none'].includes(event.direction)) { unscorable.push(event.id); continue; }
      const key = JSON.stringify([aliases[event.bot] || event.bot,
        String(event.symbol).toUpperCase().replace(/\.P$/, ''), event.direction,
        String(event.exchange).toLowerCase(), String(event.market).toUpperCase(), event.strategy || '']);
      if (!groups.has(key)) groups.set(key, { reference: [], local: [] });
      groups.get(key)[side].push({ event, start: time.start + offset - uncertainty,
        end: time.end + offset + uncertainty });
    }
  };
  add(reference, 'reference', unscorableReference);
  add(local, 'local', unscorableLocal);
  const matches = [], missing = [], extra = [];
  for (const group of groups.values()) {
    group.reference.sort((a, b) => a.start - b.start);
    group.local.sort((a, b) => a.start - b.start);
    let r = 0, l = 0;
    // Chronological, one-to-one pairing within each exact identity group.
    while (r < group.reference.length && l < group.local.length) {
      const ref = group.reference[r], own = group.local[l];
      if (own.end + toleranceMs < ref.start) { extra.push(own.event.id); l++; }
      else if (ref.end + toleranceMs < own.start) { missing.push(ref.event.id); r++; }
      else {
        matches.push({ referenceId: ref.event.id, localId: own.event.id,
          lagMinMs: own.start - ref.end, lagMaxMs: own.end - ref.start,
          bot: ref.event.bot, symbol: ref.event.symbol });
        r++; l++;
      }
    }
    missing.push(...group.reference.slice(r).map(e => e.event.id));
    extra.push(...group.local.slice(l).map(e => e.event.id));
  }
  const refCount = reference.length - unscorableReference.length;
  const localCount = local.length - unscorableLocal.length;
  return { matches, missing, extra, unscorableReference, unscorableLocal,
    recall: refCount ? matches.length / refCount : null,
    precision: refCount && localCount ? matches.length / localCount : null,
    toleranceMs, clockCorrection: {
      referenceOffsetMs: options.referenceClockOffsetMs ?? 0, localOffsetMs: options.localClockOffsetMs ?? 0,
      referenceUncertaintyMs: options.referenceClockUncertaintyMs ?? 0, localUncertaintyMs: options.localClockUncertaintyMs ?? 0 },
    coverageAssumption: 'Both inputs must cover the same market and time window. Feed completeness is not inferred.' };
}
module.exports = { compareSignals, parseObservation, parseApiMessage };
if (require.main === module) {
  const fs = require('node:fs');
  const [referencePath, localPath] = process.argv.slice(2);
  if (!referencePath) { console.error('Usage: node review/signal-parity.cjs reference.json [local-events.json]'); process.exitCode = 1; }
  else {
    const input = JSON.parse(fs.readFileSync(referencePath, 'utf8'));
    const events = Array.isArray(input) ? input : input.messages ? input.messages.map(row => parseApiMessage(row, input.observedAt)) :
      input.samples.flatMap(sample => sample.cards.map(raw => parseObservation(sample.bot, raw, sample.observedAt, input)));
    console.log(JSON.stringify(localPath ? compareSignals(events, JSON.parse(fs.readFileSync(localPath, 'utf8'))) :
      { referenceEvents: events.length, timedEvents: events.filter(e => interval(e)).length,
        bots: [...new Set(events.map(e => e.bot))], status: 'Observation data; not a parity result', events }, null, 2));
  }
}
