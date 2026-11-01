'use strict';
// Does Hammer #S1/#R1/#W1 coincide with a 1m Trader Club Buy/Sell (Range Filter hlc3, per 50, mult 2)?
// For each Visivero message: is there a same-direction RF flip on the 1m bar containing t or the 1–3 bars before?
// Control: same symbol, 37 min earlier.
const fs = require('node:fs');
const path = require('node:path');
const { klinesAt, ROOT } = require('../../lib/net.cjs');
const RF = require('./rflib.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const DAYS = Number(arg('days', 5)), MAXN = Number(arg('max', 400));
const PER = Number(arg('per', 50)), MULT = Number(arg('mult', 2));
const since = Date.now() - DAYS * 86400e3;
const rows = [];
for (const bot of ['hammer-pro', 'hammer-pro-plus']) {
  for (const l of fs.readFileSync(path.join(ROOT, 'ref', bot + '.jsonl'), 'utf8').split('\n')) {
    if (!l) continue; const r = JSON.parse(l); const t = Date.parse(r.createdAt); if (t < since) continue;
    const st = (r.message.match(/#(W1|S1|R1)/) || [])[1]; if (!st) continue;
    rows.push({ bot, sym: r.symbol, t, st, dir: r.message.startsWith('🟢') ? 'B' : 'S' });
  }
}
const seen = new Set(); const uniq = rows.sort((a, b) => b.t - a.t).filter(r => { const k = r.sym + r.st + Math.floor(r.t / 600e3); if (seen.has(k)) return false; seen.add(k); return true; });
(async () => {
  const stat = {}; const add = (k, v) => { stat[k] = stat[k] || [0, 0]; stat[k][0]++; if (v) stat[k][1]++; };
  let n = 0;
  for (const r of uniq) {
    if (n >= MAXN) break;
    try {
      for (const [lab, t] of [['sig', r.t], ['ctrl', r.t - 37 * 60e3]]) {
        const bars = (await klinesAt(r.sym, '1m', t, 400)).filter(b => b.openTime <= t);
        if (bars.length < 300) continue;
        const live = bars.at(-1);
        const src = bars.map((b, i) => (i === bars.length - 1 ? (b.high + b.low + b.close) / 3 : (b.high + b.low + b.close) / 3)); // live bar uses its full OHLC (close-of-minute approx)
        const { sig } = RF.rangeFilter(src, PER, MULT);
        const L = bars.length - 1;
        for (const k of [0, 1, 2, 3]) {
          let hit = false; for (let j = L; j >= L - k; j--) if (sig[j] === r.dir) hit = true;
          add(`${r.st} ${lab} sameDir within ${k}`, hit);
        }
        let opp = false; for (let j = L; j >= L - 3; j--) if (sig[j] && sig[j] !== r.dir) opp = true; add(`${r.st} ${lab} oppDir within 3`, opp);
      }
      n++;
    } catch (e) { }
  }
  console.log('signals', n, 'per', PER, 'mult', MULT);
  for (const [k, [a, b]] of Object.entries(stat).sort()) console.log(k.padEnd(32), `${b}/${a}`, (100 * b / a).toFixed(1) + '%');
})();
