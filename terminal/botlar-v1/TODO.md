# Terminal V2 İş Takibi

**Sürüm** `1.10.0` · **Dal** `codex/terminal-v2-workspace` · **Son güncelleme** 19.11.2026

## Tamamlanan işler

1. [x] GitHub'daki `takip` reposunu `terminalV2` dizinine indirdik ve güncel terminali `terminal/botlar-v1` altında belirledik.
2. [x] Mevcut ekranı, bot akışını, gösterge hesaplarını ve sinyal arşivini inceledik. Uygulama planını hazırlayıp ekran, bot paneli, veri katmanı ve test işlerini ayırdık.
3. [x] Ekran taslağını geri bildirime göre revize ettik. Kullanıcının onayladığı düzen solda dört dik grafik, sağda izleme listesi ve hemen altında botlar.
4. [x] RSI, Stoch RSI, WaveTrend / WT Cross ve mevcut TC hesaplarını çizimden ayırdık. Dört grafiğin her biri kendi zaman diliminin mumlarını ve hesap sonuçlarını kullanıyor. Tek bir grafiğin zaman dilimini değiştirmek diğerlerini etkilemiyor.
5. [x] Yeni çizgi göstergeleri için kayıt mekanizması ekledik. Kayıtlı göstergeler **Göstergeler** menüsünde açılıp kapanabiliyor. Hatalı bir yeni gösterge diğer panellerin çizimini durdurmuyor.
6. [x] Grafikler arasına ve sağ panelin kenarına ayırıcı ekledik. Fare ve klavyeyle genişlik ayarlanabiliyor, çift tıkla varsayılana dönülüyor ve genişlikler tarayıcıda saklanıyor.
7. [x] Dokuz botu izleme listesinin altında sıraladık. Açılan botun sinyalleri tek satırda ve en yeni üstte gösteriliyor. Sembol tıklaması dört grafiği güncelliyor; **Mesaj** düğmesi orijinal metni açıyor.
8. [x] Canlı akışta gecikme göstergesini ve bağlantı sonrasında yeniden eşitlemeyi ekledik. Yoğun akışta kapasite dolduğunda en eski kartlar çıkarılıyor.
9. [x] PostgreSQL'den coin bazında son 90 güne kadar sayfalı arşiv sorgusu ekledik. Panel seçili coin ve botu kullanıyor. API ayrıca tüm botlarda coin sorgusunu ve isteğe bağlı yön filtresini destekliyor.
10. [x] 42 otomatik testi ve örnek verilerle Chromium kabulünü tamamladık. Fare ve klavye ile ayırıcı, genişliklerin korunması, zaman dilimi geçişi, WT Cross, bot seçimi ve arşiv sayfalama test edildi.
11. [x] Terminali [deneme adresinde](http://127.0.0.1:3299/terminal.html?s=ARCUSDT) çalıştırıp tarayıcıda açtık. Deneme grafikleri, bot sinyalleri ve arşiv örnek veri kullanıyor.

## Sıradaki işler

1. [ ] Bu yerel kopyanın PostgreSQL bağlantısını yapılandır.
2. [ ] Terminali canlı modda başlat. Binance grafikleri, dokuz botun akışı ve PostgreSQL arşivini gerçek verilerle doğrula.
3. [ ] Arşivde bulunan en eski ve en yeni sinyal tarihini ölç. Seçilen coin için gerçekten ne kadar geçmiş bulunduğunu kontrol et.
4. [ ] Canlı ortamda izleme listesi tercihlerini, Kasa/Karne erişimini ve bağlantı kesilip geldiğinde akışın toparlanmasını kontrol et.

## Başvuru

- [Teknik plan](docs/superpowers/plans/2026-11-19-profesyonel-terminal.md)
- [Çalıştırma ve yeni gösterge ekleme](README.md)
- [Proje günlüğü](../Takip.md)
