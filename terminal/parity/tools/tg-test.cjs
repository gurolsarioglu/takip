'use strict';
// Tek deneme mesajı (gönderici döngüsü başlatmadan).
const fs = require('node:fs'), path = require('node:path');
const cfg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'botlar-v1', 'telegram', 'ayarlar.json'), 'utf8'));
fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ chat_id: cfg.chatId, text: '✅ Botlar V1.1 Telegram bağlantısı çalışıyor.\nM1 Premium ⭐ sinyalleri (aynı coin+yön 15 dk\'da bir) buraya gelecek. 🟢 + 1m✅5m✅ sinyallerde "Yorgunluk uyarısı" eklenir.' }) })
  .then(r => r.json()).then(j => console.log(j.ok ? 'gönderildi' : 'hata: ' + j.description));
