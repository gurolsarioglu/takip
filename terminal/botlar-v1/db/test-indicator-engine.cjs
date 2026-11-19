'use strict';
// Yerel, ağsız gösterge ve dört grafik regresyonları.
// Çalıştırma: node --test db/test-indicator-engine.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const sharedMath = require('../lib/ind.cjs');
const { IndicatorRegistry } = require('../web/public/indicator-engine.js');
const { registry } = require('../web/public/terminal-indicators.js');

function candles(step = 300_000, phase = 0, size = 110) {
  return Array.from({ length: size }, (_, i) => {
    const c = 100 + 9 * Math.sin(i * .43 + phase) + i * .08;
    return [i * step, c - .4, c + 1, c - 1, c, 120 + i];
  });
}

test('RSI, Stoch RSI ve WT kesişimleri daha önce kullanılan formüllerle eşleşir', () => {
  const data = candles(), closes = data.map(row => row[4]);
  const session = registry.createSession();
  session.setCandles(data, '5m');
  const rsi = sharedMath.rsi(closes);
  const stoch = sharedMath.stochRsi(closes);
  const wt = sharedMath.waveTrend(data.map(row => ({ high: row[2], low: row[3], close: row[4] })));
  assert.deepEqual(session.get('rsi').series, [rsi, sharedMath.sma(rsi, 14)]);
  assert.deepEqual(session.get('srsi').series, [stoch.k, stoch.d]);
  assert.deepEqual(session.get('wt').series, [wt.wt1, wt.wt2]);
  const marks = wt.wt2.map((_, i) => sharedMath.crossAt(wt.wt1, wt.wt2, i));
  assert.deepEqual([...session.get('wt').marks], marks);
  assert.ok(marks.includes(1) && marks.includes(-1));
});

test('dört oturum kendi mumlarını ve zaman dilimini kullanır, sonuçlar karışmaz', () => {
  const definitions = new IndicatorRegistry();
  definitions.register({ id: 'example', calculate: (rows, { interval }) => ({ interval, value: rows.at(-1)[4] }) });
  const tfs = ['5m', '15m', '1h', '4h'];
  const sessions = tfs.map((_, i) => {
    const session = definitions.createSession();
    session.setCandles(candles(300_000 * (i + 1), i), tfs[i]);
    return session;
  });
  const before = sessions.map(session => session.get('example'));
  assert.deepEqual(before.map(value => value.interval), tfs);
  assert.equal(new Set(before.map(value => value.value)).size, 4);
  sessions[1].setCandles(candles(86_400_000, 5), '1d');
  assert.equal(sessions[1].get('example').interval, '1d');
  for (const i of [0, 2, 3]) assert.equal(sessions[i].get('example'), before[i]);
});

test('yeni ve hatalı göstergeler mevcut sonuçları ya da kaynak mumları değiştiremez', () => {
  const definitions = new IndicatorRegistry();
  const panel = { label: 'Deneme', colors: [['#fff', '#000']], levels: [], range: 'auto' };
  definitions.register({ id: 'close', calculate: rows => rows.at(-1)[4] });
  const session = definitions.createSession(), input = candles();
  session.setCandles(input, '15m');
  const close = session.get('close');
  definitions.register({ id: 'demo', panel, calculate: rows => ({ series: [rows.map(row => row[4])] }) });
  definitions.register({ id: 'broken', panel, calculate: rows => { rows.at(-1)[4] = 0; return {}; } });
  definitions.register({ id: 'wrong-length', panel, calculate: () => ({ series: [[42]] }) });
  definitions.register({ id: 'sparse', panel, calculate: () => ({ series: new Array(1) }) });
  assert.throws(() => definitions.register({ id: 'close', calculate: () => 0 }), /close/);
  assert.deepEqual(definitions.panels().map(definition => definition.id), ['demo', 'broken', 'wrong-length', 'sparse']);
  assert.equal(session.get('broken'), null);
  assert.equal(session.get('wrong-length'), null);
  assert.equal(session.get('sparse'), null);
  assert.equal(session.get('demo').series[0].at(-1), close);
  assert.equal(input.at(-1)[4], close);
  assert.equal(session.get('close'), close);
});

test('özel bir gösterge yerleşik veri panellerinin adlarını alamaz', () => {
  const panel = { label: 'Deneme', colors: [['#fff', '#000']] };
  for (const id of ['me', 'fr', 'oi', 'tp']) {
    assert.throws(() => registry.register({ id, panel, calculate: () => ({ series: [[]] }) }), new RegExp(id));
  }
});

test('iki grafik aynı hesap tamponunu kullanan göstergeyi bağımsız saklar', () => {
  const definitions = new IndicatorRegistry();
  const output = [new Float64Array(1), new Float64Array(1)], marks = new Int8Array(1);
  definitions.register({
    id: 'shared-buffer', panel: { label: 'Ortak tampon', colors: [['#fff', '#000'], ['#fff', '#000']] },
    calculate(rows, { interval }) {
      output[0][0] = rows[0][4];
      marks[0] = interval === '5m' ? 1 : -1;
      return { series: output, marks };
    }
  });
  const short = definitions.createSession(), long = definitions.createSession();
  short.setCandles([[0, 1, 2, 0, 1, 5]], '5m');
  long.setCandles([[0, 3, 4, 2, 3, 5]], '4h');
  const a = short.get('shared-buffer'), b = long.get('shared-buffer');
  assert.equal(a.series[0][0], 1);
  assert.equal(b.series[0][0], 3);
  assert.equal(a.marks[0], 1);
  assert.equal(b.marks[0], -1);
});

