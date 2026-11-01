'use strict';
const { klinesAt } = require('../../lib/net.cjs');
(async () => { const [sym, tf, from, n] = process.argv.slice(2); const b = await klinesAt(sym, tf, Date.parse(from) + Number(n) * 60e3 * (tf === '1m' ? 1 : 5), Number(n));
  for (const x of b) console.log(new Date(x.openTime).toISOString().slice(11, 16), x.open, x.high, x.low, x.close); })();
