'use strict';
// M1 Premium "WT Cross: 1m🟢 5m🔴 1h🔴" (since 2026-10-25 15:00): find the rule. Slot per tf, colour = cross direction?
const fs = require('node:fs');
const path = require('node:path');
const I = require('../../lib/ind.cjs');
const { parse } = require('../../lib/ref.cjs');
const { klinesAt, ROOT } = require('../../lib/net.cjs');
const MAX = Number(process.argv[2] || 250);
const rows = fs.readFileSync(path.join(ROOT, 'ref', 'm1-premium.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
  .filter(r => r.createdAt >= '2026-10-25T15:01').map(r => ({ ...parse(r), raw: r.message })).filter(r => Number.isFinite(r.price)).sort((a, b) => b.t - a.t);
const seen = new Set(); const pick = f => rows.filter(f).filter(r => { const k = r.symbol + Math.floor(r.t / 60e3); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, MAX);
const pos = pick(r => /WT Cross:/.test(r.raw)), neg = pick(r => !/WT Cross:/.test(r.raw));
const S = {}; const add = (k, label, pred) => { S[k] = S[k] || { tp: 0, fp: 0, fn: 0, tn: 0 }; S[k][label ? (pred ? 'tp' : 'fn') : (pred ? 'fp' : 'tn')]++; };
const DUMP = [];
const VAR = { lb: [10, 21, 4], tc: [9, 12, 3] };
(async () => {
  for (const r of [...pos, ...neg]) {
    const line = (r.raw.match(/WT Cross:([^\n]*)/) || [])[1] || '';
    for (const tf of ['1m', '5m', '1h']) {
      const m = line.match(new RegExp(tf + '(🟢|🔴)'));
      const label = m ? (m[1] === '🟢' ? 1 : -1) : 0;
      try {
        const ks = await klinesAt(r.symbol, tf, r.t, 500);
        const closed = ks.filter(b => b.closeTime < r.t), live = ks.find(b => b.openTime <= r.t && b.closeTime >= r.t);
        if (!live || closed.length < 120) continue;
        const lb = { ...live, close: r.price, high: Math.max(live.high, r.price), low: Math.min(live.low, r.price) };
        for (const [vn, [n1, n2, ns]] of Object.entries(VAR)) {
          for (const src of ['closed', 'live']) {
            const bars = src === 'live' ? [...closed, lb] : closed;
            const wt = I.waveTrend(bars, n1, n2, ns, 'first');
            const i = bars.length - 1;
            { const sd = r.direction === 'up' ? 1 : -1; let age = -1, lvl = NaN, w1 = NaN; for (let j = i; j > i - 12; j--) { const c = I.crossAt(wt.wt1, wt.wt2, j); if (c === -sd) { age = i - j; lvl = -sd * wt.wt2[j] * -1; w1 = wt.wt1[j]; break; } if (c === sd) break; }
              DUMP.push({ tf, vn, src, label: label !== 0, age, lvl: -sd === -1 ? wt.wt2[i - Math.max(0, age)] : -wt.wt2[i - Math.max(0, age)], now1: sd === 1 ? wt.wt1[i] : -wt.wt1[i] }); }
            for (const k of [1, 2, 3, 4, 5, 6]) {
              let x = 0; for (let j = i; j > i - k; j--) { const c = I.crossAt(wt.wt1, wt.wt2, j); if (c) { x = c; break; } }
              add(`${tf}|${vn}|${src}|last${k}|any`, label !== 0, x !== 0);
              add(`${tf}|${vn}|${src}|last${k}|dir`, label !== 0, x !== 0 && x === label);
              if (label !== 0 && x !== 0) add(`${tf}|${vn}|${src}|last${k}|colourOK`, true, x === label);
              // signal-direction-relative
              const sd = r.direction === 'up' ? 1 : -1;
              add(`${tf}|${vn}|${src}|last${k}|sameAsSignal`, label !== 0, x === sd);
              add(`${tf}|${vn}|${src}|last${k}|oppSignal`, label !== 0, x === -sd);
            }
          }
        }
        add(`${tf}|labelColourVsSignal same`, label !== 0, label === (r.direction === 'up' ? 1 : -1));
      } catch (e) { }
    }
  }
  const out = Object.entries(S).map(([k, v]) => { const rec = v.tp / Math.max(1, v.tp + v.fn), prec = v.tp / Math.max(1, v.tp + v.fp); return { k, ...v, rec: +rec.toFixed(3), prec: +prec.toFixed(3), f1: +(2 * rec * prec / Math.max(1e-9, rec + prec)).toFixed(3) }; });
  for (const tf of ['1m', '5m', '1h']) { console.log('==', tf); for (const o of out.filter(o => o.k.startsWith(tf) && /oppSignal|\|dir/.test(o.k)).sort((a, b) => b.f1 - a.f1).slice(0, 8)) console.log(JSON.stringify(o)); }
  fs.writeFileSync(path.join(ROOT, 'analysis', 'wtcross.json'), JSON.stringify(out));
  fs.writeFileSync(path.join(ROOT, 'analysis', 'wtcross-dump.json'), JSON.stringify(DUMP));
})();
