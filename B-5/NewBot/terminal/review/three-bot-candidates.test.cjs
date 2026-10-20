const {test}=require('node:test');const assert=require('node:assert/strict');
const {rsiSeries,smaSeries,tvDivergence}=require('./three-bot-candidates.cjs');
test('research Wilder RSI keeps warmup unknown and recurs from SMA seed',()=>{
  const values=Array.from({length:15},(_,i)=>i);const r=rsiSeries(values);assert.equal(r[13],null);assert.equal(r[14],100);
  const mixed=rsiSeries([1,2,1,2,1],2);assert.equal(mixed[2],50);assert.equal(mixed[3],75);assert.equal(mixed[4],37.5);
  assert.deepEqual(smaSeries([null,1,2,3],2),[null,null,1.5,2.5]);
});
test('RSI-pivot divergence is returned at confirmation, without oversold gate',()=>{
  const rs=[60,55,50,55,60,65,60,55,52,56,60];const bars=rs.map((r,i)=>({low:i===2?10:i===8?9:20,high:30}));
  assert.equal(tvDivergence(bars,rs,{left:2,right:2,minRange:1,maxRange:60}).up,true);
  assert.equal(tvDivergence(bars.slice(0,-1),rs.slice(0,-1),{left:2,right:2,minRange:1,maxRange:60}).up,false);
});
