import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const files = fs.readdirSync(dumpDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const text = fs.readFileSync(path.join(dumpDir, file), 'utf8');
  if (text.includes('noSignalsYet') || text.includes('copySuccess') || text.includes('filterRemove')) {
    console.log(`=== BOT FEED UI FOUND IN ${file} ===`);
    let idx = text.indexOf('filterRemove');
    if (idx !== -1) {
      console.log('--- filterRemove at', idx, '---');
      console.log(text.slice(Math.max(0, idx - 500), Math.min(text.length, idx + 1000)));
    }
  }
}
