'use strict';
// whisper.cpp ile Türkçe yazıya dökme: node tools/video-yazi.cjs <wav-dosyası> [model]
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const TOOLS = path.resolve(__dirname, '..', '..', '..', 'araclar');
const wav = path.resolve(process.argv[2]); const model = path.join(TOOLS, process.argv[3] || 'ggml-small.bin');
const find = (d, re) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { const r = find(p, re); if (r) return r; } else if (re.test(f.name)) return p; } return null; };
const exe = find(path.join(TOOLS, 'whisper'), /^whisper-cli\.exe$/i) || find(path.join(TOOLS, 'whisper'), /^main\.exe$/i);
if (!exe) { console.error('whisper-cli.exe yok'); process.exit(1); }
const threads = String(Math.max(1, require('node:os').cpus().length - 1));
console.log('exe', exe, 'threads', threads, 'model', model);
const p = spawn(exe, ['-m', model, '-f', wav, '-l', 'tr', '-t', threads, '-otxt', '-osrt', '-of', wav.replace(/\.wav$/i, ''), '-pp'], { stdio: 'inherit', windowsHide: true });
p.on('exit', c => { console.log('BITTI kod', c); process.exit(c || 0); });
