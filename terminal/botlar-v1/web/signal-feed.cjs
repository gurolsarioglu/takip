'use strict';
const { randomUUID } = require('node:crypto');

const DAY = 864e5;
const day = t => new Date(t).toISOString().slice(0, 10);
const pollSql = 'SELECT src_line, bot, symbol, dir, strategy, text, price, extract(epoch FROM t) * 1000 AS t FROM signals WHERE src_file = $1 AND src_line > $2 ORDER BY src_line LIMIT 20000';

function createFeed({ bots, now = Date.now, keepMs = 2 * DAY, cap = 5000, staleMs = 15000 }) {
  const epoch = randomUUID(), started = now(), positions = new Map();
  const buckets = new Map(bots.map(b => [b.id, { gap: b.gap, cards: new Map(), open: new Map(), resetAt: 0 }]));
  let seq = 0, nextId = 1, lastPollOkAt = null, busy = false;
  const key = m => JSON.stringify([m.symbol, m.dir || null, m.strategy || null]);

  function evict(b, card) {
    b.cards.delete(card.id);
    const k = key(card);
    if (b.open.get(k) === card) b.open.delete(k);
    // Even a caught-up client must replace its snapshot: deltas have no tombstones.
    b.resetAt = ++seq;
  }
  function ingest(row, at) {
    const b = buckets.get(row.bot), t = Math.round(Number(row.t));
    if (!b || !Number.isFinite(t) || at - t > keepMs) return;
    const k = key(row), prev = b.open.get(k);
    if (prev && t >= prev.t && t - prev.t <= b.gap) {
      Object.assign(prev, { t, n: prev.n + 1, text: row.text || prev.text, price: row.price, seq: ++seq });
      return;
    }
    const card = { bot: row.bot, id: nextId++, seq: ++seq, t, first: t, n: 1,
      symbol: row.symbol, dir: row.dir || null, strategy: row.strategy || null, text: row.text || '', price: row.price };
    b.cards.set(card.id, card); b.open.set(k, card);
    if (b.cards.size > cap * 1.2) {
      const oldestFirst = [...b.cards.values()].sort((a, b) => a.t - b.t || a.seq - b.seq);
      for (const oldest of oldestFirst) {
        evict(b, oldest);
        if (b.cards.size <= cap) break;
      }
    }
  }
  function prune() {
    const cutoff = now() - keepMs;
    for (const b of buckets.values()) for (const m of b.cards.values()) if (m.t < cutoff) evict(b, m);
  }
  async function poll(query) {
    if (busy) return;
    busy = true;
    try {
      const at = now();
      const files = [2, 1, 0].map(n => 'signals-' + day(at - n * DAY) + '.jsonl');
      for (const f of files) {
        let pos = positions.get(f) || 0;
        for (;;) {
          const rows = await query(pollSql, [f, pos]);
          if (!rows.length) break;
          for (const row of rows) ingest(row, at);
          pos = rows[rows.length - 1].src_line;
          positions.set(f, pos);
          if (rows.length < 20000) break;
        }
      }
      for (const f of positions.keys()) if (!files.includes(f)) positions.delete(f);
      lastPollOkAt = now();
    } finally { busy = false; }
  }
  function summary() {
    const at = now();
    return bots.map(({ gap, ...bot }) => {
      let n24 = 0, n1 = 0, last = null;
      for (const m of buckets.get(bot.id).cards.values()) {
        if (at - m.first < DAY) n24++;
        if (at - m.first < 3600e3) n1++;
        if (last === null || last < m.t) last = m.t;
      }
      return { ...bot, n24, n1, last };
    });
  }
  function messages(p) {
    const bot = p.get('bot') || 'all', sym = (p.get('sym') || '').toUpperCase().trim();
    const q = (p.get('q') || '').toUpperCase().trim(), dir = p.get('dir');
    const delta = p.get('mode') === 'delta', raw = p.get('after'), after = Number(raw);
    const limit = Math.min(500, Math.max(delta ? 1 : 0, Math.trunc(Number(p.get('limit') || 200)) || (delta ? 50 : 0)));
    const state = now() - (lastPollOkAt ?? started) > staleMs ? 'stale' : lastPollOkAt === null ? 'warming' : 'fresh';
    const meta = { epoch, state, lastPollOkAt, maxSeq: seq };
    const selected = bot === 'all' ? [...buckets.values()] : buckets.has(bot) ? [buckets.get(bot)] : [];
    if (delta && (p.get('epoch') !== epoch || !/^\d+$/.test(raw) || !Number.isSafeInteger(after) ||
      after > seq || selected.some(b => after < b.resetAt))) {
      return { ...meta, items: [], reset: true, nextAfter: seq, hasMore: false };
    }
    const list = [];
    for (const b of selected) for (const m of b.cards.values()) {
      if ((after && m.seq <= after) || (sym && m.symbol !== sym) || (q && !m.symbol?.includes(q)) || (dir && m.dir !== dir)) continue;
      list.push(m);
    }
    list.sort(delta ? (a, b) => a.seq - b.seq : (a, b) => b.t - a.t || b.seq - a.seq);
    const items = list.slice(0, limit);
    if (!delta) return { ...meta, items };
    const hasMore = list.length > limit;
    return { ...meta, items, reset: false, hasMore, nextAfter: hasMore ? items[items.length - 1].seq : seq };
  }
  return { poll, ingest, prune, summary, messages };
}
module.exports = { createFeed };
