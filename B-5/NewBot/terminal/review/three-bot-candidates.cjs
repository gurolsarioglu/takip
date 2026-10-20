// Explicit research candidates; no production strategy imports this module.
const fs=require('node:fs'),path=require('node:path');
const {ROOT,parseMessage,closedBefore,nadaraya}=require('./three-bot-research.cjs');
const quant=require('../services/quant-indicators.service');
function rsiSeries(values,n=14){
  const result=Array(values.length).fill(null);if(values.length<=n)return result;
  let gain=0,loss=0;for(let i=1;i<=n;i++){const d=values[i]-values[i-1];gain+=Math.max(d,0)/n;loss+=Math.max(-d,0)/n;}
  result[n]=loss===0?100:100-100/(1+gain/loss);
  for(let i=n+1;i<values.length;i++){const d=values[i]-values[i-1];gain=(gain*(n-1)+Math.max(d,0))/n;loss=(loss*(n-1)+Math.max(-d,0))/n;result[i]=loss===0?100:100-100/(1+gain/loss);}return result;
}
function smaSeries(values,n){return values.map((_,i)=>{const w=values.slice(i-n+1,i+1);return i<n-1||w.some(x=>!Number.isFinite(x))?null:w.reduce((a,b)=>a+b,0)/n;});}
function stochSeries(rsi,n=14){
  const raw=rsi.map((x,i)=>{const w=rsi.slice(i-n+1,i+1);if(i<n-1||w.some(v=>!Number.isFinite(v)))return null;const lo=Math.min(...w),hi=Math.max(...w);return hi===lo?null:100*(x-lo)/(hi-lo);});
  const k=smaSeries(raw,3);return {k,d:smaSeries(k,3)};
}
function tvDivergence(bars,rsi,{left=5,right=5,minRange=5,maxRange=60}={}){
  const pivot=i=>{if(i<left||i+right>=rsi.length||!Number.isFinite(rsi[i]))return null;const w=rsi.slice(i-left,i+right+1);if(w.some(x=>!Number.isFinite(x)))return null;return {low:rsi[i]===Math.min(...w),high:rsi[i]===Math.max(...w)};};
  const i=rsi.length-1-right,current=pivot(i);let up=false,down=false;
  if(!current)return {up,down};
  for(const side of ['low','high']){
    if(!current[side])continue;let j=i-1;for(;j>=left;j--)if(pivot(j)?.[side])break;
    const distance=i-j-1;if(j<left||distance<minRange||distance>maxRange)continue;
    if(side==='low')up=rsi[i]>rsi[j]&&bars[i].low<bars[j].low;
    else down=rsi[i]<rsi[j]&&bars[i].high>bars[j].high;
  }return {up,down};
}
function pricePivotDivergence(bars,rsi){
  // RSI-only port of 5in1, defaults pivot=5, maxpp=20, maxbars=200, dontconfirm=false.
  const now=bars.length-1,start=now-1,pools={up:[],down:[]};
  for(let i=5;i+5<=now;i++){
    const w=bars.slice(i-5,i+6);
    if(bars[i].low===Math.min(...w.map(x=>x.low)))pools.up.unshift(i);
    if(bars[i].high===Math.max(...w.map(x=>x.high)))pools.down.unshift(i);
  }
  const result={up:false,down:false,upRegular:false,downRegular:false,upHidden:false,downHidden:false};
  for(const side of ['up','down']){
    const sign=side==='up'?1:-1,key=side==='up'?'low':'high';
    if(!Number.isFinite(rsi[now])||!(sign*(rsi[now]-rsi[start])>0||sign*(bars[now].close-bars[start].close)>0))continue;
    for(const p of pools[side].slice(0,20)){
      const distance=now-p;if(distance>200)break;if(distance<=5||!Number.isFinite(rsi[p]))continue;
      const regular=sign*(rsi[start]-rsi[p])>0&&sign*(bars[start][key]-bars[p][key])<0;
      const hidden=sign*(rsi[start]-rsi[p])<0&&sign*(bars[start][key]-bars[p][key])>0;
      if(!regular&&!hidden)continue;
      const slopeR=(rsi[start]-rsi[p])/(distance-1),slopeC=(bars[start].close-bars[p].close)/(distance-1);
      let lineR=rsi[start]-slopeR,lineC=bars[start].close-slopeC,valid=true;
      for(let y=2;y<distance;y++){const i=now-y;if(!Number.isFinite(rsi[i])||sign*(rsi[i]-lineR)<0||sign*(bars[i].close-lineC)<0){valid=false;break;}lineR-=slopeR;lineC-=slopeC;}
      if(valid){result[side]=true;result[side+(regular?'Regular':'Hidden')]=true;}
    }
  }return result;
}
function cross(values,ma){const a=values.at(-2),b=values.at(-1),c=ma.at(-2),d=ma.at(-1);return {up:[a,b,c,d].every(Number.isFinite)&&a<=c&&b>d,down:[a,b,c,d].every(Number.isFinite)&&a>=c&&b<d};}
function nwState(values){
  if(values.length<30)return null;
  const bands=nadaraya(values),b=bands.at(-1),p=bands.at(-2),v=values.at(-1),pv=values.at(-2);
  return {up:v<b.lower,down:v>b.upper,crossUp:v<b.lower&&pv>p.lower,crossDown:v>b.upper&&pv<p.upper,lower:b.lower,upper:b.upper};
}
function analyze(){
  const allRows=['div','4sniper','hammer-pro-plus'].flatMap(bot=>JSON.parse(fs.readFileSync(path.join(ROOT,bot+'.json'),'utf8')).response.messages.map(parseMessage));
  const manifests=['candle-manifest.json','expanded-candle-manifest.json'].flatMap(file=>fs.existsSync(path.join(ROOT,file))?JSON.parse(fs.readFileSync(path.join(ROOT,file),'utf8')):[]);
  const unique=[...new Map(manifests.map(e=>[e.id+e.interval,e])).values()];const details=[];
  for(const e of unique){
    if(e.error){details.push({...e});continue;}
    const row=allRows.find(x=>x.id===e.id),raw=JSON.parse(fs.readFileSync(path.join(ROOT,'candles',e.file),'utf8')).raw;
    const closed=closedBefore(raw,Date.parse(e.eventTime)).map(k=>({openTime:k[0],high:+k[2],low:+k[3],close:+k[4],closeTime:k[6]}));
    if(closed.length<30){details.push({...e,insufficientHistory:true});continue;}
    const closes=closed.map(k=>k.close),rClosed=rsiSeries(closes),approxCloses=[...closes,row.price],rApprox=rsiSeries(approxCloses);
    const approximatedBars=[...closed,{close:row.price,high:NaN,low:NaN}];
    const srsi=stochSeries(rApprox);
    details.push({id:e.id,botId:e.botId,symbol:e.symbol,interval:e.interval,strategy:row.strategy,direction:row.direction,eventTime:e.eventTime,closedCount:closed.length,
      reportedRsi:row.rsi[e.interval]??null,rsiClosed:rClosed.at(-1),rsiPriceApprox:rApprox.at(-1),
      reportedSrsi:row.srsi[e.interval]??null,srsiKPriceApprox:srsi.k.at(-1),srsiDPriceApprox:srsi.d.at(-1),
      rsiSmaCrossClosed:cross(rClosed,smaSeries(rClosed,14)),rsiSmaCrossPriceApprox:cross(rApprox,smaSeries(rApprox,14)),
      wtCrossClosed:(()=>{const w=quant.calculateWaveTrend(closed);return {up:w.crossUp,down:w.crossDown,wt1:w.wt1,wt2:w.wt2};})(),
      tvDivClosed:tvDivergence(closed,rClosed),tvDivPriceApprox:tvDivergence(approximatedBars,rApprox),pricePivotDivClosed:pricePivotDivergence(closed,rClosed),pricePivotDivPriceApprox:pricePivotDivergence(approximatedBars,rApprox),
      nwClosed:e.interval==='4h'?nwState(closes):null,nwPriceApprox:e.interval==='4h'?nwState(approxCloses):null});
  }
  const summaries={};for(const botId of ['div','4sniper','hammer-pro-plus']){
    const rs=details.filter(x=>x.botId===botId&&Number.isFinite(x.reportedRsi)&&Number.isFinite(x.rsiPriceApprox));
    const mae=key=>rs.length?rs.reduce((sum,x)=>sum+Math.abs(x.reportedRsi-x[key]),0)/rs.length:null;
    const classified=details.filter(x=>x.botId===botId&&(x.strategy?.startsWith('4H')?x.interval==='4h':x.strategy?.startsWith('1H')?x.interval==='1h':botId==='4sniper'?x.interval==='4h':botId==='hammer-pro-plus'?x.interval==='1m':false));
    summaries[botId]={rsiComparisons:rs.length,maeClosed:mae('rsiClosed'),maePriceApprox:mae('rsiPriceApprox'),withinOnePointPriceApprox:rs.filter(x=>Math.abs(x.reportedRsi-x.rsiPriceApprox)<=1).length,groups:{}};
    for(const r of classified){const key=r.strategy;const g=summaries[botId].groups[key]??={count:0,tvDivClosed:0,tvDivPriceApprox:0,pricePivotDivClosed:0,pricePivotDivPriceApprox:0,rsiSmaCrossClosed:0,rsiSmaCrossPriceApprox:0,wtCrossClosed:0,nwOutsideClosed:0,nwOutsidePriceApprox:0,nwFreshCrossClosed:0};g.count++;
      for(const name of ['tvDivClosed','tvDivPriceApprox','pricePivotDivClosed','pricePivotDivPriceApprox','rsiSmaCrossClosed','rsiSmaCrossPriceApprox','wtCrossClosed'])if(r[name]?.[r.direction])g[name]++;
      if(r.nwClosed?.[r.direction])g.nwOutsideClosed++;if(r.nwClosed?.[r.direction==='up'?'crossUp':'crossDown'])g.nwFreshCrossClosed++;
      if(r.nwPriceApprox?.[r.direction])g.nwOutsidePriceApprox++;
    }
  }
  const result={createdAt:new Date().toISOString(),scope:'Positive-reference observations only. Not precision, recall, holdout validation or parity.',intrabarPolicy:'Only completed candles before eventTime are used. PriceApprox appends the reported signal price for RSI/close-based candidates; it does not reconstruct unknown intrabar H/L or exact exchange timestamp.',candidatePolicy:'Fixed shipped-template defaults, no fitted thresholds. Pivot tie semantics and chart-vs-bot equivalence remain unverified.',summaries,details};
  fs.writeFileSync(path.join(ROOT,'candidate-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(summaries,null,2));
}
module.exports={rsiSeries,smaSeries,stochSeries,tvDivergence,pricePivotDivergence};
if(require.main===module)analyze();
