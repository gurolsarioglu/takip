'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const panelPath = join(__dirname, '../web/public/signal-panel.js');

// Model focus loss on detach/move and fixed row geometry without starting a browser or service.
class Node extends EventTarget {
  constructor(doc, tag) {
    super();
    Object.assign(this, { ownerDocument: doc, tag, children: [], attrs: new Map(),
      scrollTop: 0, hidden: false, disabled: false, parentNode: null, value: '' });
  }
  set innerHTML(_) { throw new Error('Signal content must not use innerHTML'); }
  get textContent() { return this.value + this.children.map(x => x.textContent).join(''); }
  set textContent(value) { this.replaceChildren(); this.value = String(value); }
  setAttribute(key, value) { this.attrs.set(key, String(value)); }
  getAttribute(key) { return this.attrs.get(key) ?? null; }
  removeAttribute(key) { this.attrs.delete(key); }
  get offsetTop() { return 30 * this.parentNode.children.indexOf(this); }
  get offsetHeight() { return 30; }
  contains(node) { return this === node || this.children.some(x => x.contains(node)); }
  append(...nodes) { for (const node of nodes) this.insertBefore(node, null); }
  replaceChildren(...nodes) { for (const node of [...this.children]) node.remove(); this.append(...nodes); }
  insertBefore(node, ref) {
    node.remove();
    this.children.splice(ref ? this.children.indexOf(ref) : this.children.length, 0, node);
    node.parentNode = this;
  }
  remove() {
    if (!this.parentNode) return;
    if (this.contains(this.ownerDocument.activeElement)) this.ownerDocument.activeElement = null;
    this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1);
    this.parentNode = null;
  }
  focus() { this.ownerDocument.activeElement = this; }
  click() { if (!this.disabled) this.dispatchEvent(new Event('click')); }
}

const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const bots = [{ id: 'm1', name: 'M1' }, { id: 'm1-premium', name: 'M1 Premium' }, { id: 'div', name: 'DIV' }];
const start = Date.UTC(2026, 10, 19, 12);
function signal(id, seq, t, fields = {}) {
  return { id, seq, t: start + t * 1000, symbol: `COIN${id}USDT`, dir: 'up', text: `original ${id}`, ...fields };
}
const snapshot = (items, maxSeq, extra = {}) => ({ items, maxSeq, epoch: 'boot 1/+?', state: 'fresh', lastPollOkAt: start, ...extra });
const delta = (items, nextAfter, extra = {}) => ({ ...snapshot(items, nextAfter), nextAfter, hasMore: false, reset: false, ...extra });

function setup(route, options = {}) {
  const win = new EventTarget();
  win.navigator = { onLine: options.online ?? true };
  const doc = Object.assign(new EventTarget(), { hidden: options.hidden ?? false, defaultView: win, activeElement: null });
  doc.createElement = tag => new Node(doc, tag);
  const root = doc.createElement('section');
  const calls = [], selected = [];
  const clock = new Map(); let now = 0, nextTimer = 0;
  Object.assign(win, { AbortController, URLSearchParams,
    setTimeout(fn, delay) { clock.set(++nextTimer, { fn, at: now + delay }); return nextTimer; },
    clearTimeout(id) { clock.delete(id); }
  });
  const exports = vm.createContext({ window: win, Intl, Date });
  vm.runInContext(readFileSync(panelPath, 'utf8'), exports, { filename: panelPath });
  assert.equal(clock.size, 0, 'loading the classic script does not schedule work');
  const api = (url, init) => {
    const req = new URL(url, 'http://offline.test');
    const call = { path: req.pathname, params: Object.fromEntries(req.searchParams), signal: init?.signal };
    calls.push(call);
    return route(call);
  };
  const panel = win.TerminalSignalPanel.mount({ root, api, getSymbol: () => 'ARCUSDT', onSelectSymbol: sym => selected.push(sym) });
  assert.equal(typeof panel.setSymbol, 'function', 'mount returns synchronously');
  function all(className, rootNode = root) {
    return [rootNode, ...rootNode.children.flatMap(x => all(className, x))].filter(x => x.className?.split(' ').includes(className));
  }
  return { calls, selected, panel, doc, root, all, one: name => all(name)[0],
    rows: () => all('sp-symbol').map(n => n.textContent),
    async tick() {
      const entry = [...clock].sort((a, b) => a[1].at - b[1].at)[0];
      assert.ok(entry, 'expected scheduled work');
      const [id, timer] = entry;
      clock.delete(id); now = timer.at; timer.fn(); await flush();
    },
    async hidden(value) { doc.hidden = value; doc.dispatchEvent(new Event('visibilitychange')); await flush(); },
    async online(value) { win.navigator.onLine = value; win.dispatchEvent(new Event(value ? 'online' : 'offline')); await flush(); },
    timers: () => clock.size
  };
}

