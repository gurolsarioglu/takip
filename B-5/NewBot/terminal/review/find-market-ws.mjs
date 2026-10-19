import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const files = ['0-qg45til74n9.js', '0tn.xmt3de1nz.js'];

for (const file of files) {
  const text = fs.readFileSync(path.join(dumpDir, file), 'utf8');
  let idx = 0;
  while ((idx = text.indexOf('new WebSocket', idx)) !== -1) {
    console.log(`=== new WebSocket IN ${file} at ${idx} ===`);
    console.log(text.slice(Math.max(0, idx - 150), Math.min(text.length, idx + 450)));
    idx += 13;
  }
  let idx2 = 0;
  while ((idx2 = text.indexOf('wss://', idx2)) !== -1) {
    console.log(`=== wss:// IN ${file} at ${idx2} ===`);
    console.log(text.slice(Math.max(0, idx2 - 100), Math.min(text.length, idx2 + 250)));
    idx2 += 6;
  }
}
