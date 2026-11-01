'use strict';
// Live recorder: every minute at ~:00.2 fetch premiumIndex for all symbols; also fundingInfo once per hour.
// Output: data/flow/premium-YYYYMMDD.jsonl lines {t, fetchedAt, d:{SYM:[lastFundingRate, nextFundingTime, markPrice]}}
const fs = require('node:fs');
const path = require('node:path');
const { getJson, ROOT, sleep } = require('../../lib/net.cjs');
const DIR = path.join(ROOT, 'flow'); fs.mkdirSync(DIR, { recursive: true });
const minutes = Number(process.argv[2] || 180);
const offsetMs = Number(process.argv[3] || 200);
(async () => {
  let lastInfo = 0;
  for (let i = 0; i < minutes; i++) {
    const now = Date.now();
    const next = Math.ceil((now - offsetMs) / 60000) * 60000 + offsetMs;
    await sleep(Math.max(0, next - now));
    try {
      if (Date.now() - lastInfo > 3600e3) {
        const fi = await getJson('https://fapi.binance.com/fapi/v1/fundingInfo');
        fs.writeFileSync(path.join(DIR, 'fundingInfo.json'), JSON.stringify(fi)); lastInfo = Date.now();
      }
      const t0 = Date.now();
      const arr = await getJson('https://fapi.binance.com/fapi/v1/premiumIndex');
      const d = {};
      for (const x of arr) d[x.symbol] = [+x.lastFundingRate, x.nextFundingTime, +x.markPrice, x.time];
      fs.appendFileSync(path.join(DIR, 'premium-' + new Date(next).toISOString().slice(0, 10).replace(/-/g, '') + '.jsonl'), JSON.stringify({ t: next, fetchedAt: t0, gotAt: Date.now(), d }) + '\n');
    } catch (e) { console.error(new Date().toISOString(), e.message); }
  }
})();
