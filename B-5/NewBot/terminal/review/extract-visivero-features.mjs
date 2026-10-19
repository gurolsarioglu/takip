import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');

function extractContexts(filename, regex, maxMatches = 15, radius = 250) {
  const filePath = path.join(dumpDir, filename);
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8');
  const matches = [];
  let m;
  while ((m = regex.exec(text)) !== null && matches.length < maxMatches) {
    const start = Math.max(0, m.index - radius);
    const end = Math.min(text.length, m.index + m[0].length + radius);
    matches.push(text.slice(start, end));
  }
  return matches;
}

console.log('=== 1. WATCHLIST COMPONENT (0c-qs6ywvvbwu.js) ===');
const wlSnippets = extractContexts('0c-qs6ywvvbwu.js', /watchlist|futures|fundingrate/gi, 8, 300);
wlSnippets.forEach((s, i) => console.log(`--- WL Snippet ${i + 1} ---\n${s}\n`));

console.log('=== 2. BOT TERMINAL COMPONENT (02.9l4i0~djev.js) ===');
const botSnippets = extractContexts('02.9l4i0~djev.js', /bot|bot-messages|signal/gi, 8, 300);
botSnippets.forEach((s, i) => console.log(`--- Bot Snippet ${i + 1} ---\n${s}\n`));

console.log('=== 3. MARKET / DATA INTEGRATION (0ebhj~2v72qsx.js) ===');
const dataSnippets = extractContexts('0ebhj~2v72qsx.js', /openinterest|fundingrate|relay|watchlist/gi, 8, 300);
dataSnippets.forEach((s, i) => console.log(`--- Data Snippet ${i + 1} ---\n${s}\n`));
