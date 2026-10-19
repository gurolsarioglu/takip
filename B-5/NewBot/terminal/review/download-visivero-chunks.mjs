import fs from 'node:fs';
import path from 'node:path';

const baseUrl = 'https://terminal.visivero.com';
const chunks = [
  '/_next/static/chunks/09aj4ipdnjv41.js',
  '/_next/static/chunks/10kml_7zp3l_y.js',
  '/_next/static/chunks/124t_zb4dh19x.js',
  '/_next/static/chunks/0ebhj~2v72qsx.js',
  '/_next/static/chunks/0c6kb65vwqfg7.js',
  '/_next/static/chunks/11atmmi-3v_a2.js',
  '/_next/static/chunks/00g2t30sqmqyo.js',
  '/_next/static/chunks/08928gpq9w_3_.js',
  '/_next/static/chunks/02.9l4i0~djev.js',
  '/_next/static/chunks/0vfct04nbeto-.js',
  '/_next/static/chunks/0vanlyn_z_~38.js',
  '/_next/static/chunks/11ve5d1u9vo2o.js',
  '/_next/static/chunks/0e8.n96mwjl3r.js',
  '/_next/static/chunks/0rns8bwo4dafs.js',
  '/_next/static/chunks/0vqgpe-qazyfp.js',
  '/_next/static/chunks/0-0orkhd006iu.js',
  '/_next/static/chunks/0bc4eg_9jock9.js',
  '/_next/static/chunks/turbopack-165r4_sfw2zc4.js',
  '/_next/static/chunks/0c-qs6ywvvbwu.js',
  '/_next/static/chunks/0onmy6fl5krgf.js',
  '/_next/static/chunks/0z292459-4-nj.js',
  '/_next/static/chunks/turbopack-09u6-xcqk.h90.js',
  '/_next/static/JJLFOCvWHd72O-eAKWbkW/_buildManifest.js'
];

const outDir = path.resolve('review/visivero_dump');
fs.mkdirSync(outDir, { recursive: true });

console.log('Downloading chunks...');
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

console.log('Download complete.');
