'use strict';
// Visivero scans symbols in JS string (alphabetical) order after each cycle start. lib/scan-schedule.json holds the
// median observed offset (seconds after cycle start) per symbol, measured from the reference archive (calibration only,
// no runtime dependency). Unknown symbols are interpolated between alphabetical neighbours.
const fs = require('node:fs');
const path = require('node:path');
let S = {};
try { S = JSON.parse(fs.readFileSync(path.join(__dirname, 'scan-schedule.json'), 'utf8')); } catch { }
const sorted = {};
function table(key) {
  if (!sorted[key]) { const o = S[key]?.offsets || {}; sorted[key] = Object.keys(o).sort().map(s => [s, o[s]]); }
  return sorted[key];
}
// offset in ms after the cycle start at which Visivero evaluates `symbol`
function offsetMs(key, symbol, fallbackMs = 0) {
  const o = S[key]?.offsets; if (!o) return fallbackMs;
  if (o[symbol] != null) return o[symbol] * 1000;
  const t = table(key); if (!t.length) return fallbackMs;
  let lo = null, hi = null;
  for (const e of t) { if (e[0] < symbol) lo = e; else { hi = e; break; } }
  if (lo && hi) return (lo[1] + hi[1]) / 2 * 1000;
  return (lo || hi)[1] * 1000;
}
module.exports = { offsetMs, keys: () => Object.keys(S) };
