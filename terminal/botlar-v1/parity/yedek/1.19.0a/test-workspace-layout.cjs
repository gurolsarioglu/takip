'use strict';

const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const dir = join(__dirname, '../web/public');
const html = readFileSync(join(dir, 'terminal.html'), 'utf8');

test('terminal places the coin card, then the signal root after the watchlist and loads workspace assets', () => {
  // V1.19.0: izleme listesi → coin kartı → bot sinyalleri
  assert.match(html, /<aside\b[^>]*>\s*<section\b[^>]*id="watchlist"[\s\S]*?<div class="wl" id="wl"[^>]*><\/div>\s*<\/section>\s*<details\b[^>]*id="coin-card"[\s\S]*?<\/details>\s*<section\b[^>]*id="signal-panel"/);
  assert.equal([...html.matchAll(/data-split="[0-2]"/g)].length, 3);
  assert.match(html, /data-split="sidebar"/);
  assert.match(html, /href="\/workspace\.css"/);
  assert.match(html, /src="\/workspace\.js"/);
  assert.match(html, /src="\/signal-panel\.js"/);
  assert.match(html, /href="\/signal-panel\.css"/);
  assert.match(html, /href="\/"/);
  assert.match(html, /URLSearchParams\(location\.search\)\.get\('s'\)/);
  assert.match(html, /buildPanes\(\);[\s\S]*?mountSignals\(\);[\s\S]*?if \(first\) select\(first\)/);
});

function element() {
  const attrs = {}, handlers = {}, captures = new Set();
  return {
    attrs, captures, classList: { contains: () => false, toggle() {} },
    setAttribute(k, v) { attrs[k] = String(v); },
    addEventListener(k, fn) { handlers[k] = fn; },
    setPointerCapture(id) { captures.add(id); },
    hasPointerCapture(id) { return captures.has(id); },
    releasePointerCapture(id) { captures.delete(id); },
    dispatch(type, props = {}) {
      const e = { type, pointerId: 1, isPrimary: true, button: 0, clientX: 0, ...props,
        preventDefault() { this.defaultPrevented = true; } };
      handlers[type](e);
      return e;
    }
  };
}

function layout(saved) {
  const file = join(dir, 'workspace.js');
  assert.ok(existsSync(file), 'workspace controller is installed');
  const context = vm.createContext({});
  vm.runInContext(readFileSync(file, 'utf8'), context); // No document or window exists before mount.
  const handles = ['0', '1', '2', 'sidebar'].map(split => Object.assign(element(), { dataset: { split } }));
  const frames = new Map(), writes = [], css = new Map(), media = { matches: true };
  const dimensions = { '--chart-min': '150px', '--chart-gap': '10px', '--sidebar-min': '280px',
    '--sidebar-max': '480px', '--sidebar-default': '324px', '--sidebar-gap': '12px' };
  let frame = 0, observe;
  const view = {
    matchMedia: () => media,
    getComputedStyle: () => ({ getPropertyValue: k => dimensions[k] }),
    requestAnimationFrame(fn) { frames.set(++frame, fn); return frame; },
    cancelAnimationFrame: id => frames.delete(id),
    ResizeObserver: class { constructor(fn) { observe = fn; } observe() {} }
  };
  const root = Object.assign(element(), {
    clientWidth: 1300, style: { setProperty: (k, v) => css.set(k, v) },
    querySelectorAll: () => handles, ownerDocument: { defaultView: view }
  });
  const grid = element();
  const store = { get: (_, fallback) => saved ?? fallback, set: (k, v) => writes.push([k, JSON.parse(JSON.stringify(v))]) };
  context.TerminalWorkspace.mount({ root, grid, store });
  return { handles, frames, writes, css, root, grid, media,
    resize(width) { root.clientWidth = width; observe(); },
    flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); },
    shares: () => [1, 2, 3, 4].map(i => Number(css.get('--chart-' + i))) };
}

test('pointer drag captures, coalesces, clamps neighboring charts, then persists', () => {
  const w = layout();
  const h = w.handles[1];
  assert.deepEqual(w.shares(), [.25, .25, .25, .25]);
  h.dispatch('pointerdown', { clientX: 500 });
  assert.equal(h.hasPointerCapture(1), true);
  h.dispatch('pointermove', { clientX: 501 });
  h.dispatch('pointermove', { clientX: 2000 });
  assert.equal(w.frames.size, 1);
  assert.deepEqual(w.shares(), [.25, .25, .25, .25]);
  w.flush();
  assert.deepEqual(w.shares(), [.25, .5, 0, .25]);
  assert.equal(h.attrs['aria-valuenow'], h.attrs['aria-valuemax']);
  assert.equal(w.writes.length, 0);
  h.dispatch('pointerup', { clientX: 2000 });
  assert.equal(h.hasPointerCapture(1), false);
  assert.deepEqual(w.writes, [['workspace', { shares: [.25, .5, 0, .25], sidebar: 324 }]]);
  h.dispatch('dblclick');
  assert.deepEqual(w.shares(), [.25, .25, .25, .25]);
});

