import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const text = fs.readFileSync(path.join(dumpDir, '0ngs99aq~2c40.js'), 'utf8');

let idx = text.indexOf('script-runtime/templates');
if (idx !== -1) {
  console.log(text.slice(Math.max(0, idx - 400), Math.min(text.length, idx + 1500)));
} else {
  console.log('not found');
}
