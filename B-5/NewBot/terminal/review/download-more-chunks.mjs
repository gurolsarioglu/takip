import fs from 'node:fs';
import path from 'node:path';

const baseUrl = 'https://terminal.visivero.com';
const extraChunks = [
  '/_next/static/chunks/072yrq~3k8~~v.js',
  '/_next/static/chunks/0gybh9h1ew-~e.js',
  '/_next/static/chunks/0rheo2u.gqobz.js',
  '/_next/static/chunks/0ajt~q9s6c.98.js',
  '/_next/static/chunks/14p5e_jdbkq7a.js',
  '/_next/static/chunks/0e-q7oc3f4ccq.js'
];

const outDir = path.resolve('review/visivero_dump');

for (const rel of extraChunks) {
  const filename = path.basename(rel);
  const target = path.join(outDir, filename);
  try {
    const res = await fetch(baseUrl + rel, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.ok) {
      const text = await res.text();
      fs.writeFileSync(target, text, 'utf8');
      console.log(`[OK] ${filename} (${text.length} bytes)`);
    } else {
      console.log(`[ERR ${res.status}] ${rel}`);
    }
  } catch (err) {
    console.log(`[FAIL] ${rel}: ${err.message}`);
  }
}
