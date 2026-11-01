'use strict';
// Download compact kline history for all futures symbols (+ symbols seen in div refs).
// node research/div/dl.cjs --tf 1h --from 2026-08-20
const fs = require('node:fs');
const path = require('node:path');
const { klinesRange, exchangeInfo, ROOT } = require('../../lib/net.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TF = arg('tf', '1h');
const FROM = Date.parse(arg('from', '2026-08-20T00:00:00Z'));
const TO = Date.now();
const OUT = path.join(ROOT, 'div', 'k');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const info = await exchangeInfo();
  const syms = new Set(info.symbols.filter(s => s.contractType === 'PERPETUAL' && ['USDT', 'USDC'].includes(s.quoteAsset)).map(s => s.symbol));
  for (const l of fs.readFileSync(path.join(ROOT, 'ref', 'div.jsonl'), 'utf8').split('\n')) if (l) syms.add(JSON.parse(l).symbol);
  let n = 0;
  for (const s of [...syms].sort()) {
    const f = path.join(OUT, `${s}_${TF}.json`);
    if (fs.existsSync(f) && !process.argv.includes('--force')) { n++; continue; }
    try {
      // bypass on-disk raw cache to keep cache folder small: call range directly
      const ks = await klinesRange(s, TF, FROM, TO);
      fs.writeFileSync(f, JSON.stringify(ks.map(k => [k.openTime, k.open, k.high, k.low, k.close, k.volume])));
    } catch (e) { console.error(s, e.message); }
    if (++n % 50 === 0) console.log(TF, n, '/', syms.size);
  }
  console.log('done', TF, n);
})();
