'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createArchive } = require('../web/signal-archive.cjs');

const clock = Date.UTC(2026, 10, 19);
const params = (extra = {}) => new URLSearchParams({ symbol: 'ARCUSDT', bot: 'div', days: '90', limit: '2', ...extra });
const bots = new Set(['div', 'm1']);
const rows = [
  ['2026-11-18T12:00:00.900999Z', 'b', 2],
  ['2026-11-18T12:00:00.900999Z', 'b', 1],
  ['2026-11-18T12:00:00.900999Z', 'a', 4],
  ['2026-11-18T12:00:00.900998Z', 'b', 3],
  ['2026-11-18T12:00:00.900001Z', 'a', 1],
].map(([exact_t, src_file, src_line]) => ({ exact_t, src_file, src_line, bot: 'div', symbol: 'ARCUSDT', dir: 'down', strategy: null, text: 'same text', price: 2 }));

test('exclusive tuple paging freezes window and preserves microseconds and same-time ties', async () => {
  let time = clock, queries = 0;
  const archive = createArchive({ bots, now: () => time, query: async (sql, args) => {
    queries++;
    assert.match(sql, /FROM signals\b/i);
    assert.match(sql, /symbol = \$1 AND \(\$2::text IS NULL OR bot = \$2\)/i);
    assert.match(sql, /t >= \$3.*t < \$4/i);
    assert.match(sql, /\(\$6::text IS NULL OR dir = \$6\)/i);
    assert.match(sql, /ORDER BY t DESC, src_file DESC, src_line DESC/i);
    assert.match(sql, /LIMIT \$5/i);
    assert.match(sql, /to_char\(t AT TIME ZONE 'UTC'.*US/i);
    assert.deepEqual(args.slice(0, 5), ['ARCUSDT', 'div', new Date(clock - 90 * 864e5).toISOString(), new Date(clock).toISOString(), 3]);
    let start = 0;
    assert.equal(args[5], null);
    if (args.length > 6) {
      assert.match(sql, /\(t, src_file, src_line\) < \(\$7::timestamptz, \$8, \$9\)/);
      start = rows.findIndex(r => r.exact_t === args[6] && r.src_file === args[7] && r.src_line === args[8]) + 1;
      assert.ok(start > 0);
    }
    return rows.slice(start, start + args[4]);
  } });
  const first = await archive(params());
  time += 60000;
  const second = await archive(params({ cursor: first.nextCursor }));
  const third = await archive(params({ cursor: second.nextCursor }));
  assert.equal(first.from, third.from); assert.equal(first.to, third.to);
  assert.equal(third.nextCursor, null);
  const items = [...first.items, ...second.items, ...third.items];
  assert.equal(items.length, 5); assert.equal(new Set(items.map(x => x.id)).size, 5);
  assert.deepEqual(Object.keys(items[0]).sort(), ['bot','dir','id','price','strategy','symbol','t','text']);
  assert.equal(items[0].t, Date.parse(rows[0].exact_t)); assert.equal(queries, 3);
  for (const changed of [{ bot: 'm1' }, { bot: 'all' }, { dir: 'down' }, { symbol: 'BTCUSDT' }, { days: 1 }]) {
    await assert.rejects(archive(params({ cursor: first.nextCursor, ...changed })), { status: 400 });
  }
  assert.equal(queries, 3);
  await assert.rejects(archive(params({ cursor: first.nextCursor + 'x' })), { status: 400 });
  assert.equal(queries, 3);
});

test('empty archive defaults to 90 days and 50 items without claiming coverage', async () => {
  const archive = createArchive({ bots, now: () => clock, query: async (_, args) => {
    assert.equal(args.length, 6); assert.equal(args[4], 51);
    return [];
  } });
  const p = new URLSearchParams({ symbol: 'BTCUSDC', bot: 'm1' });
  assert.deepEqual(await archive(p), { items: [], nextCursor: null, from: clock - 90 * 864e5, to: clock });
  p.append('bot', 'div');
  await assert.rejects(archive(p), { status: 400 });
});

test('invalid filters, numeric bounds and cursors fail before query; unavailable DB returns 503', async () => {
  let calls = 0;
  const archive = createArchive({ bots, now: () => clock, query: async () => { calls++; throw Error('private detail'); } });
  for (const invalid of [{ symbol: '' }, { symbol: 'ARC%USDT' }, { symbol: 'arcusdt' }, { bot: '' }, { bot: 'unknown' },
    { dir: '' }, { dir: 'all' }, { dir: 'UP' },
    { days: '' }, { days: 0 }, { days: 91 }, { days: 1.2 }, { limit: 0 }, { limit: 101 }, { limit: '1e1' },
    { cursor: '' }, { cursor: 'not-json' }, { cursor: 'a'.repeat(4097) }]) {
    await assert.rejects(archive(params(invalid)), { status: 400 });
  }
  const dup = params({ dir: 'up' }); dup.append('dir', 'up');
  await assert.rejects(archive(dup), { status: 400 });
  assert.equal(calls, 0);
  await assert.rejects(archive(params({ days: 1, limit: 100 })), e => e.status === 503 && !e.message.includes('private'));
  assert.equal(calls, 1);
});

test('coin-wide and selected-bot direction filters share the half-open window; cursors bind both filters', async () => {
  const data = [
    [clock, 'div', 'up'], [clock - 1, 'm1', 'up'], [clock - 2, 'div', 'down'],
    [clock - 864e5, 'div', 'up'], [clock - 864e5 - 1, 'm1', 'up'],
  ].map(([t, bot, dir], i) => ({ ...rows[0], exact_t: new Date(t).toISOString(), bot, dir, src_line: i + 1 }));
  let calls = 0;
  const archive = createArchive({ bots, now: () => clock, query: async (_, [sym, bot, from, to, count, dir, t]) => {
    calls++;
    return data.filter(r => r.symbol === sym && (!bot || r.bot === bot) && (!dir || r.dir === dir)
      && r.exact_t >= from && r.exact_t < to && (!t || r.exact_t < t)).slice(0, count);
  } });
  const p = params({ days: 1, limit: 1, dir: 'up' }); p.delete('bot');
  const first = await archive(p);
  assert.deepEqual(first.items.map(r => r.bot), ['m1']);
  p.set('cursor', first.nextCursor); p.set('bot', 'all');
  const last = await archive(p);
  assert.deepEqual(last.items.map(r => [r.bot, r.t]), [['div', first.from]]);
  assert.equal(last.nextCursor, null);
  p.delete('bot'); assert.deepEqual(await archive(p), last);
  p.set('bot', 'div'); await assert.rejects(archive(p), { status: 400 });
  p.delete('bot'); p.set('dir', 'down'); await assert.rejects(archive(p), { status: 400 });
  p.delete('dir'); await assert.rejects(archive(p), { status: 400 });
  assert.equal(calls, 3);
  p.delete('cursor'); p.set('dir', 'down'); p.set('bot', 'div');
  assert.deepEqual((await archive(p)).items.map(r => r.t), [clock - 2]);
});
