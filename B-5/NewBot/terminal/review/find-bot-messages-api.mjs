import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const files = fs.readdirSync(dumpDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const text = fs.readFileSync(path.join(dumpDir, file), 'utf8');
  if (text.includes('/api/bot-messages') || text.includes('bot-messages') || text.includes('botMessages')) {
    console.log(`=== FOUND IN ${file} ===`);
    let idx = 0;
    while ((idx = text.indexOf('bot-messages', idx)) !== -1) {
      console.log('--- snippet at', idx, '---');
      console.log(text.slice(Math.max(0, idx - 400), Math.min(text.length, idx + 400)));
      idx += 12;
    }
    let idx2 = 0;
    while ((idx2 = text.indexOf('botMessages', idx2)) !== -1) {
      console.log('--- snippet at', idx2, '---');
      console.log(text.slice(Math.max(0, idx2 - 400), Math.min(text.length, idx2 + 400)));
      idx2 += 11;
    }
  }
}
