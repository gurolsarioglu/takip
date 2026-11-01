# Botlar V1

Kendi sinyal botlarımız — Visivero'dan bağımsız. 1.0.0 (30.10.2026) web · 1.1.0 (01.11.2026) Telegram.

## Botlar
M1 · M1 Premium · 4S · 4S Sniper · 1DWS · DIV · FR · V3
(Hammer ailesi V1'de yok; araştırma sürüyor.)

## Çalıştırma
1. Node.js 20+ kurulu olmalı.
2. `start-v1.bat` çift tıkla → iki pencere açılır (motor + web), tarayıcıda http://localhost:3200 açılır.
3. Motor ilk açılışta ~8 dk geçmiş veriyi yükler; sonra sinyaller akmaya başlar.

## Yapı
- `engine/` canlı motor (Binance USDⓈ-M futures, WebSocket + REST). Emir vermez.
- `rules/` bot kuralları (m1, four-s, div, flow).
- `lib/` göstergeler, ağ katmanı, tarama zamanlaması (`scan-schedule.json`).
- `web/` yerel arayüz (sadece bu bilgisayar: 127.0.0.1:3200).
- `data/` sinyal kayıtları (`data/live/signals-YYYY-MM-DD.jsonl`) ve önbellek — git'e girmez.

## Telegram (1.1.0)
- M1 Premium'un ⭐ (yıldızlı) sinyalleri, aynı coin + yön 15 dk içinde bir kez, size özel sohbete gider.
- 🟢 sinyalde Divergence 1m✅ 5m✅ varsa altına "Yorgunluk uyarısı" eklenir (31.10–01.11 ölçümü: bu sinyallerin yalnız %29'unda fiyat 60 dk sonra yukarıdaydı).
- Kurulum: Telegram'da @BotFather → /newbot → tokeni al. `telegram\ayarlar.ornek.json` dosyasını `telegram\ayarlar.json` adıyla kopyala, tokeni yapıştır. Botunuza Telegram'da /start yazın. `start-v1.bat` gönderici penceresini de açar; ilk açılışta sohbetiniz kendiliğinden bulunur.
- Deneme: `node telegram\sender.cjs --test`
- `telegram\ayarlar.json` gizlidir, git'e girmez.
