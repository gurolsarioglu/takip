import fs from 'node:fs';
import path from 'node:path';

const baseUrl = 'https://terminal.visivero.com';
const chunks = [
  '/_next/static/chunks/0tn.xmt3de1nz.js',
  '/_next/static/chunks/0kdh.7crrzg8r.js',
  '/_next/static/chunks/0zenisknzfb~0.js',
  '/_next/static/chunks/148tqb7q6z7c..js',
  '/_next/static/chunks/17xiwl6zp_0mg.js',
  '/_next/static/chunks/0arbzw4ijp6ea.js',
  '/_next/static/chunks/0ngs99aq~2c40.js',
  '/_next/static/chunks/0-qg45til74n9.js',
  '/_next/static/chunks/104ckgkwz.c4k.js',
  '/_next/static/chunks/turbopack-0zqbac51~-ek6.js'
];

const outDir = path.resolve('review/visivero_dump');

for (const rel of chunks) {
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
