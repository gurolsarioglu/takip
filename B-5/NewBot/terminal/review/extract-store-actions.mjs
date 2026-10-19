import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const file = path.join(dumpDir, '0c-qs6ywvvbwu.js');
const text = fs.readFileSync(file, 'utf8');

// Find where stats are received or updated
const idx = text.indexOf('selectedSymbolFundingRateDirection');
if (idx !== -1) {
  console.log('=== STORE ACTIONS & UPDATE METHODS ===');
  console.log(text.slice(idx, idx + 3500));
}