test('classic script loads even without a DOM or timers', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(panelPath, 'utf8'), sandbox);
  assert.equal(typeof sandbox.window.TerminalSignalPanel.mount, 'function');
});

test('mount preserves bot order, opens Premium, and separates chart selection from literal message detail', async () => {
  const message = '<img src=x onerror=alert(1)>\noriginal body';
  const app = setup(({ path }) => path === '/api/bots' ? bots : snapshot([
    signal(1, 1, 0, { dir: null }), signal(2, 3, 2, { dir: 'down', text: message }), signal(3, 2, 1),
    signal(4, 4, 3, { bot: 'm1' })
  ], 4));
  await flush();
  const headers = app.all('sp-bot');
  assert.deepEqual(headers.map(x => x.textContent), ['M1', 'M1 Premium', 'DIV']);
  assert.deepEqual(headers.map(x => x.getAttribute('aria-expanded')), ['false', 'true', 'false']);
  assert.equal(headers[1].parentNode.children[1], app.one('sp-body'));
  assert.deepEqual(app.calls[1].params, { bot: 'm1-premium', limit: '50' });
  assert.deepEqual(app.rows(), ['COIN2USDT', 'COIN3USDT', 'COIN1USDT']);
  assert.deepEqual(app.all('sp-dir').map(n => n.textContent), ['Aşağı', 'Yukarı', 'Yönsüz']);
  // V1.17.1: mesaj satırda doğrudan; yalnız <b>/<i>/<code> gibi Telegram etiketleri öğe olur, gerisi düz metin
  const text = app.one('sp-text');
  assert.equal(text.textContent, message);
  const tags = n => [n.tag, ...n.children.flatMap(tags)];
  assert.ok(!tags(text).includes('img'), 'mesajdaki <img> öğe olmaz');
  assert.equal(app.all('sp-detail-trigger').length, 0);
  assert.deepEqual(app.selected, []);
  app.one('sp-signal').click();
  assert.deepEqual(app.selected, ['COIN2USDT']);
  app.panel.setSymbol('COIN2USDT');
  assert.equal(app.calls.length, 2, 'chart changes do not refilter live rows');
});

test('delta sequence advances without skipping pages; rows stay keyed, focused and scroll-anchored', async () => {
  const responses = [snapshot([signal(1, 8, 8), signal(2, 7, 7), signal(3, 5, 5)], 8),
    delta([signal(4, 11, 11)], 11, { hasMore: true, maxSeq: 80 }),
    delta([signal(3, 12, 12)], 12, { hasMore: true }),
    delta([signal(5, 13, 10)], 13, { hasMore: true }),
    delta([signal(6, 14, 9)], 80)];
  const app = setup(({ path }) => path === '/api/bots' ? bots : responses.shift());
  await flush();
  const rows = app.one('sp-list');
  const focused = app.all('sp-signal')[2];
  focused.focus(); rows.scrollTop = 33;
  await app.tick();
  assert.deepEqual(app.calls.slice(2).map(x => [x.params.mode, x.params.after, x.params.epoch]),
    ['8', '11', '12'].map(after => ['delta', after, 'boot 1/+?']));
  assert.deepEqual(app.rows(), ['COIN3USDT', 'COIN4USDT', 'COIN5USDT', 'COIN1USDT', 'COIN2USDT']);
  assert.equal(app.one('sp-signal'), focused);
  assert.equal(app.doc.activeElement, focused);
  assert.equal(rows.scrollTop, 123, 'same row and offset remain at top of viewport');
  await app.tick();
  assert.equal(app.calls.at(-1).params.after, '13');
  assert.equal(app.selected.length, 0);
});

test('reset replaces the snapshot even when a restarted server reuses an ID', async () => {
  const replies = [snapshot([signal(1, 80, 8)], 80),
    delta([], 0, { reset: true, epoch: 'second' }),
    snapshot([signal(1, 1, 20, { symbol: 'NEWUSDT' })], 1, { epoch: 'second' }),
    delta([], 1, { epoch: 'second' })];
  const app = setup(({ path }) => path === '/api/bots' ? bots : replies.shift());
  await flush();
  const old = app.one('sp-signal');
  await app.tick();
  assert.deepEqual(app.calls.slice(2).map(x => x.params.mode), ['delta', undefined]);
  assert.deepEqual(app.rows(), ['NEWUSDT']);
  assert.notEqual(app.one('sp-signal'), old);
  await app.tick();
  assert.equal(app.calls.at(-1).params.epoch, 'second');
  assert.equal(app.calls.at(-1).params.after, '1');
});

