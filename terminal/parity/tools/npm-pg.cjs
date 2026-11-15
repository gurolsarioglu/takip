'use strict';
const path = require('node:path'), { execSync } = require('node:child_process');
const V1 = path.resolve(__dirname, '..', '..', 'botlar-v1');
console.log(execSync('npm install pg@8 --no-audit --no-fund --save', { cwd: V1, encoding: 'utf8', shell: true }));
console.log(execSync('npm ls pg', { cwd: V1, encoding: 'utf8', shell: true }));
