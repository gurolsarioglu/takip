'use strict';
// Parçalı yeniden yazıya dökme (uzun videoda whisper'ın "Abone olmayı unutmayın" döngüsüne girmesine karşı): her parça bağımsız, -mc 0.
const fs = require('node:fs'); const path = require('node:path'); const { spawnSync } = require('node:child_process');
const TOOLS = path.resolve(__dirname, '..', '..', '..', 'araclar'); const DIR = path.resolve(__dirname, '..', '..', 'video', 'parca');
const exe = path.join(TOOLS, 'whisper', 'Release', 'whisper-cli.exe'); const model = path.join(TOOLS, 'ggml-small.bin');
const threads = String(Math.max(1, require('node:os').cpus().length - 1));
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.wav')).sort()) {
  const base = path.join(DIR, f.replace(/\.wav$/, ''));
  if (fs.existsSync(base + '.txt')) continue;
  console.log('parça', f);
  spawnSync(exe, ['-m', model, '-f', path.join(DIR, f), '-l', 'tr', '-t', threads, '-mc', '0', '-otxt', '-osrt', '-of', base], { stdio: 'inherit', windowsHide: true });
}
console.log('HEPSI BITTI');