test('same-epoch eviction reset preserves surviving row identity, scroll and focus', async () => {
  const replies = [snapshot([signal(1, 3, 3), signal(2, 2, 2), signal(3, 1, 1)], 3),
    delta([], 4, { reset: true }), snapshot([signal(1, 3, 3), signal(2, 2, 2)], 4)];
  const app = setup(({ path }) => path === '/api/bots' ? bots : replies.shift());
  await flush();
  const keep = app.all('sp-signal')[1], list = app.one('sp-list');
  keep.focus(); list.scrollTop = 32;
  await app.tick();
  assert.deepEqual(app.rows(), ['COIN1USDT', 'COIN2USDT']);
  assert.ok(app.all('sp-signal')[1] === keep, 'the surviving row was not replaced');
  assert.ok(app.doc.activeElement === keep, 'focus remains on the surviving row');
  assert.equal(list.scrollTop, 32);
});

test('legacy snapshots stay bounded and explicitly report unverified health and empty results', async () => {
  let reply = { maxSeq: 75, items: Array.from({ length: 75 }, (_, id) => signal(id, id, id)) };
  const app = setup(({ path }) => path === '/api/bots' ? [bots[2], bots[0]] : reply);
  await flush();
  assert.equal(app.calls[1].params.bot, 'div');
  assert.equal(app.rows().length, 50);
  assert.equal(app.rows()[0], 'COIN74USDT');
  assert.match(app.one('sp-status').textContent, /doğrulanmadı/i);
  reply = { maxSeq: 75, items: [] };
  await app.tick();
  assert.equal(app.calls.at(-1).params.mode, undefined);
  assert.match(app.one('sp-status').textContent, /sinyal yok/i);
  assert.deepEqual(app.rows(), []);
});

test('a legacy-shaped delta falls back to snapshots without clearing matching rows', async () => {
  const legacy = { maxSeq: 2, items: [signal(1, 1, 1)] };
  const replies = [snapshot(legacy.items, 1), legacy, legacy, legacy];
  const app = setup(({ path }) => path === '/api/bots' ? bots : replies.shift());
  await flush();
  const keep = app.one('sp-signal');
  await app.tick();
  await app.tick();
  assert.deepEqual(app.calls.slice(1).map(x => x.params.mode), [undefined, 'delta', undefined, undefined]);
  assert.equal(app.one('sp-signal'), keep);
});

test('warming, stale and request failure are distinct; existing rows survive errors', async () => {
  let reply = snapshot([], 0, { state: 'warming', lastPollOkAt: null });
  const app = setup(({ path }) => {
    if (path === '/api/bots') return bots;
    if (!reply) throw new Error('unavailable');
    return reply;
  });
  await flush();
  assert.match(app.one('sp-status').textContent, /hazırlanıyor/i);
  reply = delta([signal(1, 1, 1)], 1, { state: 'stale' });
  await app.tick();
  assert.match(app.one('sp-status').textContent, /gecikiyor/i);
  assert.match(app.one('sp-status').textContent, /Son başarılı/i);
  reply = null;
  await app.tick();
  assert.match(app.one('sp-status').textContent, /alınamadı/i);
  assert.deepEqual(app.rows(), ['COIN1USDT']);
});

test('bot changes invalidate outstanding responses, and hidden/offline tabs do not poll', async () => {
  const pending = deferred();
  const app = setup(({ path, params }) => path === '/api/bots' ? bots :
    params.bot === 'm1-premium' ? pending.promise : params.mode === 'delta' ? delta([], 2) : snapshot([signal(2, 2, 2)], 2),
  { hidden: true });
  await flush();
  assert.equal(app.calls.length, 0);
  await app.hidden(false);
  const old = app.calls.at(-1);
  app.all('sp-bot')[0].click();
  assert.equal(old.signal.aborted, true);
  await app.online(false);
  pending.resolve(snapshot([signal(1, 50, 1)], 50));
  await flush();
  assert.equal(app.calls.length, 2);
  assert.deepEqual(app.rows(), []);
  assert.equal(app.timers(), 0);
  assert.match(app.one('sp-status').textContent, /çevrimdışı/i);
  await app.online(true);
  assert.equal(app.calls.at(-1).params.bot, 'm1');
  assert.deepEqual(app.rows(), ['COIN2USDT']);
  await app.hidden(true);
  assert.equal(app.timers(), 0);
  await app.hidden(false);
  assert.equal(app.calls.at(-1).params.after, '2');
});

