'use strict';
const { execFileSync } = require('node:child_process'); const path = require('node:path');
const repo = path.resolve(__dirname, '..', '..', '..'); // C:\projeler\newbot
const g = (...a) => { try { return execFileSync('git', a, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return 'ERR ' + (e.stderr || e.message); } };
console.log('repo', repo);
console.log('remote:', g('remote', '-v'));
console.log('branch:', g('branch', '--show-current'));
console.log('last:', g('log', '-3', '--oneline'));
const st = g('status', '--porcelain', '--untracked-files=normal');
console.log('status lines:', st.split('\n').length); console.log(st.split('\n').slice(0, 60).join('\n'));
