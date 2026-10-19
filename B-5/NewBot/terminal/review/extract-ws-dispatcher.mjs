import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const text = fs.readFileSync(path.join(dumpDir, '0ngs99aq~2c40.js'), 'utf8');

const pos = 87000;
console.log('=== WEBSOCKET DISPATCHER IMPLEMENTATION ===');
console.log(text.slice(pos, pos + 4000));
