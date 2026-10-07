# 🦁 Alpha Terminal — Proje Takip & Geliştirme Günlüğü

Bu belge, Alpha Terminal üzerinde gerçekleştirilen tüm mimari kararları, konuşulanları, alınan onayları ve yapılan teknik geliştirmeleri gün gün kayıt altında tutar.

---

# 📅 07.10.2026

## 💬 1. Konuşmalarımız ve Onaylananlar (Kullanıcı Talepleri & Kararlar)
1. **Laya Projesi İncelemesi:**
   * Kullanıcı tarafından `https://github.com/NandhaKishorM/laya.git` projesinin sistemimize uygulanabilirliği ve faydası soruldu.
   * Analiz sonucu: Laya'nın zaman serisi/fiyat analiz motoru değil, 30 ms'lik bir NLP karar motoru olduğu; şu aşamada deterministik matematiksel indikatörlerimize doğrudan gerek olmadığı açıklandı. Kullanıcı kararıyla şu an için rafa kaldırıldı.
2. **7/24 Kesintisiz Çalışma & 60 Günlük Geçmiş İhtiyacı:**
   * Kullanıcı, terminaldeki botların sadece tarayıcı açıldığında çalıştığını, tarayıcı kapalıyken 3-4 gün bakmasa dahi geçmiş sinyalleri göremediğini ve filtreleyemediğini belirtti.
   * Botların bilgisayar açık olduğu sürece arka planda 7/24 çalışması ve 2 aylık (60 gün) geriye dönük sinyal hafızası oluşturulması kararlaştırıldı.
