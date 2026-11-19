'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createFeed } = require('../web/signal-feed.cjs');

function setup(options = {}) {
  let time = Date.UTC(2026, 10, 19);
  const bots = [{ id: 'div', gap: 10 }, { id: 'm1', gap: 10 }];
  const feed = createFeed({ bots, now: () => time, staleMs: 100, ...options });
  const read = (params = '') => feed.messages(new URLSearchParams(params));
  const delta = (after, extra = '') => read('bot=div&mode=delta&after=' + after + '&epoch=' + read().epoch + extra);
  const add = (symbol, offset = 0, bot = 'div') => feed.ingest({ symbol, t: time + offset, bot, dir: 'up', text: symbol, price: 3 }, time);
  return { feed, read, delta, add, tick: n => time += n };
}

test('only a full successful poll updates health; empty is fresh, stalled or failed is not', async () => {
  const { feed, read, tick } = setup();
  assert.equal(read().state, 'warming');
  assert.equal(read().lastPollOkAt, null);
  const files = [];
  await feed.poll(async (_, [file, pos]) => { files.push([file, pos]); return []; });
  assert.equal(files.length, 3);
  assert.equal(read().state, 'fresh');
  const good = read().lastPollOkAt;
  assert.equal(good, Date.UTC(2026, 10, 19));
  assert.deepEqual(read().items, []);
  tick(101);
  assert.equal(read().state, 'stale');
  await assert.rejects(feed.poll(async (_, [file]) => { if (file === files[2][0]) throw Error('offline'); return []; }));
  assert.equal(read().lastPollOkAt, good);
  await feed.poll(async () => []);
  assert.equal(read().lastPollOkAt, good + 101);
  assert.equal(read().state, 'fresh');
  const cold = setup();
  cold.tick(101);
  assert.equal(cold.read().state, 'stale');
});

test('legacy time order and grouped IDs survive; delta drains by seq without skipping a capped page', () => {
  const { add, read, delta } = setup();
  add('ARCUSDT'); const id = read().items[0].id;
  add('BUSDT', -10); add('CUSDT', -20); add('ARCUSDT', 1); add('DUSDT', -30); add('OTHER', 0, 'm1');
  assert.deepEqual(read('bot=div&limit=2').items.map(x => x.symbol), ['ARCUSDT', 'BUSDT']);
  const legacy = read('q=arc&sym=arcusdt&dir=up&after=1').items;
  assert.equal(legacy[0].id, id); assert.equal(legacy[0].n, 2);
  const one = delta(0, '&limit=2');
  assert.deepEqual(one.items.map(x => x.seq), [2, 3]);
  assert.equal(one.hasMore, true); assert.equal(one.nextAfter, 3); assert.equal(one.reset, false);
  const two = delta(one.nextAfter, '&limit=2');
  assert.deepEqual(two.items.map(x => x.seq), [4, 5]);
  assert.equal(two.hasMore, false); assert.equal(two.nextAfter, read().maxSeq);
  assert.deepEqual(delta(two.nextAfter).items, []);
});

test('restart, future/invalid cursor, cap and time evictions force a new snapshot', () => {
  const { add, read, delta, feed, tick } = setup({ cap: 2, keepMs: 100 });
  add('A'); add('B');
  const snapshot = read();
  add('C');
  assert.equal(delta(snapshot.maxSeq).reset, true);
  assert.deepEqual(delta(snapshot.maxSeq).items, []);
  assert.deepEqual(read().items.map(x => x.symbol), ['C', 'B']);
  add('A', 1);
  assert.equal(read('sym=A').items[0].n, 1);
  const before = read().maxSeq;
  tick(102); feed.prune();
  assert.equal(delta(before).reset, true);
  assert.equal(delta(read().maxSeq).reset, false);
  assert.deepEqual(read().items, []);
  assert.equal(read('mode=delta&epoch=' + setup().read().epoch + '&after=0').reset, true);
  for (const after of [-1, 'no', 1.5, 99999]) assert.equal(delta(after).reset, true);
  assert.equal(read('mode=delta&after=0').reset, true);
  assert.equal(read('bot=m1&mode=delta&after=0&epoch=' + snapshot.epoch).reset, false);
});

