'use strict';
// Archive Visivero reference signals. Usage:
//   node collect.cjs [--bots m1,4s] [--pages 20] [--follow]   (follow = poll new messages forever)
const fs = require('node:fs');
const path = require('node:path');
const { botMessages, ROOT, sleep } = require('./lib/net.cjs');

const ALL = ['m1', 'm1-premium', 'fr', 'v3', 'hammer', 'hammer-pro', 'hammer-pro-plus', '1d-hammer-pro', '4s', '4sniper', '1dws', 'div'];
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const bots = (arg('bots', ALL.join(','))).split(',');
const pages = Number(arg('pages', 10));
const since = Date.parse(arg('since', '2000-01-01'));
const follow = process.argv.includes('--follow');
const DIR = path.join(ROOT, 'ref');
fs.mkdirSync(DIR, { recursive: true });

function load(bot) {
  const f = path.join(DIR, bot + '.jsonl');
  const map = new Map();
  if (fs.existsSync(f)) for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (!l) continue; try { const r = JSON.parse(l); map.set(r.id, r); } catch {} }
  return { f, map };
}
function append(f, rows) { if (rows.length) fs.appendFileSync(f, rows.map(r => JSON.stringify(r)).join('\n') + '\n'); }

let beforeMode = 'createdAt'; // verified: before=<ISO createdAt> returns older rows (ascending order)
async function page(bot, before) {
  if (!before) return botMessages(bot, {});
  if (beforeMode) return botMessages(bot, { before: before[beforeMode] });
  for (const mode of ['createdAt', 'id']) {
    try {
      const r = await botMessages(bot, { before: before[mode] });
      if (r.messages?.length && r.messages.every(m => Date.parse(m.createdAt) <= Date.parse(before.createdAt)) && r.messages[0].id !== before.id) { beforeMode = mode; console.error('before-mode =', mode); return r; }
    } catch (e) { /* try next */ }
  }
  throw new Error('pagination cursor not understood');
}

async function backfill(bot) {
  const { f, map } = load(bot);
  let before = null, added = 0;
  for (let p = 0; p < pages; p++) {
    const r = await page(bot, before);
    const rows = (r.messages || []).filter(m => !map.has(m.id));
    for (const m of rows) map.set(m.id, m);
    append(f, rows); added += rows.length;
    if (process.env.PARITY_DEBUG) console.error(bot, p, r.messages?.length, r.hasMore, rows.length);
    if (!r.hasMore || !r.messages?.length) break;
    if (Math.min(...r.messages.map(m => Date.parse(m.createdAt))) < since) break;
    const last = r.messages.reduce((a, m) => (Date.parse(m.createdAt) < Date.parse(a.createdAt) ? m : a));
    if (before && last.createdAt >= before.createdAt) break;
    before = { id: last.id, createdAt: last.createdAt };
    await sleep(250);
  }
  const ts = [...map.values()].map(m => m.createdAt).sort();
  console.log(JSON.stringify({ bot, added, total: map.size, from: ts[0], to: ts.at(-1) }));
}

async function poll() {
  const state = Object.fromEntries(bots.map(b => [b, load(b)]));
  for (;;) {
    for (const b of bots) {
      try {
        const r = await botMessages(b, { limit: 50 });
        const rows = (r.messages || []).filter(m => !state[b].map.has(m.id)).map(m => ({ ...m, seenAt: new Date().toISOString() }));
        for (const m of rows) state[b].map.set(m.id, m);
        append(state[b].f, rows.reverse());
        if (rows.length) console.log(new Date().toISOString(), b, '+' + rows.length);
      } catch (e) { console.error(b, e.message); }
    }
    await sleep(Number(arg('interval', 15000)));
  }
}

(async () => {
  if (follow) return poll();
  for (const b of bots) { try { await backfill(b); } catch (e) { console.error(b, e.message); } }
})();
