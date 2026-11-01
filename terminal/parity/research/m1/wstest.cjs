const url=(process.argv[2]||'wss://fstream.binance.com/market/stream')+'?streams=btcusdt@kline_1m/ethusdt@kline_1m';
const ws=new WebSocket(url); let n=0;
ws.onopen=()=>console.log('open');
ws.onmessage=ev=>{n++; if(n<3) console.log(typeof ev.data, String(ev.data).slice(0,200));};
ws.onerror=e=>console.log('error',e.message||e.type);
ws.onclose=e=>console.log('close',e.code,e.reason);
setTimeout(()=>{console.log('msgs',n);process.exit(0)},10000);
