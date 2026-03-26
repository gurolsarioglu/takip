const fs = require('fs');
let content = fs.readFileSync('./frontend/js/watchlist.js', 'utf8');

// Replace string literal sequence "\`" with "`"
content = content.replace(/\\`/g, '`');

// Replace string literal sequence "\$" with "$"
content = content.replace(/\\\$/g, '$');

fs.writeFileSync('./frontend/js/watchlist.js', content);
console.log('Fixed syntax in watchlist.js');
