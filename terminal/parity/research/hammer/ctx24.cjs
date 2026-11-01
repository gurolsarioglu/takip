'use strict';
// Adds 24h context (change %, quote volume, range) to feature rows: reads hammer-feat-<in>.jsonl, writes hammer-ctx-<in>.json {key: ctx}
const fs = require('node:fs'), path = require('node:path');
const { klinesRange, ROOT, IMS } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FROM = Date.parse(arg('from')), TO = Date.parse(arg('to')), IN = arg('in', '1m-day');
(async () => {
  const lines = fs.readFileSync(path.join(ROOT, 'analysis', 'hammer-feat-' + IN + '.jsonl'), 'utf8').split('\n').filter(Boolean);
  const bySym = new Map();
  for (const l of lines) { let r; try { r = JSON.parse(l); } catch { continue; } if (!bySym.has(r.s)) bySym.set(r.s, []); bySym.get(r.s).push(r.t); }
  const out = {};
  for (const [sym, ts] of bySym) {
    let h; try { h = await klinesRange(sym, '1h', Math.floor(FROM / 3600e3) * 3600e3 - 400 * 3600e3, TO); } catch (e) { continue; }
    let m; try { m = await klinesRange(sym, '1m', Math.floor(FROM / 60e3) * 60e3 - 400 * 60e3, TO); } catch (e) { m = []; }
    const mIdx = new Map(m.map((b, i) => [b.openTime, i]));
    for (const t of ts) {
      const j = h.findIndex(b => b.closeTime >= t - 1); if (j < 24) continue;
      const w = h.slice(j - 24, j); const last = m[mIdx.get(t - 60e3)];
      const px = last ? last.close : w.at(-1).close;
      const qv = w.reduce((s, b) => s + b.quoteVolume, 0);
      const hi = Math.max(...w.map(b => b.high)), lo = Math.min(...w.map(b => b.low));
      // 1m volume relative to its 20-bar mean
      const i = mIdx.get(t - 60e3); let vr = null, qv1 = null;
      if (i >= 20) { const mean = m.slice(i - 20, i).reduce((s, b) => s + b.volume, 0) / 20; vr = mean > 0 ? m[i].volume / mean : null; qv1 = m[i].quoteVolume; }
      out[sym + '|' + t] = { chg24: +(100 * (px / w[0].open - 1)).toFixed(2), qv24: Math.round(qv), rng24: +(100 * (hi / lo - 1)).toFixed(2), vr: vr && +vr.toFixed(2), qv1: qv1 && Math.round(qv1), listedH: h.length };
    }
  }
  fs.writeFileSync(path.join(ROOT, 'analysis', 'hammer-ctx-' + IN + '.json'), JSON.stringify(out));
  console.log('done', Object.keys(out).length);
})();
