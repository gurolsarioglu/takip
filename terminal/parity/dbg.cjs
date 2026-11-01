const { botMessages } = require('./lib/net.cjs');
(async()=>{ let before=null; for(let p=0;p<4;p++){ const r=await botMessages('4s', before?{before}:{}); const ts=r.messages.map(m=>m.createdAt).sort(); console.log(p, before, r.messages.length, r.hasMore, ts[0], ts.at(-1)); before=ts[0]; } })();
