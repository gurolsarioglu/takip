const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dataFile = path.join(dataDir, 'bankroll.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({ initialCapital: 100, trades: [] }));

exports.getBankroll = () => {
    try {
        const raw = fs.readFileSync(dataFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            const migrated = { initialCapital: 100, trades: parsed };
            fs.writeFileSync(dataFile, JSON.stringify(migrated, null, 2));
            return migrated;
        }
        return parsed;
    } catch (e) {
        return { initialCapital: 100, trades: [] };
    }
};

exports.saveBankroll = (data) => fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
