'use strict';
// Debug helper: node probe.cjs <url>  -> prints status + first 3000 chars
const u = process.argv[2];
fetch(u).then(async r => { const t = await r.text(); console.log(r.status, t.length); console.log(t.slice(0, Number(process.argv[3] || 3000))); }).catch(e => console.log('ERR', e.message));
