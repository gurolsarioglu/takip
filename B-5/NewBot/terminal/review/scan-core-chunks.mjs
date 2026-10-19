import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const newFiles = [
  '0tn.xmt3de1nz.js', '0kdh.7crrzg8r.js', '0zenisknzfb~0.js',
  '148tqb7q6z7c..js', '17xiwl6zp_0mg.js', '0arbzw4ijp6ea.js',
  '0ngs99aq~2c40.js', '0-qg45til74n9.js', '104ckgkwz.c4k.js'
];

const keywords = ['bot-messages', 'botMessages', 'channelDescriptions', 'goToFutures', 'botFeed', 'watchlist', 'fundingRate'];

for (const file of newFiles) {
  const text = fs.readFileSync(path.join(dumpDir, file), 'utf8');
  for (const kw of keywords) {
    if (text.includes(kw)) {
      console.log(`[${kw}] found in ${file}`);
      let idx = text.indexOf(kw);
      console.log('   Preview:', text.slice(Math.max(0, idx - 150), Math.min(text.length, idx + 250)));
    }
  }
}
