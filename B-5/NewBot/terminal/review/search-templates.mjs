import fs from 'node:fs';
import path from 'node:path';

const dumpDir = path.resolve('review/visivero_dump');
const files = fs.readdirSync(dumpDir).filter(f => f.endsWith('.js'));

console.log('Searching for script-runtime templates and indicator formulas...');

for (const file of files) {
  const text = fs.readFileSync(path.join(dumpDir, file), 'utf8');
  if (text.includes('/api/script-runtime/templates') || text.includes('templates') && text.includes('script-runtime')) {
    console.log(`=== FOUND TEMPLATES REFERENCE IN ${file} ===`);
    let idx = text.indexOf('/api/script-runtime/templates');
    if (idx !== -1) {
      console.log(text.slice(Math.max(0, idx - 400), Math.min(text.length, idx + 800)));
    }
  }
}
