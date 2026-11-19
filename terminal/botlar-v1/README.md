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

## Veri terminali

`/terminal.html` adresinde dört grafik, sağda izleme listesi ve hemen altında botlar bulunur.
Grafiklerin arasındaki veya sağ paneldeki ayırıcıyı sürükleyerek genişlikleri ayarla. Çift tık ilgili ayarı sıfırlar.
Bir botu açtığında kendi sinyalleri en yeni üstte olacak şekilde listelenir. Sembol grafiklere, **Mesaj** orijinal metne gider.
**Arşiv**, seçili sembol ve bot için mevcut PostgreSQL kayıtlarını son 90 güne kadar sorgular.

Örnek verilerle yerel deneme: `node db/terminal-deneme.cjs`, adres `http://127.0.0.1:3299/terminal.html`.

## Terminal göstergeleri

`Göstergeler → WaveTrend / WT Cross` seçeneği dört grafikte de paneli açar.
Her grafik kendi zaman diliminin mumlarıyla hesaplanır. Açık mumun değeri ve kesişimi kapanana kadar değişebilir.

Yeni bir çizgi göstergesi için `web/public/terminal-indicators.js` dosyasında mevcut kayıtların yanına bir `registry.register(...)` tanımı ekle.
`id` benzersiz olmalı. Yerleşik göstergelerin ve piyasa verisi panellerinin kimlikleri korunur.
`panel` alanı menü adını, çizgi renklerini ve ölçeği tanımlar. `calculate(rows, { interval })` ise
en eskiden en yeniye sıralı `[zaman, açılış, en yüksek, en düşük, kapanış, USDT hacmi]` satırlarından hesap yapar.
`series` her mumla aynı sırada ve uzunlukta bir veya iki çizgi döndürür. Isınma dönemi için `NaN` kullan.
İki çizgili paneller isteğe bağlı `marks` dizisiyle ikinci çizgiyi işaretleyebilir: yukarı `1`, aşağı `-1`, işaret yok `0`.
Kayıt sayfa açılırken menüye eklenir ve varsayılan olarak kapalı gelir. Örnek tanım:

```js
registry.register({
  id: 'ema-ornek',
  panel: { label: 'EMA 20', range: 'auto', colors: [['#e0b585', '#212121']] },
  calculate(rows) {
    const closes = rows.map(row => row[4]);
    return { series: [TA.ema(closes, 20)] };
  }
});
```

Ağsız doğrulama: `node --test db/test-indicator-engine.cjs`.

## Gizli dosyalar (git'e girmez, paylaşılmaz)
`db\baglanti.json` (veritabanı şifresi) · `telegram\ayarlar.json` (Telegram tokeni; gönderici şu an kapalı)
