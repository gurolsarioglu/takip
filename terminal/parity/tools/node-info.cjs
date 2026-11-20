'use strict';
// Node kurulumu hakkında salt okunur bilgi
const { execFileSync } = require('node:child_process');
const run = (c, a) => { try { return execFileSync(c, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60e3 }).trim(); } catch (e) { return 'HATA ' + (e.stderr || e.message).toString().slice(0, 300); } };
console.log('execPath', process.execPath, process.version);
console.log('where', run('where', ['node']));
console.log('winget', run('winget', ['--version']));
console.log('winget list', run('winget', ['list', '--id', 'OpenJS.NodeJS', '--accept-source-agreements']));
console.log('nvm', run('cmd', ['/c', 'nvm version']));
console.log('npm', run('cmd', ['/c', 'npm -v']));
