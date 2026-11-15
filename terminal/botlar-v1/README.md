# Botlar V1

Kendi sinyal botlarımız — Binance USDⓈ-M vadeli, tamamen yerel, emir vermez. Site: http://localhost:3200

Ayrıntılı teknik rehber (mimari, bot kuralları, veritabanı, geliştirme kuralları): **AGENTS.md**
Tarihli proje günlüğü: `..\Takip.md`

## Botlar
M1 · M1 Premium · 4S · 4S Sniper · 1DWS · DIV · FR · V3 · Hammer

## Çalıştırma
- Kurulum bir kez: `servis\servis-kur.bat` (yönetici onayı ister). Sonrasında her şey Windows açılışında kendiliğinden başlar:
  PostgreSQL servisi **BotlarPostgres** + görev **Botlar V1 Denetci** (motor, web, veritabanı yazıcısı, mum toplayıcı, karne).
- `start-v1.bat`: sistem çalışıyorsa yalnızca siteyi açar. (Servis kurulu değilse motor + web'i elle başlatır.)
- Motor açılışta ~13 dk geçmiş veriyi yükler; sonra sinyaller akar.
- Bilgisayar **uykuya** geçerse her şey durur: güç ayarında "takılıyken uyku: hiçbir zaman" olmalı.

## Klasörler
- `engine\` canlı motor · `rules\` bot kuralları · `lib\` göstergeler ve yardımcılar
- `web\` yerel arayüz (yalnız 127.0.0.1:3200) · `db\` veritabanı betikleri ve araştırma · `servis\` otomatik başlatma
- `data\` sinyal kayıtları (`data\live\signals-YYYY-AA-GG.jsonl`, asıl kayıt), veritabanı, yedekler, loglar — git'e girmez

## İşletme
- Bir parçayı yeniden başlat: `data\kontrol\<motor|web|yazici|mumlar|karne>.yeniden` adında boş dosya oluştur.
- Durum: `data\denetci.json`, `data\live\status.json` · Loglar: `data\log\` · Gece 03:30 yedeği: `data\yedek\` (son 7 gün).
- Kural dosyası (`rules\*.cjs`) değişikliği yeniden başlatma gerektirmez (15 sn içinde yüklenir).

## Gizli dosyalar (git'e girmez, paylaşılmaz)
`db\baglanti.json` (veritabanı şifresi) · `telegram\ayarlar.json` (Telegram tokeni; gönderici şu an kapalı)
