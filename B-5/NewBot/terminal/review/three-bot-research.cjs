// Research only. No import from production, credentials, order or SignalBus access.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function decodeLiteral(text,start){
  const quote=text[start];if(!['"',"'"].includes(quote))throw Error('Expected quoted literal');
  let value='';
  for(let i=start+1;i<text.length;i++){
    let ch=text[i];if(ch===quote)return {value,end:i+1};
    if(ch==='\\'){
      ch=text[++i]; const escapes={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','0':'\0'};
      if(ch==='u'||ch==='x'){
        const size=ch==='u'?4:2,hex=text.slice(i+1,i+1+size);if(!new RegExp(`^[0-9a-fA-F]{${size}}$`).test(hex))throw Error('Unsupported escape');
        value+=String.fromCharCode(parseInt(hex,16));i+=size;
      }else if(ch==='\n'){}else if(ch==='\r'){if(text[i+1]==='\n')i++;}else value+=escapes[ch]??ch;
    }else value+=ch;
  }throw Error('Unterminated literal');
}
function extractTemplates(text){
  const result=[];const pattern=/id:"(visivero-[^"]+)",name:"([^"]+)"[^{}]{0,600}?code:/g;
  for(const match of text.matchAll(pattern)){
    if(!/^visivero-[a-z0-9-]+$/.test(match[1]))throw Error('Unsafe template identity');
    const start=match.index+match[0].length,decoded=decodeLiteral(text,start);
    result.push({id:match[1],name:match[2],literalCharStart:start,literalCharEnd:decoded.end,
      literalByteStart:Buffer.byteLength(text.slice(0,start)),literalByteEnd:Buffer.byteLength(text.slice(0,decoded.end)),
      sourceSha256:hash(decoded.value),code:decoded.value});
  }return result;
}
function parseMessage(row){
  if(typeof row.symbol!=='string'||row.symbol.length>80||! /^[\p{L}\p{N}][\p{L}\p{N}_-]*(USDT|USDC)$/u.test(row.symbol))throw Error('Unsafe or unsupported reference symbol');
  const text=String(row.message||'').replace(/<[^>]*>/g,'');
  const number=label=>{const m=text.match(new RegExp('^'+label+':\\s*([+-]?[\\d.]+)','m'));return m?Number(m[1]):null;};
  const metrics=label=>{const line=text.match(new RegExp('^'+label+':([^\\n]*)','m'))?.[1]||'';return Object.fromEntries([...line.matchAll(/(\d+[mhdw])\.([\d.]+)/gi)].map(m=>[m[1].toLowerCase(),Number(m[2])]));};
  return {id:row.id,botId:row.botId,symbol:row.symbol,exchange:row.exchange,marketType:row.marketType,
    eventTime:row.createdAt,direction:text.startsWith('🟢')?'up':text.startsWith('🔴')?'down':null,
    strategy:text.match(/^Strategy:\s*(.*)$/m)?.[1]?.trim()||null,
    price:number('Current Price'),previousPrice:number('Previous Price'),boostPct:number('Boost Value'),rsi:metrics('RSI'),srsi:metrics('SRSI')};
}
function closedBefore(candles,time){return candles.filter(x=>(Array.isArray(x)?x[6]:x.closeTime)<time);}
function nadaraya(values,{h=8,mult=3,repaint=true}={}){
  if(!(h>0)||!Number.isFinite(mult)||values.some(x=>!Number.isFinite(x)))throw Error('Invalid Nadaraya input');
  const n=values.length;const centers=[];const errors=[];
  if(repaint){
    const window=values.slice(-500);for(let i=0;i<window.length;i++){
      let sum=0,den=0;for(let j=0;j<window.length;j++){const w=Math.exp(-((i-j)**2)/(2*h*h));sum+=window[j]*w;den+=w;}centers.push(sum/den);
    }
    const mae=window.reduce((sum,x,i)=>sum+Math.abs(x-centers[i]),0)/window.length*mult;
    return centers.map(center=>({center,upper:center+mae,lower:center-mae}));
  }
  for(let i=0;i<n;i++){
    let sum=0,den=0;for(let j=Math.max(0,i-499);j<=i;j++){const w=Math.exp(-((i-j)**2)/(2*h*h));sum+=values[j]*w;den+=w;}
    centers.push(sum/den);errors.push(Math.abs(values[i]-centers[i]));
  }
  return centers.map((center,i)=>{const window=errors.slice(Math.max(0,i-498),i+1);const mae=window.reduce((a,b)=>a+b,0)/window.length*mult;return {center,upper:center+mae,lower:center-mae};});
}
const ROOT=path.join(__dirname,'three-bot-evidence');
async function getJson(url){
  const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
  if(!response.ok){const error=Error(`HTTP ${response.status}: ${(await response.text()).slice(0,160)}`);error.status=response.status;throw error;}
  return response.json();
}
function save(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');}
function extract(){
  const sourcePath=path.join(__dirname,'visivero_dump','0-qg45til74n9.js'),bytes=fs.readFileSync(sourcePath),text=bytes.toString('utf8');
  const templates=extractTemplates(text);const manifest={sourcePath:path.relative(__dirname,sourcePath),bundleSha256:hash(bytes),inertExtraction:true,templates:[]};
  for(const {code,...metadata} of templates){fs.mkdirSync(path.join(ROOT,'templates'),{recursive:true});fs.writeFileSync(path.join(ROOT,'templates',metadata.id+'.py'),code);manifest.templates.push(metadata);}
  save(path.join(ROOT,'template-manifest.json'),manifest);console.log(JSON.stringify(manifest));
}
async function collect(){
  for(const botId of ['div','4sniper','hammer-pro-plus']){
    const url=`https://terminal.visivero.com/api/bot-messages?bot_id=${botId}&limit=100&exchange=binance&market_type=FUTURES`;
    const response=await getJson(url);
    if(!Array.isArray(response.messages)||response.messages.some(x=>x.botId!==botId||x.exchange!=='binance'||x.marketType!=='futures'||!Number.isFinite(Date.parse(x.createdAt))))throw Error('Unexpected reference schema/scope');
    const record={url,observedAt:new Date().toISOString(),credentialsUsed:false,response};save(path.join(ROOT,botId+'.json'),record);
    console.log(JSON.stringify({botId,count:response.messages.length,hasMore:response.hasMore,strategies:[...new Set(response.messages.map(x=>parseMessage(x).strategy))]}));
  }
}
async function supplements(){
  for(const query of [{botId:'hammer-pro-plus',message:'Strategy: #R1',file:'hammer-r1-history.json'},{botId:'1dws',file:'sniper-daily-weekly.json'}]){
    const params=new URLSearchParams({bot_id:query.botId,limit:'100',exchange:'binance',market_type:'FUTURES'});if(query.message)params.set('message',query.message);
    const url='https://terminal.visivero.com/api/bot-messages?'+params,response=await getJson(url);
    if(!Array.isArray(response.messages))throw Error('Unexpected supplemental schema');
    save(path.join(ROOT,query.file),{url,observedAt:new Date().toISOString(),credentialsUsed:false,response});
    console.log(JSON.stringify({query,count:response.messages.length,hasMore:response.hasMore,strategies:[...new Set(response.messages.map(x=>parseMessage(x).strategy))]}));
  }
}
async function holdout(){
  const result=[];
  const quant=require('../services/quant-indicators.service');
  for(const botId of ['div','4sniper','hammer-pro-plus']){
    const baseline=JSON.parse(fs.readFileSync(path.join(ROOT,botId+'.json'),'utf8')).response.messages;
    const known=new Set(baseline.map(x=>x.id));
    const url=`https://terminal.visivero.com/api/bot-messages?bot_id=${botId}&limit=100&exchange=binance&market_type=FUTURES`;
    const response=await getJson(url);if(!Array.isArray(response.messages))throw Error('Unexpected holdout schema');
    save(path.join(ROOT,botId+'-holdout.json'),{url,observedAt:new Date().toISOString(),credentialsUsed:false,response});
    for(const original of response.messages.filter(x=>!known.has(x.id))){
      const row=parseMessage(original),isNW=botId==='4sniper'&&row.strategy?.startsWith('NW'),isW1=botId==='hammer-pro-plus'&&row.strategy==='#W1';
      if(!isNW&&!isW1)continue;
      const ms=Date.parse(row.eventTime),interval=isNW?'4h':'1m';
      const e={id:row.id,botId,symbol:row.symbol,strategy:row.strategy,direction:row.direction,referenceRecordTime:row.eventTime,referencePrice:row.price,method:isNW?'NWE h8 mult3 repaint500; Binance trade at or before API record time':'WT10/21 SMA4, last closed 1m candle'};
      try{
        const klineUrl=`https://fapi.binance.com/fapi/v1/klines?symbol=${encodeURIComponent(row.symbol)}&interval=${interval}&endTime=${ms}&limit=750`;
        const raw=await getJson(klineUrl);if(!Array.isArray(raw))throw Error('Unexpected holdout candles');
        const bars=closedBefore(raw,ms).map(k=>({high:+k[2],low:+k[3],close:+k[4]}));
        if(isW1){const wt=quant.calculateWaveTrend(bars);e.matches=wt[row.direction==='up'?'crossUp':'crossDown'];e.values=wt;}
        else{
          let trades=[],tradeUrl;for(const lookback of [2000,30000]){
            tradeUrl=`https://fapi.binance.com/fapi/v1/aggTrades?symbol=${encodeURIComponent(row.symbol)}&startTime=${ms-lookback}&endTime=${ms}&limit=1000`;
            trades=await getJson(tradeUrl);if(!Array.isArray(trades))throw Error('Unexpected trade schema');
            if(trades.length>=1000)throw Error('Trade page cap: last event price not established');if(trades.length)break;
          }
          const last=trades.filter(t=>t.T<=ms).at(-1);if(!last)throw Error('No Binance trade before record time');
          const values=[...bars.map(x=>x.close),Number(last.p)];const band=nadaraya(values).at(-1);
          e.binancePrice=Number(last.p);e.binanceTradeTime=last.T;e.tradeAgeMs=ms-last.T;e.band=band;
          e.matches=row.direction==='up'?e.binancePrice<band.lower:e.binancePrice>band.upper;
          save(path.join(ROOT,'holdout-trades',row.id+'.json'),{url:tradeUrl,raw:trades});
        }
        save(path.join(ROOT,'holdout-candles',row.id+'.json'),{url:klineUrl,raw});
      }catch(error){if([418,429].includes(error.status))throw error;e.error=error.message;}
      result.push(e);console.log(JSON.stringify({botId,symbol:e.symbol,strategy:e.strategy,matches:e.matches,error:e.error}));
      save(path.join(ROOT,'holdout-results.json'),{hypothesesSha256:hash(fs.readFileSync(path.join(__dirname,'three-bot-hypotheses-2026-10-20.json'))),policy:'New reference IDs after initial 300-message sample. Positive-condition check only, not precision/recall. NW price independently reconstructed from Binance trades. API record time may lag trigger.',results:result});
      await new Promise(resolve=>setTimeout(resolve,1000));
    }
  }
}
async function candles(expand=false){
  const manifest=[];
  for(const botId of ['div','4sniper','hammer-pro-plus']){
    const {response}=JSON.parse(fs.readFileSync(path.join(ROOT,botId+'.json'),'utf8'));
    const rows=response.messages.map(parseMessage),byStrategy=new Map();
    for(const row of rows){const group=byStrategy.get(row.strategy)||[];group.push(row);byStrategy.set(row.strategy,group);}
    const selected=expand?rows:[...byStrategy.values()].flatMap(group=>[group[0],group.at(-1)]).filter((r,i,a)=>a.findIndex(x=>x.id===r.id)===i).slice(0,8);
    for(const row of selected){
      const intervals=expand?(botId==='div'?[row.strategy.startsWith('4H')?'4h':'1h']:botId==='4sniper'?['4h']:['1m','5m','1h']):['1h','4h','1d'];
      for(const interval of intervals){
        const eventMs=Date.parse(row.eventTime),url=`https://fapi.binance.com/fapi/v1/klines?symbol=${encodeURIComponent(row.symbol)}&interval=${interval}&endTime=${eventMs}&limit=750`;
        const file=`${row.symbol}-${interval}-${eventMs}.json`,dest=path.join(ROOT,'candles',file);let entry={botId,id:row.id,symbol:row.symbol,interval,eventTime:row.eventTime,file};
        try{
          let raw;if(fs.existsSync(dest))raw=JSON.parse(fs.readFileSync(dest,'utf8')).raw;else{raw=await getJson(url);if(!Array.isArray(raw)||raw.some(k=>!Array.isArray(k)||k.length<7))throw Error('Unexpected Binance candle schema');save(dest,{url,observedAt:new Date().toISOString(),raw});}
          entry={...entry,count:raw.length,latestClosedAt:raw.filter(k=>k[6]<eventMs).at(-1)?.[6]??null};
        }catch(e){if([418,429].includes(e.status))throw e;entry.error=e.message;}
        manifest.push(entry);console.log(JSON.stringify(entry));
      }
    }
  }save(path.join(ROOT,expand?'expanded-candle-manifest.json':'candle-manifest.json'),manifest);
}
module.exports={decodeLiteral,extractTemplates,parseMessage,closedBefore,nadaraya,ROOT};
if(require.main===module){const action=process.argv[2];Promise.resolve().then(()=>{
  if(action==='extract')return extract();if(action==='collect')return collect();if(action==='supplements')return supplements();if(action==='holdout')return holdout();if(action==='candles')return candles();if(action==='expand')return candles(true);throw Error('Use extract|collect|supplements|holdout|candles|expand');
}).catch(e=>{console.error(e.message);process.exitCode=1;});}