test('sidebar keyboard sizing uses a larger Shift step and keeps space for four charts', () => {
  const w = layout({ shares: [0, 1, 0, 0], sidebar: 410 });
  const side = w.handles[3];
  assert.equal(w.css.get('--sidebar-width'), '410px');
  assert.ok(side.dispatch('keydown', { key: 'ArrowLeft', shiftKey: true }).defaultPrevented);
  const larger = Number(side.attrs['aria-valuenow']);
  side.dispatch('keydown', { key: 'ArrowRight' });
  assert.ok(larger > Number(side.attrs['aria-valuenow']) && Number(side.attrs['aria-valuenow']) > 410);
  w.resize(1045);
  assert.equal(w.css.get('--sidebar-width'), '403px');
  w.resize(1300);
  assert.equal(Number(side.attrs['aria-valuenow']), w.writes.at(-1)[1].sidebar);
  side.dispatch('dblclick');
  assert.equal(w.css.get('--sidebar-width'), '324px');
  assert.deepEqual(w.shares(), [0, 1, 0, 0]);
});

test('cancellation restores sizing without persisting, and hidden splitters do not resize', () => {
  const w = layout({ shares: [1, null, 2, 0], sidebar: 'bad' });
  const h = w.handles[0];
  h.dispatch('pointerdown', { clientX: 250 });
  h.dispatch('pointermove', { clientX: 270 });
  w.flush();
  assert.notDeepEqual(w.shares(), [.25, .25, .25, .25]);
  h.dispatch('pointercancel');
  assert.deepEqual(w.shares(), [.25, .25, .25, .25]);
  assert.equal(h.hasPointerCapture(1), false);
  w.grid.classList.contains = () => true;
  h.dispatch('keydown', { key: 'ArrowLeft' });
  assert.equal(w.writes.length, 0);
  w.grid.classList.contains = () => false;
  w.media.matches = false;
  w.handles[3].dispatch('pointerdown');
  assert.equal(w.handles[3].hasPointerCapture(1), false);
  assert.equal(w.writes.length, 0);
});

test('signal mount uses terminal API and selection, while unchanged symbols do not notify', () => {
  const start = html.indexOf('let signalPanel =');
  assert.ok(start >= 0, 'terminal has a guarded signal mount');
  const root = {}, symbols = [];
  const api = () => {};
  let options;
  const context = vm.createContext({
    $: () => root, api, S: { sym: null, gen: 0 }, P: [], OI: { setData() {} },
    TASKS: { coin: {}, oi: {}, sig: {}, ob: {} }, document: {}, store: { set() {} },
    cleanSym: s => /^[A-Z]+USDT$/.test(s) ? s : null, short: s => s,
    renderList() {}, renderSum() {}, renderOiStats() {}, renderOz() {}, loop() {},
    openLive() {}, loadAkis() {}   // V1.10 canlı akış ve V1.16 akış kaydı: seçimde açılır
  });
  vm.runInContext(html.slice(start, html.indexOf('async function checkVer', start)), context);
  assert.doesNotThrow(() => context.mountSignals());
  context.TerminalSignalPanel = { mount(o) { options = o; return { setSymbol: s => symbols.push(s) }; } };
  context.mountSignals();
  assert.equal(options.root, root);
  assert.equal(options.api, api);
  assert.equal(options.getSymbol(), null);
  context.select('ARCUSDT');
  options.onSelectSymbol('BTCUSDT');
  context.select('BTCUSDT');
  context.select('bad');
  assert.equal(options.getSymbol(), 'BTCUSDT');
  assert.deepEqual(symbols, ['ARCUSDT', 'BTCUSDT']);
});

