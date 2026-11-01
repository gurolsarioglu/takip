'use strict';
const { execFileSync } = require('node:child_process'); const path = require('node:path');
const repo = path.resolve(__dirname, '..', '..', '..');
const g = (...a) => { try { return execFileSync('git', a, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64e6 }).trim(); } catch (e) { return 'ERR ' + (e.stderr || e.message); } };
console.log(g('log', '-8', '--format=%h %ad %s', '--date=short', 'takip/master'));
console.log('-- top level of takip/master:'); console.log(g('ls-tree', '--name-only', 'takip/master'));
console.log('-- terminal/ in takip/master:'); console.log(g('ls-tree', '--name-only', 'takip/master', 'terminal/'));
console.log('-- parity files count:', g('ls-tree', '-r', '--name-only', 'takip/master', 'terminal/parity/').split('\n').length);
console.log(g('ls-tree', '-r', '--name-only', 'takip/master', 'terminal/parity/').split('\n').filter(x => !x.includes('/research/')).slice(0, 80).join('\n'));
