import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const files = fs.readdirSync(dumpDir).filter(f => f.endsWith('.js'));

// Case insensitive search for bot, signal, watchlist, futures, screener, columns
const terms = ['watchlist', 'futures', 'bot', 'signal', 'screener', 'openinterest', 'fundingrate', 'relay', 'socket'];

for (const term of terms) {
  const re = new RegExp(term, 'gi');
  const found = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(dumpDir, file), 'utf8');
    const count = (text.match(re) || []).length;
    if (count > 0) {
      found.push(`${file} (${count})`);
    }
  }
  console.log(`[${term}] -> ${found.join(', ')}`);
}
