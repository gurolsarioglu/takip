'use strict';
// Botlar V1 testlerini verilen node.exe ile çalıştırır + bütün .cjs dosyalarında sözdizimi denetimi. Servislere dokunmaz.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const EXE = process.argv[2], V1 = path.resolve(__dirname, '..', '..', 'botlar-v1');
const run = (args, env) => spawnSync(EXE, args, { cwd: V1, encoding: 'utf8', timeout: 300e3, env: { ...process.env, ...env } });
console.log('node', run(['-v']).stdout.trim());
let bad = 0;
for (const [args, env] of [[['db/test-terminal.cjs']], [['db/test-fr-kurulum.cjs']],
  [['--test', 'db/test-indicator-engine.cjs', 'db/test-signal-archive.cjs', 'db/test-signal-feed.cjs', 'db/test-signal-panel.cjs', 'db/test-workspace-layout.cjs', 'db/test-coingecko.cjs']],
  [['--test', 'db/test-workspace-browser.cjs'], { TERMINAL_PLAYWRIGHT: '' }]]) {
  const r = run(args, env || {}), out = (r.stdout + r.stderr);
  const sum = out.split('\n').filter(l => /^# (tests|pass|fail)|hepsi|HATA |not ok|Error/.test(l)).slice(0, 8).join(' | ');
  console.log(r.status === 0 ? 'GEÇTİ' : 'KALDI(' + r.status + ')', args.join(' '), '→', sum || out.slice(-300));
  if (r.status !== 0) bad++;
}
const files = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (['node_modules', 'data', 'parity'].includes(e.name)) continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(c?js)$/.test(e.name)) files.push(p); } })(V1);
let syn = 0; for (const f of files) { const r = run(['--check', f]); if (r.status !== 0) { syn++; console.log('SÖZDİZİMİ', f, r.stderr.slice(0, 200)); } }
console.log('sözdizimi denetimi', files.length, 'dosya,', syn, 'hata');
const load = run(['-e', "require('pg'); console.log('pg', require('pg/package.json').version)"]); console.log(load.stdout.trim() || load.stderr.slice(0, 300));
process.exitCode = bad + syn ? 1 : 0;