test('fresh panes prioritize candle height without replacing explicit pane or legacy settings', () => {
  const { registry } = require('../web/public/terminal-indicators.js');
  const init = html.slice(html.indexOf('const S = {'), html.indexOf('if (!Array.isArray(S.tfs)'));
  function panes(saved) {
    const context = { store: { get: (k, fallback) => saved[k] ?? fallback },
      INDICATOR_PANELS: new Map(registry.panels().map(d => [d.id, d.panel])), LAYOUTS: { kisa: [] } };
    return JSON.parse(vm.runInNewContext(init + 'JSON.stringify(S.panes)', context));
  }
  assert.deepEqual(panes({}), { cvd: true, me: false, fr: false, oi: false, tp: false, rsi: true, srsi: true, wt: true });
  assert.deepEqual(panes({ ind: false, panes: { me: true, wt: true } }),
    { cvd: true, me: true, fr: false, oi: false, tp: false, rsi: false, srsi: false, wt: true });
  assert.ok(/id="pnb"[^>]*>Göstergeler/.test(html), 'toolbar label is Göstergeler');
});

test('switching timeframes in a fresh profile cannot overwrite the short preset', () => {
  const init = html.slice(html.indexOf('const S = {'), html.indexOf('const paused ='));
  const presets = { kisa: ['5m', '15m', '1h', '4h'], uzun: ['4h', '1d', '1w', '1M'] };
  vm.runInNewContext(init + 'LAYOUTS.uzun.forEach((tf, i) => { S.tfs[i] = tf; });', {
    LAYOUTS: presets, TFS: [...new Set([...presets.kisa, ...presets.uzun])], PERIODS: ['5m'],
    INDICATOR_PANELS: new Map(), store: { get: (_, fallback) => fallback }
  });
  assert.deepEqual(presets.kisa, ['5m', '15m', '1h', '4h']);
});

test('watchlist symbol buttons announce visible contract status badges', () => {
  const now = Date.now(), elements = { '#wl': { contains: () => false }, '#linfo': {}, '#addq': {} };
  const S = { list: ['OLDUSDT'], listOk: true, sort: {}, mode: 'all', sym: 'ALPHAUSDT',
    uni: { n: 3, rows: { ALPHAUSDT: [null, now + 10000], BETAUSDT: [null, null, now], GAMMAUSDT: [] } } };
  const context = vm.createContext({ S, $: sel => elements[sel], short: s => s.slice(0, -4), esc: s => s,
    fmtPx() {}, fmtPct() {}, volM() {}, pcls() {}, trDate: t => new Date(t), p2: n => String(n).padStart(2, '0'),
    document: { querySelectorAll: () => [] } });
  vm.runInContext(html.slice(html.indexOf('function renderList()'), html.indexOf("$('#wl').addEventListener('click'")), context);
  context.renderList();
  assert.match(elements['#wl'].innerHTML, /aria-label="ALPHAUSDT, Delist" aria-current="true"/);
  assert.match(elements['#wl'].innerHTML, /aria-label="BETAUSDT, Yeni"/);
  assert.match(elements['#wl'].innerHTML, /aria-label="GAMMAUSDT"/);
  S.mode = 'mine';
  context.renderList();
  assert.match(elements['#wl'].innerHTML, /aria-label="OLDUSDT, Kapalı"/);
});

test('opening the summary reuses one derivative poll and stops it when closed', async () => {
  const root = { open: false }, requests = [];
  const makeChart = () => ({ loaded: true, next: Infinity, tnext: 0, gen: 1, tf: '5m',
    ch: { data: [[123]], requestDraw() {} } });
  const P = [makeChart(), makeChart(), makeChart(), makeChart()];
  const S = { sym: 'ARCUSDT', gen: 1, panes: {} };
  const context = vm.createContext({ P, S, TASKS: {}, document: { hidden: false },
    $: sel => sel === '#market-summary' ? root : null, paused: () => false,
    renderWarn() {}, renderOz() {}, api(url) { return new Promise(resolve => requests.push({ url, resolve })); } });
  vm.runInContext(html.slice(html.indexOf('const needTurev'), html.indexOf('const fastest'))
    + html.slice(html.indexOf('function loop()'), html.indexOf("document.addEventListener('visibilitychange'")), context);
  context.loop();
  assert.equal(requests.length, 0);
  root.open = true;
  context.loop();
  context.loop();
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /symbol=ARCUSDT&tf=5m&from=123$/);
  requests[0].resolve({ son: { glob: 51, top: 52, pos: 53 }, frIv: 8 });
  await new Promise(setImmediate);
  context.loop();
  assert.equal(requests.length, 1);
  assert.deepEqual(S.son, { glob: 51, top: 52, pos: 53 });
  assert.equal(S.frIv, 8);
  root.open = false;
  P[0].tnext = 0;
  context.loop();
  assert.equal(requests.length, 1);
  S.panes.tp = true;
  context.loop();
  assert.equal(requests.length, 5);
});
