'use strict';
const { execFileSync } = require('node:child_process'); const path = require('node:path');
const repo = path.resolve(__dirname, '..', '..', '..');
const g = (...a) => { try { return execFileSync('git', a, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return 'ERR ' + (e.stderr || e.message); } };
console.log('ls-remote takip:', g('ls-remote', '--heads', 'takip'));
console.log('fetch:', g('fetch', 'takip'));
console.log('branches:', g('branch', '-a'));
console.log('ahead/behind master vs takip/master:', g('rev-list', '--left-right', '--count', 'master...takip/master'));
console.log('ahead/behind master vs takip/main:', g('rev-list', '--left-right', '--count', 'master...takip/main'));