test('capacity trim keeps the refreshed first card and breaks timestamp ties by latest seq', () => {
  const { add, read, delta } = setup({ cap: 5 });
  add('A', 0);
  const id = read().items[0].id;
  add('B', 4); add('C', 4); add('D', 3); add('E', 6); add('F', 7);
  add('A', 9);
  add('B', 4); // B and C tie on time, but B now has the newer sequence.
  const before = read().maxSeq;
  add('G', 10); // Seven cards trigger a batch of two evictions.
  assert.equal(delta(before).reset, true);
  assert.deepEqual(read().items.map(m => m.symbol), ['G', 'A', 'F', 'E', 'B']);
  const fresh = read('sym=A').items[0];
  assert.equal(fresh.id, id); assert.equal(fresh.n, 2);
  add('A', 10);
  assert.deepEqual(read('sym=A').items.map(m => [m.id, m.n]), [[id, 3]]);
});

test('busy ticks do not multiply DB reads; success advances per-file positions', async () => {
  const { feed, read } = setup();
  let release, reads = 0;
  const waiting = new Promise(done => { release = done; });
  const active = feed.poll(async (_, [file, pos]) => {
    reads++; assert.equal(pos, 0);
    await waiting;
    return [{ src_line: 7, bot: 'div', symbol: file, t: Date.UTC(2026, 10, 19) }];
  });
  await feed.poll(() => assert.fail('overlapping poll'));
  assert.equal(reads, 1);
  release(); await active;
  assert.equal(reads, 3); assert.equal(read().items.length, 3);
  await feed.poll(async (_, [, pos]) => { assert.equal(pos, 7); reads++; return []; });
  assert.equal(reads, 6); assert.equal(read().items.length, 3);
});

test('delta hard limit and batched capacity eviction preserve progress under load', () => {
  const { add, delta, read } = setup({ cap: 500 });
  for (let i = 0; i < 600; i++) add('S' + i);
  const one = delta(0, '&limit=10000');
  assert.equal(one.reset, false); assert.equal(one.items.length, 500); assert.equal(one.hasMore, true);
  const two = delta(one.nextAfter, '&limit=10000');
  assert.equal(two.items.length, 100); assert.equal(two.hasMore, false);
  add('NEXT');
  assert.equal(delta(two.nextAfter).reset, true);
  const snapshot = read().maxSeq;
  add('NEXT2');
  assert.equal(delta(snapshot).reset, false);
});

test('HTTP dispatch keeps bot order, legacy coin messages and terminal fallthrough without listening', async () => {
  const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
  const dir = path.resolve(__dirname, '../web');
  let handler;
  const mocks = {
    'node:http': { createServer(fn) { handler = fn; return { listen() {} }; } },
    'node:fs': { readFileSync(file) { assert.equal(path.basename(file), 'VERSION'); return 'test'; } },
    'node:path': path, './signal-feed.cjs': require('../web/signal-feed.cjs'),
    './signal-archive.cjs': require('../web/signal-archive.cjs'), './terminal.cjs': require('../web/terminal.cjs'),
  };
  vm.runInNewContext(fs.readFileSync(path.join(dir, 'server.cjs'), 'utf8'), {
    require(name) { if (name === 'pg') throw Error('offline'); assert.ok(Object.hasOwn(mocks, name)); return mocks[name]; },
    __dirname: dir, URL, process: { env: {} }, console: { log() {} }, setInterval() {},
  });
  const call = (url, method = 'GET') => new Promise(resolve => {
    let code;
    handler({ url, method }, { writeHead(n) { code = n; }, end(body) { resolve({ code, body: JSON.parse(body) }); } });
  });
  const bots = await call('/api/bots');
  assert.deepEqual(bots.body.map(x => x.id), ['m1', 'm1-premium', '4s', '4sniper', '1dws', 'div', 'fr', 'v3', 'hammer']);
  const msg = await call('/api/messages?bot=all&sym=ARCUSDT&limit=500');
  assert.equal(msg.code, 200); assert.deepEqual(msg.body.items, []); assert.equal(msg.body.maxSeq, 0);
  assert.equal(msg.body.state, 'warming');
  assert.equal((await call('/api/t/klines?symbol=!')).code, 400);
  assert.equal((await call('/api/t/signal-archive')).code, 400);
  assert.equal((await call('/api/t/signal-archive', 'POST')).code, 405);
  assert.equal((await call('/api/t/signal-archive?symbol=ARCUSDT&bot=div')).code, 503);
});
