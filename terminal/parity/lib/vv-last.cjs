'use strict';
// Last Visivero message per (bot, symbol, strategy) from the live follower files data/ref/<bot>.jsonl (tail-read,
// refreshed at most every 10 s). Used to keep our per-symbol state in step with Visivero while its feed is reachable.
const fs = require('node:fs');
const path = require('node:path');
const REF = path.join(__dirname, '..', 'data', 'ref');
const files = new Map(); // bot -> {pos, rest, last: Map(key -> {t, d}), checked}

function refresh(bot) {
  let f = files.get(bot);
  if (!f) { f = { pos: 0, rest: '', last: new Map(), checked: 0 }; files.set(bot, f); }
  if (Date.now() - f.checked < 10e3) return f;
  f.checked = Date.now();
  const file = path.join(REF, bot + '.jsonl');
  let size; try { size = fs.statSync(file).size; } catch { return f; }
  if (size < f.pos) { f.pos = 0; f.rest = ''; f.last.clear(); }
  if (size === f.pos) return f;
  const fd = fs.openSync(file, 'r');
  try {
    while (f.pos < size) {
      const len = Math.min(8 << 20, size - f.pos), buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, f.pos); f.pos += len;
      const parts = (f.rest + buf.toString('utf8')).split('\n'); f.rest = parts.pop();
      for (const l of parts) {
        if (!l) continue;
        let r; try { r = JSON.parse(l); } catch { continue; }
        const t = Date.parse(r.createdAt), msg = String(r.message || '');
        const d = msg.startsWith('🟢') ? 1 : msg.startsWith('🔴') ? -1 : 0;
        const st = (msg.match(/Strategy:\s*(#?\w+)/) || [])[1] || '*';
        for (const k of [`${r.symbol}|${st}`, `${r.symbol}|*any`]) { const p = f.last.get(k); if (!p || t >= p.t) f.last.set(k, { t, d }); }
      }
    }
  } finally { fs.closeSync(fd); }
  return f;
}
// last(bot, symbol, strategy) -> {t, d} | null ; strategy '*any' = any message of that bot
function last(bot, symbol, strategy) { return refresh(bot).last.get(`${symbol}|${strategy}`) || null; }
function freshness(bot) { let m = 0; for (const v of refresh(bot).last.values()) if (v.t > m) m = v.t; return m; }
module.exports = { last, freshness };
