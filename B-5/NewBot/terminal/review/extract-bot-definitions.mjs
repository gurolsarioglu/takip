import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const file = path.join(dumpDir, '0ebhj~2v72qsx.js');
const text = fs.readFileSync(file, 'utf8');

// Find index of "Multi-angle view"
const idx = text.indexOf('Multi-angle view');
if (idx !== -1) {
  const start = Math.max(0, idx - 1000);
  const end = Math.min(text.length, idx + 1000);
  console.log('=== BOT STRATEGY STRINGS & DESCRIPTIONS ===\n');
  console.log(text.slice(start, end));
} else {
  console.log('Not found');
}
