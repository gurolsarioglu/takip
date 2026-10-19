import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const text = fs.readFileSync(path.join(dumpDir, '0ngs99aq~2c40.js'), 'utf8');

let pos = 0;
while ((pos = text.indexOf('tj', pos)) !== -1) {
  console.log('--- tj reference at', pos, '---');
  console.log(text.slice(Math.max(0, pos - 100), Math.min(text.length, pos + 250)));
  pos += 2;
}
