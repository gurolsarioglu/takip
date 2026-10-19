import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const files = fs.readdirSync(dumpDir).filter(f => f.endsWith('.js'));

console.log(`Analyzing ${files.length} chunk files...`);

const keywords = [
  'bot-messages', 'botMessages', 'bot_messages',
  'watchlists', 'watchlist', 'watchlistItems',
  'symbol-stats', 'symbolStats',
  'futures', 'marketType',
  '/relay', 'wss://', 'ws://',
  'script-runtime'
];

const results = {};

for (const file of files) {
  const content = fs.readFileSync(path.join(dumpDir, file), 'utf8');
  for (const kw of keywords) {
    if (content.includes(kw)) {
      if (!results[kw]) results[kw] = [];
      results[kw].push({ file, len: content.length });
    }
  }
}

console.log('--- KEYWORD MATCHES ---');
for (const [kw, matches] of Object.entries(results)) {
  console.log(`${kw}: found in ${matches.map(m => m.file).join(', ')}`);
}
