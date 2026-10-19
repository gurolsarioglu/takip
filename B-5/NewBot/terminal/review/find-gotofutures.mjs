import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const files = fs.readdirSync(dumpDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const text = fs.readFileSync(path.join(dumpDir, file), 'utf8');
  if (text.includes('goToFutures')) {
    console.log(`=== goToFutures FOUND IN ${file} ===`);
    let idx = 0;
    while ((idx = text.indexOf('goToFutures', idx)) !== -1) {
      console.log('--- at', idx, '---');
      console.log(text.slice(Math.max(0, idx - 300), Math.min(text.length, idx + 400)));
      idx += 11;
    }
  }
}
