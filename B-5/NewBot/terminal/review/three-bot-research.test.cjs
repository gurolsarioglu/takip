const {test}=require('node:test');
const assert=require('node:assert/strict');
const {decodeLiteral,extractTemplates,parseMessage,closedBefore,nadaraya}=require('./three-bot-research.cjs');
test('source extraction decodes inert string literals without executing target code',()=>{
  const text=`id:"visivero-demo",name:"Demo",code:'a\\nb\\\'c',other:1`;
  assert.equal(extractTemplates(text)[0].code,"a\nb'c");
  assert.equal(decodeLiteral('"x\\u0041"',0).value,'xA');
  assert.throws(()=>decodeLiteral('`${process.exit()}`',0));
  assert.throws(()=>extractTemplates(`id:"visivero-x/../../escape",name:"Demo",code:'x'`));
});
test('reference parser keeps exact event identity, labeled metrics and directions',()=>{
  const x=parseMessage({id:'x',botId:'div',symbol:'BTCUSDT',createdAt:'2026-10-20T08:01:04Z',message:'🔴 #BTCUSDT\nStrategy: 4H RSI DIVERGENCE\nCurrent Price: 100\nRSI: <b>1h.65 | 4h.72❗️ | 1d.55</b>\nSRSI: <b>1h.20 | 4h.80 | 1d.30</b>'});
  assert.equal(x.direction,'down');assert.equal(x.strategy,'4H RSI DIVERGENCE');assert.equal(x.rsi['4h'],72);assert.equal(x.srsi['4h'],80);assert.equal(x.price,100);
  assert.throws(()=>parseMessage({symbol:'../../outsideUSDT'}));
  assert.equal(parseMessage({symbol:'我踏马来了USDT'}).symbol,'我踏马来了USDT');
});
test('future candle completion is excluded from historical signal inputs',()=>{
  assert.deepEqual(closedBefore([{closeTime:99},{closeTime:100},{closeTime:101}],100),[{closeTime:99}]);
  const raw=[[0,'1','2','0','1','10',99],[100,'1','2','0','1','10',199]];
  assert.deepEqual(closedBefore(raw,100),[raw[0]]);
});
test('Nadaraya repaint endpoint matches Gaussian formula and constant series',()=>{
  const x=nadaraya([1,2,3],{h:1,mult:3,repaint:true});
  const expected=(3+2*Math.exp(-.5)+Math.exp(-2))/(1+Math.exp(-.5)+Math.exp(-2));
  assert.ok(Math.abs(x.at(-1).center-expected)<1e-12);
  const c=nadaraya(Array(20).fill(7),{repaint:true});assert.ok(c.every(x=>Math.abs(x.center-7)<1e-12&&Math.abs(x.upper-7)<1e-12));
});