function loadChart(extensions = '') {
  const dir = join(__dirname, '../web/public');
  const html = readFileSync(join(dir, 'terminal.html'), 'utf8');
  const context = vm.createContext({
    document: { documentElement: {} },
    window: { addEventListener() {} },
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    requestAnimationFrame: () => 1
  });
  const scripts = [...html.matchAll(/<script(?: src="\/([^"]+)")?>([\s\S]*?)<\/script>/g)];
  for (const [, src, body] of scripts) {
    if (!src && extensions) vm.runInContext(extensions, context);
    const code = src ? readFileSync(join(dir, src), 'utf8') : body.split('// ---------- Uygulama durumu ----------')[0];
    vm.runInContext(code, context);
  }
  const Chart = vm.runInContext('Chart', context);
  return {
    create(iv) {
      const labels = [], dots = [];
      const canvasContext = new Proxy({
        measureText(text) { return { width: String(text).length * 6 }; },
        fillText(text) { labels.push(text); },
        arc(x, y) { dots.push([x, y]); }
      }, { get(target, key) { return target[key] ?? (() => {}); } });
      const canvas = { getContext: () => canvasContext, addEventListener() {} };
      return Object.assign(new Chart({ querySelector: () => canvas }, { kind: 'candle', iv }), { labels, dots });
    },
    html,
    context
  };
}

test('terminalde canlı güncelleme, eski mum düzeltmesi ve geçmiş yükleme önbelleği yeniler', () => {
  const { create } = loadChart(), chart = create('5m');
  const bars = candles();
  chart.setData(bars);
  const initial = chart.indicators.get('wt');
  chart.merge([bars.at(-1).slice()]);
  assert.equal(chart.indicators.get('wt'), initial);
  const corrected = bars.at(-2).slice();
  corrected[4] += .6;
  chart.merge([corrected]);
  const afterCorrection = chart.indicators.get('wt');
  assert.notDeepEqual(afterCorrection.series[0].at(-1), initial.series[0].at(-1));
  chart.prepend([[-300_000, 99, 101, 98, 100, 120]]);
  assert.equal(chart.indicators.get('wt').series[0].length, bars.length + 1);
  chart.iv = '4h';
  chart.setData([]);
  assert.deepEqual(Array.from(chart.indicators.get('wt').series[0]), []);
  const fresh = candles(14_400_000, 3);
  chart.setData(fresh);
  assert.notEqual(chart.indicators.get('wt').series[0].at(-1), afterCorrection.series[0].at(-1));
});

test('kayıtlı bir alt panel menüde ve dört grafikte görünür, arızalı panel çizimi bozmaz', () => {
  const { create, html, context } = loadChart(String.raw`
    const reg = TerminalIndicators.registry;
    const panel = { label: 'Deneme <Çizgi>', colors: [['#fff', '#000']], levels: [], range: 'auto' };
    reg.register({ id: 'example-panel', panel, calculate: rows => ({ series: [rows.map(row => row[4])] }) });
    reg.register({ id: 'bad-panel', panel: { ...panel, label: 'Arızalı' }, calculate: () => { throw new Error('hesap'); } });
  `);
  const elements = { '#pnm': {}, '#pnb': { classList: { toggle() {} } } };
  context.document.querySelector = selector => elements[selector];
  context.S = { panes: { wt: true, 'example-panel': true, 'bad-panel': true } };
  vm.runInContext(html.slice(html.indexOf('const PNDEF ='), html.indexOf('function pnChanged(')) + 'renderPn()', context);
  assert.match(elements['#pnm'].innerHTML, /data-pn="example-panel" checked/);
  assert.match(elements['#pnm'].innerHTML, /Deneme &lt;Çizgi&gt;/);
  const intervals = [['5m', 300_000], ['15m', 900_000], ['1h', 3_600_000], ['4h', 14_400_000]];
  for (const [i, [interval, step]] of intervals.entries()) {
    const chart = create(interval), data = candles(step, i);
    Object.assign(chart, { W: 520, H: 700, panes: context.S.panes });
    chart.setData(data);
    chart.draw();
    assert.ok(chart.labels.includes('WT') && chart.dots.length > 0, interval);
    assert.ok(chart.labels.includes('Deneme <Çizgi>') && chart.labels.includes('Hesaplanamadı'), interval);
    assert.equal(chart.indicators.get('example-panel').series[0].at(-1), data.at(-1)[4]);
  }
});

test('geciken zaman dilimi yanıtı yeni grafiğin mum ve göstergelerini ezmez', async () => {
  const { create, html, context } = loadChart(), chart = create('5m');
  const queued = [];
  Object.assign(context, {
    chart,
    S: { sym: 'ARCUSDT', gen: 1, tfs: ['5m'] },
    store: { set() {} }, curSigs: () => [], renderSum() {}, paused: () => false,
    api: () => new Promise(resolve => queued.push(resolve))
  });
  const dataLoaders = html.slice(html.indexOf('function setTf('), html.indexOf('async function chartLive('));
  vm.runInContext(dataLoaders + '\n' +
    'globalThis.p = {i:0,tf:"5m",gen:0,tbusy:true,ch:chart,el:{querySelector:()=>({})}};', context);
  vm.runInContext('setTf(p,"15m"); setTf(p,"4h")', context);
  assert.equal(context.p.tbusy, false);
  const latest = candles(14_400_000, 2);
  queued[1](latest);
  await new Promise(setImmediate);
  const result = chart.indicators.get('wt');
  queued[0](candles(900_000, 1));
  await new Promise(setImmediate);
  assert.equal(chart.iv, '4h');
  assert.equal(chart.data, latest);
  assert.equal(chart.indicators.get('wt'), result);
});
