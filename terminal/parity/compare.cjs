'use strict';
// Live parity report: our engine signals (data/live/signals-*.jsonl) vs Visivero live-polled messages
// (data/ref/<bot>.jsonl rows with seenAt). Episode-level matching per bot/symbol/direction(/strategy).
// node compare.cjs [--from ISO] [--to ISO] [--bots m1,m1-premium]
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('./lib/ref.cjs');
const { ROOT } = require('./lib/net.cjs');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
// episode gap and matching tolerance by bot
const CFG = {
  'm1': { gap: 60e3, tol: 30e3, useStrategy: false },
  'm1-premium': { gap: 60e3, tol: 30e3, useStrategy: false },
  'hammer': { gap: 120e3, tol: 60e3, useStrategy: false },
  'hammer-pro': { gap: 120e3, tol: 60e3, useStrategy: true },
  'hammer-pro-plus': { gap: 120e3, tol: 60e3, useStrategy: true },
  '1d-hammer-pro': { gap: 3600e3, tol: 900e3, useStrategy: true },
  '4s': { gap: 3600e3, tol: 900e3, useStrategy: true },
  '4sniper': { gap: 3600e3, tol: 900e3, useStrategy: true },
  '1dws': { gap: 6 * 3600e3, tol: 1800e3, useStrategy: true },
  'div': { gap: 3600e3, tol: 900e3, useStrategy: true },
  'fr': { gap: 1800e3, tol: 300e3, useStrategy: false },
  'v3': { gap: 120e3, tol: 70e3, useStrategy: false }
};

const live = [];
for (const f of fs.readdirSync(path.join(ROOT, 'live')).filter(f => f.startsWith('signals-'))) {
  for (const l of fs.readFileSync(path.join(ROOT, 'live', f), 'utf8').split('\n')) if (l) { try { live.push(JSON.parse(l)); } catch { } }
}
let status = {}; try { status = JSON.parse(fs.readFileSync(path.join(ROOT, 'live', 'status.json'), 'utf8')); } catch { }
const from = Date.parse(arg('from', status.readyAt || '2000-01-01')) + Number(arg('warmup', 120e3));
const to = Date.parse(arg('to', new Date(Date.now() - 60e3).toISOString()));
const bots = arg('bots', Object.keys(CFG).join(',')).split(',');

function episodes(items, gap, useStrategy) {
  const g = new Map();
  for (const x of items.sort((a, b) => a.t - b.t)) {
    const k = [x.symbol, x.direction || '-', useStrategy ? (x.strategy || '-') : '*'].join('|');
    const arr = g.get(k) || []; const last = arr[arr.length - 1];
    if (last && x.t - last.end <= gap) { last.end = x.t; last.n++; } else arr.push({ key: k, symbol: x.symbol, direction: x.direction, strategy: x.strategy, start: x.t, end: x.t, n: 1, sample: x });
    g.set(k, arr);
  }
  return g;
}

const report = { window: [new Date(from).toISOString(), new Date(to).toISOString()], bots: {} };
for (const bot of bots) {
  const cfg = CFG[bot]; if (!cfg) continue;
  const f = path.join(ROOT, 'ref', bot + '.jsonl'); if (!fs.existsSync(f)) continue;
  const ref = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(r => r.seenAt).map(parse).filter(r => r.t >= from && r.t <= to).map(r => ({ ...r, strategy: r.strategy || r.frFlip || null }));
  const ours = live.filter(s => s.botId === bot && s.t >= from && s.t <= to);
  const E1 = episodes(ref, cfg.gap, cfg.useStrategy), E2 = episodes(ours, cfg.gap, cfg.useStrategy);
  let tp = 0, fn = 0, fp = 0; const offsets = []; const missed = [], extra = [];
  const used = new Set();
  for (const [k, eps] of E1) for (const e of eps) {
    const cands = (E2.get(k) || []).filter(o => !used.has(o) && o.start <= e.end + cfg.tol && o.end >= e.start - cfg.tol);
    if (cands.length) { const o = cands[0]; used.add(o); tp++; offsets.push(o.start - e.start); }
    else { fn++; if (missed.length < 30) missed.push({ key: k, at: new Date(e.start).toISOString(), n: e.n, text: e.sample.raw?.slice(0, 160) }); }
  }
  for (const eps of E2.values()) for (const o of eps) if (!used.has(o)) { fp++; if (extra.length < 30) extra.push({ key: o.key, at: new Date(o.start).toISOString(), n: o.n }); }
  offsets.sort((a, b) => a - b);
  const q = p => offsets.length ? Math.round(offsets[Math.floor(p * (offsets.length - 1))] / 1000) : null;
  report.bots[bot] = { refMsgs: ref.length, ourMsgs: ours.length, refEpisodes: tp + fn, ourEpisodes: tp + fp, tp, fn, fp, recall: tp + fn ? +(tp / (tp + fn)).toFixed(3) : null, precision: tp + fp ? +(tp / (tp + fp)).toFixed(3) : null, offsetSec: { p10: q(.1), p50: q(.5), p90: q(.9) }, missed, extra };
}
fs.writeFileSync(path.join(ROOT, 'live', 'parity-report.json'), JSON.stringify(report, null, 1));
const brief = Object.fromEntries(Object.entries(report.bots).map(([b, r]) => [b, `TP ${r.tp} FN ${r.fn} FP ${r.fp} recall ${r.recall} precision ${r.precision} offset p50 ${r.offsetSec.p50}s`]));
console.log(JSON.stringify({ window: report.window, ...brief }, null, 1));
