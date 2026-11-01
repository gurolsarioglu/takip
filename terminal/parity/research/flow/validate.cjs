'use strict';
// Offline replay of recorded Binance samples through rules/flow.cjs vs live Visivero messages.
// node research/flow/validate.cjs   (runs anywhere; reads data/flow/*.jsonl and data/ref/{fr,v3}.jsonl)
const fs = require('node:fs'); const path = require('node:path');
const ROOT = path.join(__dirname, '..', '..', 'data');
const flow = require('../../rules/flow.cjs');
const jl = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
const files = d => fs.readdirSync(path.join(ROOT, 'flow')).filter(f => f.startsWith(d)).map(f => path.join(ROOT, 'flow', f));
const MIN = 60000;
const norm = s => s.replace(/<[^>]*>/g, '').split('\n').map(x => x.trim()).join('\n').trim();

function refIndex(bot) {
  const by = new Map();
  for (const r of jl(path.join(ROOT, 'ref', bot + '.jsonl'))) {
    if (r.message.includes('SE</b>')) continue;
    const m = Math.floor(Date.parse(r.createdAt) / MIN);
    const a = by.get(m) || []; a.push({ sym: r.symbol, text: norm(r.message), t: Date.parse(r.createdAt) }); by.set(m, a);
  }
  return by;
}
function score(name, pred, ref, minutes) {
  let tp = 0, tpText = 0, fp = 0, fn = 0; const FP = [], FN = [], TXT = [];
  for (const m of minutes) {
    const P = pred.get(m) || [], R = (ref.get(m) || []).slice();
    for (const p of P) {
      const key = p.text.split('\n')[0];
      const i = R.findIndex(r => r.text.split('\n')[0] === key && r.text.split('\n').length === p.text.split('\n').length);
      if (i >= 0) { tp++; if (R[i].text === p.text) tpText++; else if (TXT.length < 8) TXT.push({ m, pred: p.text, ref: R[i].text }); R.splice(i, 1); }
      else { fp++; if (FP.length < 10) FP.push({ m, text: p.text }); }
    }
    fn += R.length; for (const r of R) if (FN.length < 10) FN.push({ m, text: r.text });
  }
  const prec = tp / Math.max(1, tp + fp), rec = tp / Math.max(1, tp + fn);
  return { name, minutes: minutes.length, tp, fp, fn, exactText: tpText, precision: +prec.toFixed(4), recall: +rec.toFixed(4), FP, FN, textDiffs: TXT };
}

const report = {};
// ---------- FR ----------
{
  const samples = files('premium-').flatMap(jl).sort((a, b) => a.t - b.t);
  const ref = refIndex('fr');
  const refScanMinutes = new Set([...ref.entries()].filter(([, a]) => a.some(r => r.text.startsWith('#'))).map(([m]) => m));
  for (const mode of ['phaseLocked', 'freeRun']) {
    flow.resetGlobal();
    const states = new Map(); const pred = new Map(); const minutes = [];
    let prevT = null;
    for (const s of samples) {
      const m = Math.floor(s.t / MIN);
      prevT = m; minutes.push(m);
      if (mode === 'phaseLocked') flow.resetGlobal(); // scan every minute, keep only Visivero's scan minutes below
      const out = [];
      const refTimes = new Map((ref.get(m) || []).map(r => [r.sym, r.t]));
      for (const [sym, v] of Object.entries(s.d)) {
        const st = states.get(sym) || {}; states.set(sym, st);
        const t = refTimes.get(sym) || (m * MIN + 520);
        const res = flow.evaluate({ symbol: sym, t, price: v[2], funding: { rate: v[0], nextFundingTime: v[1] }, state: st });
        for (const r of res) if (r.botId === 'fr') {
          if (mode === 'phaseLocked' && r.strategy === 'FR scan' && !refScanMinutes.has(m)) continue;
          out.push(r);
        }
      }
      pred.set(m, out);
    }
    const scored = minutes.slice(1); // first minute has no previous sample
    report['fr_' + mode] = score('fr ' + mode, pred, ref, scored);
    report['fr_' + mode].byType = {};
    for (const typ of ['🟢 ⚠️flip', '🟢', '🔴', '#']) {
      const f = t => typ === '🟢 ⚠️flip' ? t.includes('changed') : typ === '#' ? t.startsWith('#') : (t.startsWith(typ) && !t.includes('changed'));
      const P = new Map([...pred].map(([m, a]) => [m, a.filter(x => f(x.text))]));
      const R = new Map([...ref].map(([m, a]) => [m, a.filter(x => f(x.text))]));
      const sc = score(typ, P, R, scored); report['fr_' + mode].byType[typ] = { tp: sc.tp, fp: sc.fp, fn: sc.fn, exactText: sc.exactText };
    }
  }
}
// ---------- V3 ----------
{
  const rows = files('v3live-').flatMap(jl).filter(x => x.v24).sort((a, b) => a.t - b.t);
  const ref = refIndex('v3');
  const pred = new Map(); const minutes = []; const near = [];
  for (const x of rows) {
    const m = Math.floor(x.t / MIN) + 1; // message minute = bar close minute
    minutes.push(m); const out = [];
    for (const [sym, vv] of Object.entries(x.v1m)) {
      const tk = x.v24[sym]; if (!tk) continue;
      const bars = [{ openTime: x.t, volume: vv[0], isLive: false }, { openTime: x.t + MIN, volume: 0, isLive: true }];
      const res = flow.evaluate({ symbol: sym, t: m * MIN + 300, bars: { '1m': bars }, ticker24h: { volume: tk[0] }, state: {} });
      for (const r of res) if (r.botId === 'v3') out.push(r);
      const pct = vv[0] / (tk[0] - vv[0]) * 100; if (pct > 7.5 && pct < 8.5) near.push({ m, sym, pct: +pct.toFixed(4), ref: (ref.get(m) || []).some(r => r.sym === sym) });
    }
    pred.set(m, out);
  }
  report.v3 = score('v3', pred, ref, minutes);
  report.v3.nearThreshold = near;
}
for (const k of Object.keys(report)) { const r = report[k]; console.log(k, JSON.stringify({ minutes: r.minutes, tp: r.tp, fp: r.fp, fn: r.fn, exactText: r.exactText, precision: r.precision, recall: r.recall, byType: r.byType })); }
fs.writeFileSync(path.join(ROOT, 'flow', 'validate-report.json'), JSON.stringify(report, null, 1));
