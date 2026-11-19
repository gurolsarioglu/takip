'use strict';
// takip deposunun uzak dallarını listeler (yalnız okuma): node tools/git-ls.cjs
const { execFileSync } = require('node:child_process'), path = require('node:path');
const REPO = path.resolve(__dirname, '..', '..', '..');
const g = (...a) => { try { return execFileSync('git', a, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return 'HATA ' + e.message + (e.stderr || ''); } };
console.log(g('remote', '-v')); console.log(g('ls-remote', '--heads', 'takip')); console.log(g('branch', '-a'));