test('request deadline aborts a stalled live poll and allows a later retry', async () => {
  let stall = true;
  const app = setup(({ path, signal: requestSignal }) => {
    if (path === '/api/bots') return bots;
    if (!stall) return snapshot([signal(1, 1, 1)], 1);
    return new Promise((_, reject) => requestSignal.addEventListener('abort', () => reject(Error('aborted')), { once: true }));
  });
  await flush();
  const stalled = app.calls.at(-1);
  await app.tick();
  assert.equal(stalled.signal.aborted, true);
  assert.match(app.one('sp-status').textContent, /alınamadı/i);
  stall = false;
  await app.tick();
  assert.deepEqual(app.rows(), ['COIN1USDT']);
});

test('archive uses only chart coin and selected bot, pages via opaque cursor and discards old-symbol replies', async () => {
  const pending = deferred();
  const item = (id, t, symbol = 'ARCUSDT') => ({ ...signal(id, undefined, t, { symbol }), bot: 'm1-premium', price: 2, strategy: '#S' });
  const page = (items, nextCursor = null) => ({ items, nextCursor, from: '2026-08-21', to: '2026-11-19' });
  const app = setup(({ path, params }) => {
    if (path === '/api/bots') return bots;
    if (path === '/api/messages') return snapshot([], 0);
    if (params.symbol === 'ETHUSDT') return page([item('new', 1, 'ETHUSDT')]);
    if (params.cursor === 'stale/+?') return pending.promise;
    return params.cursor ? page([item('b', 4), item('c', 1)], 'stale/+?') : page([item('a', 3), item('b', 4)], 'page/+?');
  });
  await flush();
  app.one('sp-archive').click(); await flush();
  assert.equal(app.calls.at(-1).path, '/api/t/signal-archive');
  assert.deepEqual(app.calls.at(-1).params, { symbol: 'ARCUSDT', bot: 'm1-premium', days: '90', limit: '50' });
  assert.match(app.one('sp-status').textContent, /90 gün.*kapsam/i);
  app.one('sp-more').click(); await flush();
  assert.equal(app.calls.at(-1).params.cursor, 'page/+?');
  const times = app.all('sp-time').map(n => n.dateTime);
  assert.deepEqual(times, [...times].sort().reverse());
  assert.equal(app.rows().length, 3, 'overlap is deduplicated');
  app.one('sp-more').click(); await flush();
  const old = app.calls.at(-1);
  app.panel.setSymbol('ethusdt');
  assert.equal(old.signal.aborted, true);
  pending.resolve(page([item('stale', 12)])); await flush();
  assert.deepEqual(app.calls.at(-1).params, { symbol: 'ETHUSDT', bot: 'm1-premium', days: '90', limit: '50' });
  assert.deepEqual(app.rows(), ['ETHUSDT']);
  assert.equal(app.one('sp-more').hidden, true);
  assert.equal(app.timers(), 0, 'archive does not poll');
  assert.deepEqual(app.selected, []);
  app.one('sp-live').click(); await flush();
  assert.equal(app.calls.at(-1).path, '/api/messages');
});

test('archive retries the same failed cursor and stops at its display cap', async () => {
  let failed = false;
  const app = setup(({ path, params }) => {
    if (path === '/api/bots') return bots;
    if (path === '/api/messages') return snapshot([], 0);
    const page = Number(params.cursor || 0);
    if (page === 1 && !failed) { failed = true; throw new Error('unavailable'); }
    return {
      items: Array.from({ length: 50 }, (_, i) => signal(`${page}-${i}`, undefined, 500 - page * 50 - i, {
        bot: 'm1-premium', symbol: 'ARCUSDT'
      })),
      nextCursor: String(page + 1), from: start, to: start + 500000
    };
  });
  await flush();
  app.one('sp-archive').click(); await flush();
  const more = app.one('sp-more');
  more.click(); await flush();
  assert.match(app.one('sp-status').textContent, /arşiv alınamadı/i);
  assert.equal(app.rows().length, 50);
  assert.equal(more.textContent, 'Yeniden dene');
  for (const cursor of ['1', '2', '3']) {
    more.click(); await flush();
    assert.equal(app.calls.at(-1).params.cursor, cursor);
  }
  assert.equal(app.rows().length, 200);
  assert.equal(more.hidden, true);
  assert.match(app.one('sp-status').textContent, /200 kayıt/);
  assert.equal(app.timers(), 0);
});
