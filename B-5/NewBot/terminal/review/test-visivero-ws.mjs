import WebSocket from 'ws';

console.log('Connecting to wss://bots.visivero.com/ws ...');
const ws = new WebSocket('wss://bots.visivero.com/ws', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://terminal.visivero.com'
  }
});

const timer = setTimeout(() => {
  console.log('Timeout 10s reached, closing...');
  ws.close();
  process.exit(0);
}, 10000);

ws.on('open', () => {
  console.log('>>> [CONNECTED] WebSocket connection established successfully to wss://bots.visivero.com/ws!');
});

ws.on('message', (data) => {
  console.log('<<< [MSG RECEIVED]:', data.toString().slice(0, 300));
});

ws.on('error', (err) => {
  console.error('>>> [WS ERROR]:', err.message);
});

ws.on('close', (code, reason) => {
  console.log(`>>> [CLOSED] code: ${code}, reason: ${reason.toString()}`);
  clearTimeout(timer);
  process.exit(0);
});
