const { spawn } = require('child_process');
const path = require('path');

const bots = [
    'hammer-new.js',
    'hunter-1m.js',
    'hunter-5m.js',
    'hunter-15m.js',
    'hunter-1h.js',
    'hunter-4h.js',
    'hunter-fr.js',
    'hunter-rsi-div.js',
    'hunter-detay-1d.js'
];

console.log('⚡ Starting all bots under single manager...');

bots.forEach(bot => {
    console.log(`[MANAGER] Starting bot: ${bot}`);
    const child = spawn('node', [bot], {
        cwd: __dirname,
        stdio: 'inherit'
    });

    child.on('error', (err) => {
        console.error(`[MANAGER] Error starting ${bot}:`, err.message);
    });

    child.on('exit', (code, signal) => {
        console.log(`[MANAGER] Bot ${bot} exited with code ${code} (signal: ${signal})`);
    });
});
