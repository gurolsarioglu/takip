const { execSync } = require('node:child_process');
console.log(execSync('netstat -ano -p tcp', { encoding: 'utf8' }).split('\n').filter(l => l.includes(':3200')).join('\n'));
