import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const text = fs.readFileSync(path.join(dumpDir, '0ngs99aq~2c40.js'), 'utf8');

// Find tx array
const idx = text.indexOf('botAvatar:"/bot_logos/m1-a.png"');
if (idx !== -1) {
  console.log('=== ALL BOTS IN VISIVERO TERMINAL ===');
  console.log(text.slice(Math.max(0, idx - 200), Math.min(text.length, idx + 2500)));
}

// Find bot-messages API call and message structure
const idxApi = text.indexOf('/api/bot-messages');
if (idxApi !== -1) {
  console.log('\n=== BOT-MESSAGES API & QUERY PARAMS ===');
  console.log(text.slice(Math.max(0, idxApi - 600), Math.min(text.length, idxApi + 1200)));
}