3. **Kullanıcı Odaklı UI Tasarımı (#coin_adı Tıklama):**
   * Arayüzü karmaşık tarih dropdown butonlarıyla ("Bugün | Dün | Son 3 Gün...") doldurmak yerine; sinyal kartındaki **`#coin_adı`**na tıklandığında o coine ait son 60 günlük tüm sinyalleri listeleyen özel bir geçmiş penceresi açılması kararlaştırıldı. Kartın boşluğuna tıklama ise mevcut 1. ekran grafik kilitleme işlevini sürdürdü.
4. **Kritik Fiyat Hassasiyeti Tespiti (0.004890 Sorunu):**
   * Kullanıcı, `0.004890` gibi mikro rakamlarda basamak kırpma veya yuvarlama yapılıp yapılmadığının kontrol edilmesini istedi.
   * Kod taramasında botlarda ve ön yüzde `toFixed(4)` / `toFixed(6)` ile 6-8 basamaklı altcoinlerin son basamaklarının kırpıldığı tespit edildi ve kökten düzeltilmesi onaylandı.
5. **Otonom İcraat & İş Bitişi Otomasyonu:**
   * Kullanıcı, "Yap" komutunu verdiğinde ara adımlarda onay sorulmadan işin baştan sona bitirilmesi; iş bittiğinde ise **otomatik olarak `proje takip.md` güncellenmesi ve GitHub'a push yapılması** kuralını belirledi.

---

## 🧠 2. Düşündüklerimiz ve Mimari Kararlar
1. **Fiyat Hassasiyet Mimarisi (Tick Precision):**
   * `fikir.md` Madde 16 kuralı gereğince: *"Fiyatlar tick hassasiyetini koruyacak decimal metin olarak saklanır; yapay yuvarlama yapılamaz."*
   * Binance'ten gelen string formatındaki fiyatlar (`"0.004890"`, `"0.00001850"`, `"148.50"`) doğrudan korunacak şekilde `services/price-formatter.js` motoru inşa edildi.
2. **Veri Saklama Yeri (`data/signals_history.json`):**
   * 9 bot günde ortalama 30-100 sinyal üretir; 60 günde ~2.000 - 5.000 sinyal birikir.
   * Bu veri diskte yalnızca **~1.8 MB** yer tutar. Node.js bellek indekslemesi ile < 1 ms hızında taranır.
   * SQLite gibi harici Windows C++ derleyicisi gereksinimleri olmadan taşınabilir, güvenli ve atomik/debounced yazma yapısına karar verildi.
3. **60 Günlük Retention (Temizlik):**
   * 60 günden (60 × 24 × 3600 × 1000 ms) eski sinyaller arka planda otomatik budanır, diskin şişmesi engellenir.
4. **Kesintisiz Arka Plan (Daemon):**
   * Tarayıcı kapansa dahi Node.js sunucusunun arka planda konsol penceresiz çalışabilmesi için Windows VBScript (`start_terminal_background.vbs`) altyapısı kuruldu.

---

## 🛠️ 3. Yaptıklarımız (Teknik Geliştirmeler)
1. **Fiyat Formatlayıcı Motorları:**
   * Backend: [`services/price-formatter.js`](services/price-formatter.js)
   * Frontend: [`public/core/price-formatter.js`](public/core/price-formatter.js)
   * 9 Bot Stratejisi (`hammer-pro-plus`, `hammer-pro`, `four-s-sniper`, `four-s`, `v3-volume`, `divergence`, `m1a-drop`, `m1-premium`, `funding-rate`), `watchlist` ve `sentiment-modal` entegre edildi.
2. **60 Günlük Kalıcı Sinyal Arşiv Deposu:**
   * [`services/signal-store.service.js`](services/signal-store.service.js) oluşturuldu.
   * [`data/signals_history.json`](data/signals_history.json) dosyası oluşturuldu ve ilk sinyaller arşivlendi.
   * [`bots/base/base-bot.js`](bots/base/base-bot.js) içine kalıcı kayıt ve açılışta arşivden yükleme eklendi.
3. **Coin Geçmişi API Uç Noktası:**
   * [`bots/controllers/bot.controller.js`](bots/controllers/bot.controller.js) ve [`bots/routes/bot.routes.js`](bots/routes/bot.routes.js):
   * `GET /api/signals/coin-history?symbol=XYZ&days=60` uç noktası açıldı.
4. **Ön Yüz `#COIN` Tıklama & 60 Günlük Geçmiş Modalı:**
   * [`public/plugins/bot-hub/bot-renderer.js`](public/plugins/bot-hub/bot-renderer.js) içinde tüm bot kartlarındaki `#COIN` etiketleri tıklanabilir yapıldı.
   * [`public/plugins/bot-hub/coin-history-modal.js`](public/plugins/bot-hub/coin-history-modal.js) ve [`public/styles/terminal-pro.css`](public/styles/terminal-pro.css) modal stilleri eklendi.
   * `index.html` ve `bot-window.html` dosyalarına scriptler bağlandı.
5. **7/24 Arka Plan Başlatıcı Scriptleri:**
   * [`start_terminal_background.vbs`](start_terminal_background.vbs) (Sessiz arka plan motoru)
   * [`start_terminal_background.bat`](start_terminal_background.bat) (Tek tıkla arka planda başlatıcı)
   * [`stop_terminal.bat`](stop_terminal.bat) (Durdurucu)
   * [`check_terminal_status.bat`](check_terminal_status.bat) (Çalışma kontrolcüsü)
6. **Otonom Kural Dosyası:**
   * [`GEMINI.md`](GEMINI.md) kural dosyası güncellendi (Otonom çalışma, otomatik `proje takip.md` ve otomatik GitHub push).

---

## ✅ 4. Tamamlanan İşler ve Doğrulama
* [`review/verify-signal-store-precision.cjs`](review/verify-signal-store-precision.cjs) çalıştırıldı:
  * `0.004890`, `0.00001850` ve float fiyatların basamakları milimetrik korundu.
  * Coin geçmişi sorgulama ve istatistik üretimi doğrulandı.
* [`review/test-api-coin-history.cjs`](review/test-api-coin-history.cjs) çalıştırıldı:
  * Express sunucusu Port 3000 üzerinde ayağa kaldırıldı, `/api/signals/coin-history?symbol=SOLUSDT` çağrısı canlıda test edilip doğrulandı.
