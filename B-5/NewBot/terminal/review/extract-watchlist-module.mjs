import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const file = path.join(dumpDir, '0c-qs6ywvvbwu.js');
const text = fs.readFileSync(file, 'utf8');

// Let's print the entire 862855 module or search for column renderers
const idx = text.indexOf('862855');
if (idx !== -1) {
  console.log('=== MODULE 862855 AND BEYOND ===');
  console.log(text.slice(idx, idx + 4000));
}
