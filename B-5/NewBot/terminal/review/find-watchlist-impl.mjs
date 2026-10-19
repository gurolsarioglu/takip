import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const files = fs.readdirSync(dumpDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const text = fs.readFileSync(path.join(dumpDir, file), 'utf8');
  if (text.includes('fundingRateHour') || text.includes('longShortPositions') || text.includes('marketExposure')) {
    console.log(`=== WATCHLIST CODE FOUND IN ${file} ===`);
    let idx = text.indexOf('marketExposure');
    console.log(text.slice(Math.max(0, idx - 500), Math.min(text.length, idx + 500)));
  }
}
