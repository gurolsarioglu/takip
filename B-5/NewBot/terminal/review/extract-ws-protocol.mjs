import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const text = fs.readFileSync(path.join(dumpDir, '0ngs99aq~2c40.js'), 'utf8');

const idx = text.indexOf('bots.visivero.com/ws');
if (idx !== -1) {
  console.log('=== WEBSOCKET HANDLERS & MESSAGES ===');
  console.log(text.slice(Math.max(0, idx - 500), Math.min(text.length, idx + 2500)));
}
