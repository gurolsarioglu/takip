# 🦁 Alpha Terminal — Proje Takip & Geliştirme Günlüğü

Bu belge, Alpha Terminal üzerinde gerçekleştirilen tüm mimari kararları, konuşulanları, alınan onayları, formülleri ve yapılan teknik geliştirmeleri gün gün tek bir ana kaynak altında kayıt altında tutar.

---

## 📑 Kronolojik İçindekiler
1. [📅 07.10.2026 — 7/24 Kesintisiz Arka Plan, 60 Günlük Kalıcı Sinyal Arşivi, Hassas Fiyat Formatı (0.004890) ve #coin Geçmişi](#-07102026)
2. [📅 05.10.2026 — MVC Katmanlı Mikro-Bot Mimarisi, 9 Bot Modülerliği ve Hata Düzeltmeleri](#-05102026)
3. [📅 28.09.2026 — Multi-Bot İstasyonu, Canlı Kripto Senkronizasyonu, /api/signals/emit Entegrasyonu ve Watchlist WebSocket](#-28092026)
4. [📅 25.09.2026 — Akıllı Türev Terminali Temeli, TradingView Lightweight Charts, Akıllı Para Kokpiti ve 15 Regresyon Testi](#-25092026)

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
   * Kullanıcı, "Yap" komutunu verdiğinde ara adımlarda onay sorulmadan işin baştan sona bitirilmesi; iş bittiğinde ise **otomatik olarak `proje takip.md` güncellenmesi ve GitHub'a push yapılması** kuralını belirledi (`GEMINI.md`).
6. **Dokümantasyon Birleştirme:**
   * 25.09.2026, 28.09.2026 ve 05.10.2026 geliştirme notlarının tek bir ana takip dosyası olan `proje takip.md` altında toplanması ve eski dağınık dosyaların temizlenmesi talep edildi.

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
* **Dokümantasyon Birleştirildi ve Sadeleştirildi:**
  * Eski `05.10.2026_MVC_BOT_MIMARISI.md`, `28.09.2026.md`, `28.09.2026` ve `yapılanlar.md` (25.09) içerisindeki tüm mimari, formül, bug düzeltme ve analiz kayıtları eksiksiz olarak `proje takip.md` altında kronolojik başlıklarla birleştirildi; bu ayrı 3 dosya silinerek tüm proje tek bir ana takip dokümanına kavuşturuldu.
* **Canlı Çalıştırma & Sistem Doğrulaması:**
  * Terminal sunucusu Port 3000 üzerinde aktif başlatıldı.
  * Tüm 9 bot endpoint'i (`hammerproplus`, `hammerpro`, `4ssniper`, `4s`, `v3`, `div`, `fr`, `m1a`, `m1premium`), 741 coinlik Watchlist ve `coin-history` API uç noktası HTTP 200 ile doğrulandı.
  * `check_terminal_status.bat`, `start_terminal_background.bat` ve `stop_terminal.bat` scriptlerindeki stdin redirection ve parantez sözdizimi hataları giderildi; bağımsız çalışma teyit edildi.

---

# 📅 05.10.2026

## 💬 1. Konuşmalarımız ve Onaylananlar (Kullanıcı Talepleri & Kararlar)
1. **Monolitik Yapının Parçalanması Talebi:**
   * `terminal-server.js` dosyasının 700+ satırı aşarak sabit diziler, sinyal mantıkları ve rota kodlarıyla şiştiği, bir bota müdahale edildiğinde diğer botların veya sunucunun bozulma riski taşıdığı tespit edildi.
2. **Katmanlı ve Mikro Mimari Standartı:**
   * Her botun bağımsız bir modül/strateji haline getirilmesi, bot ekleme/çıkarma işlemlerinin sistemi etkilemeden yapılabilmesi onaylandı.
3. **Geriye Dönük %100 Uyumluluk Şartı:**
   * Ön yüzün (`bot-hub.plugin.js`) ve dış avcı botların beklediği HTTP `/api/signals` ve `/api/signals/emit` kontratlarının bozulmadan korunması kararlaştırıldı.

---

## 🧠 2. Düşündüklerimiz ve Mimari Kararlar
1. **MVC ve Katmanlı Mimari (Separation of Concerns):**
   * **Model / Base:** [`bots/base/base-bot.js`](bots/base/base-bot.js) — Tüm botların ortak veri yapısı, sinyal kuyruğu, bellek yönetimi ve ingest mantığı.
   * **Strategies:** [`bots/strategies/`](bots/strategies/) — 9 bağımsız bot modülü.
   * **Registry / Hub:** [`bots/index.js`](bots/index.js) — BotManager (Merkezi yöneticisi, takma ad/alias desteği ve akıllı yönlendirme).
   * **Controller:** [`bots/controllers/bot.controller.js`](bots/controllers/bot.controller.js) — HTTP istek/yanıt işleyicisi.
   * **Router:** [`bots/routes/bot.routes.js`](bots/routes/bot.routes.js) — Express API rotaları.
2. **Sunucu Sadeleştirmesi:**
   * `terminal-server.js` dosyasından tüm statik sinyal dizileri temizlendi; sunucu yalnızca Express middleware, proxy ve bot rotalarını barındıran temiz bir orkestratöre dönüştürüldü.
3. **Akıllı Sinyal Yönlendirme (Smart Ingestion):**
   * Dış kaynaklardan `/api/signals/emit` adresine gelen ham sinyalin içeriğine bakılarak (zaman dilimi, rsi uyumsuzluğu, botType vb.) ilgili botlara otomatik yönlendirilmesi sağlandı.

---

## 🛠️ 3. Yaptıklarımız (Teknik Geliştirmeler)

### 🤖 Entegre Edilen 9 Botun Teknik Detayları ve Dosyaları:
| # | Bot Adı | Dosya Yolu | Strateji Kodu | Ana Formül ve Kriterler |
|---|---|---|---|---|
| **1** | **Hammer Pro Plus** | [`bots/strategies/hammer-pro-plus.bot.js`](bots/strategies/hammer-pro-plus.bot.js) | `#W1` / `#S1` | `1m/5m/1h RSI <= 30` + `WT: 1m 🟢` kesişimi + Seanslık Pivot teması ($\le \%0.50$). ⭐/⭐⭐/⭐⭐⭐ Puanlama. |
| **2** | **Hammer Pro** | [`bots/strategies/hammer-pro.bot.js`](bots/strategies/hammer-pro.bot.js) | `#W1` | Klasik #W1 Dip Dönüşü. `5m/1h RSI <= 30`, `5m/1h SRSI <= 15`, `WT: 1m 🟢` yukarı kesişim, 4H EMA200 filtresi. |
| **3** | **4S Sniper** | [`bots/strategies/four-s-sniper.bot.js`](bots/strategies/four-s-sniper.bot.js) | `NW UP` | 4 Saatlikte dipten yeni yukarı dalga. `1H RSI <= 30`, `4H/1D SRSI = 0 tabanı`, Balina Long $\ge \%60$ (`🟢`). |
| **4** | **4S** | [`bots/strategies/four-s.bot.js`](bots/strategies/four-s.bot.js) | `4H STRUCTURE` | 4H Yapı & Sahte Pump Koruması. `Boost >= +6%`, `1h\|4h\|1d` Multi-RSI ve Multi-SRSI, Top Trader & Perakende Dağılımı. |
| **5** | **V3-A** | [`bots/strategies/v3-volume.bot.js`](bots/strategies/v3-volume.bot.js) | `VOLUME SURGE` | Anlık Hacim Patlaması: $\Delta Vol \% = \frac{Vol - SMA(Vol,20)}{SMA(Vol,20)} \times 100$. `+%10` ile `+%170` arası sıçramalar. |
| **6** | **Divergence (DIV)** | [`bots/strategies/divergence.bot.js`](bots/strategies/divergence.bot.js) | `1H RSI DIV` / `SMA CROSS` | Fiyat dip yaparken 1H RSI daha yüksek dip (`🟢 Boğa`) veya tepe yaparken RSI daha düşük tepe (`🔴 Ayı`). 1H RSI-SMA Kesişimi. |
| **7** | **Funding Rate (FR)** | [`bots/strategies/funding-rate.bot.js`](bots/strategies/funding-rate.bot.js) | `FUNDING SQUEEZE` | Fonlamanın $+$'dan $-$'ye geçişi (`🟢 Squeeze`), negatif fonlama derinleşmesi (`-0.26` $\rightarrow$ `-0.31`), geri sayım sayacı. |
| **8** | **M1-A** | [`bots/strategies/m1a-drop.bot.js`](bots/strategies/m1a-drop.bot.js) | `MICRO DROP` | 1 dakikalık mumda $\le -1.00\%$ ani düşüş (`🔴`), negatif hacim deltası, Stochastic $K < D$ ve BTC Normal teyidi. |
| **9** | **M1 Premium** | [`bots/strategies/m1-premium.bot.js`](bots/strategies/m1-premium.bot.js) | `MOMENTUM` | 1 dakikalık breakout pump ivmesi. Mum sıçraması `+1% ~ +3%`, `1m RSI >= 70`, `1m SRSI >= 80`, 1m Divergence teyidi. |

---

### 🛠️ Çözülen Hatalar ve Bug Kayıtları (H-20 — H-34):
| Bug Kodu | Açıklama | Çözüm Yolu |
|---|---|---|
| **H-20** | `terminal-server.js` içindeki 700+ satırlık monolitik yapının karmaşıklığı | `terminal/bots/` klasörüne MVC Model-View-Controller & Mikro-Strateji yapısına dönüştürüldü. |
| **H-21** | `hunter-15m.js` ve `hunter-1g.js` sinyallerinin `botType` eksikliği nedeniyle terminal tarafından çöpe atılması | Sinyal paketlerine `botType: '15m'` ve `botType: '1g'` eklendi; terminal `timeframe` bazlı da yakalayacak şekilde esnetildi. |
| **H-22** | `hunter-4spro.js` içinde `prevPrice` eksikliği nedeniyle `Current Price == Previous Price` çıkması | `prevPrice: prev` alanı eklenerek kartlardaki fiyat farkının doğru çıkması sağlandı. |
| **H-23** | `Trader Positioning` ve `Market Exposure` alanlarında çift emoji (`64.52% 🟢 🟢`) çıkması | Strateji ingest katmanında emoji tekilleştirildi, sunucu ve UI render'ı temizlendi. |
| **H-24** | Uyumsuzluk (Divergence) sinyallerinin 4S şartı içine hapsolarak diğer botlardan gelen DIV sinyallerinin düşmemesi | `Divergence (DIV)` bağımsız modül olarak ayrıldı; gelen her uyumsuzluk doğrudan DIV havuzuna yönlendirildi. |
| **H-25** | `hunter-15m.js` ve `hunter-1g.js` boost değerinin format uyumsuzluğu | `+Math.abs(...).toFixed(2)%` standardına bağlandı. |
| **H-26** | `Hammer Pro Plus` botunda parseFloat('+3.36%') hatası, ⭐⭐⭐ 3 yıldız algoritması eksikliği ve prevPrice eşitliği | `parseBoost`, `calculateStars` ve `prevPrice` geriye dönük hesaplama ile düzeltildi. |
| **H-27** | `Hammer Pro` (#W1) botunda ingest sırasında ema200 ve pivot alanlarının unutulması, whipsaw filtresi yokluğu | `parseBoost`, `parseDistance`, `validateReversalQuality` ve pivot/ema200 kart alanları entegre edildi. |
| **H-28** | `4S Sniper` (NW UP) botunda parseBoost/parseRatio eksikliği ve balina satıcı kontrolü eksikliği | `validateSniperReversal` (HTF dip, boost ve balina eşikleri), `parseRatioAndDot` ve ters `prevPrice` hesabı eklendi. |
| **H-29** | `4S` botunda bot-hub sabit yeşil emoji hatası, sahte pump (🔴) vs ralli (🟢) karar motoru yokluğu | `evaluate4HStructure` analiz motoru, `traderDot/exposureDot` UI entegrasyonu ve dinamik HTF alarm formatlayıcı eklendi. |
| **H-30** | `V3-A` Hacim botunda bot-hub dateLabel eksikliği, parseVolumeChange yokluğu ve 24s baz hacim format hatası | `parseVolumeChange`, `formatVolume24h`, `validateVolumeSurge` ve UI date divider & `🔥` surge badge entegre edildi. |
| **H-31** | `Divergence` botunda parseBoost/parseDistance eksikliği, çift yönlü prevPrice tersliği | `evaluateDivergence` karar motoru, çift yönlü `prevPrice` formülü, pivot mesafe formatlayıcı entegre edildi. |
| **H-32** | `FR` botunda ters dot hatası (+ to - geçişine ezbere kırmızı basılması), dinamik geri sayım yokluğu | `evaluateFundingRate` (Short Squeeze `🟢` tespiti), `calculateFundingCountdown` UTC motoru ve fark formülü eklendi. |
| **H-33** | `M1-A` botunda bot-hub dateLabel eksikliği, mikro-düşüş gürültü filtresi yokluğu | `evaluateM1A` (mikro düşüş $\le -0.75\%$), `formatStochastic` ve çift yönlü `prevPrice` formülü entegre edildi. |
| **H-34** | `M1 Premium` botunda parseBoost eksikliği, otomatik yıldız derecelendirme eksikliği | `evaluateM1Premium` (momentum eşiği $\ge +0.80\%$), otomatik yıldız (`⭐ / isFavorite`) motoru entegre edildi. |

---

## ✅ 4. Tamamlanan İşler ve Doğrulama
* `terminal/bots/` MVC mimarisi tamamlandı.
* 9 bot API endpoint'i test edilerek çalıştığı doğrulandı.
* Commit `ceacf54` ("feat(terminal): 9 Bot MVC mimarisi, quant analiz, izleme listesi ve cift ekran destegi") ile repoya gönderildi.

---

# 📅 28.09.2026

## 💬 1. Konuşmalarımız ve Onaylananlar (Kullanıcı Talepleri & Kararlar)
1. **Multi-Timeframe ve Multi-Bot Terminal Dönüşümü:**
   * Kullanıcı paylaştığı arayüz örnekleri doğrultusunda terminalin 4'lü çoklu zaman dilimli (1m, 5m, 1h, 1D) Lightweight Charts grafik kokpitine dönüştürülmesini talep etti.
2. **Kripto Senkronizasyonu & Temmuz-Ağustos Donmasının Çözülmesi:**
   * Botlarda Temmuz ve Ağustos aylarına ait statik verilerin kaldırılarak, tamamının Binance Vadeli İşlemler resmi paritelerine (`SOLUSDT`, `ETHUSDT`, `BTCUSDT`, `PEPEUSDT`, `SUIUSDT` vb.), güncel `Today` zaman damgalarına bağlanması kararlaştırıldı.
3. **Avcı Botlardan Sinyal Alma (`/api/signals/emit`):**
   * Kök dizindeki `hunter-15m.js`, `hunter-4spro.js`, `hunter-1gpro.js` gibi dış scriptlerin ürettiği sinyalleri terminale iletebilmesi için webhook uç noktası açılması onaylandı.
4. **İzleme Listesi (Watchlist) Canlılığı:**
   * İzleme listesinin donuk kalmaması, Binance WebSocket üzerinden saniyelik yeşil/kırmızı tick parlamalarıyla canlandırılması kararlaştırıldı.

---

## 🧠 2. Düşündüklerimiz ve Mimari Kararlar
1. **Arayüz Mimarisi:**
   * Sol alan: Çizim araçları (Trend, Işın, Fibo, Cetvel, Silgi).
   * Orta alan: 4'lü Senkronize Grafik Düzeni (1m, 5m, 1h, 1D) + Alt Wilder RSI(14) & SMA(14) Osilatör Paneli.
   * Sağ üst: Binance Vadeli 730+ Coin Watchlist + Seçili Coin Snapshot Kokpiti.
   * Sağ alt: Çoklu Bot İstasyonu (Dikey metalik buton şeridi: `M1-A`, `M1P`, `FR`, `🔨`, `🔨+`, `DIV`, `V3-A`, `4S`, `4SS`).
   * Alt footer: Kayan Ticker Tape (En Çok Yükselenler / Düşenler) & UTC+3 Saat.
2. **`[◫]` Derin Duyarlılık Modalı (Market Sentiment & Exposure):**
   * Seçili coine ait Order Book derinliği (B/S %), Balina Pozisyonları (L/S %), Balina Hesap Sayısı (L/S %) ve Perakende Yatırımcı Dağılımı (L/S %) 4 ayrı barda görselleştirildi.
3. **Sıfır Harici Bağımlılık (Sanitization):**
   * Hiçbir 3. parti harici siteden font, script veya stil alınmadı; tüm türev veriler doğrudan yerel Node.js proxy'si üzerinden resmi Binance API'den (`fapi.binance.com`) çekildi.

---

## 🛠️ 3. Yaptıklarımız (Teknik Geliştirmeler)
1. **POST `/api/signals/emit` Webhook Entegrasyonu:**
   * Dış botlardan gelen sinyaller yakalanarak anında ilgili botun sinyal kuyruğunun en tepesine (`unshift`) eklendi.
2. **Otomatik Canlı Sinyal Tazeleyici (Background Engine):**
   * Arka planda 60 saniyede bir Binance API'den fiyat çekerek Divergence / Reversal botlarına taze kart üreten periyodik motor kuruldu.
3. **Dinamik Rozet Sayaçları (`updateBadgeCounts`):**
   * Şeritteki buton rozetleri (`FR: 7`, `V3: 7`, `🔨: 4` vb.) gerçek sinyal sayılarıyla otomatik senkronize edildi.
4. **Watchlist WebSocket MiniTicker Akışı:**
   * `wss://stream.binance.com:9443/ws/!miniTicker@arr` bağlantısıyla 80+ coin için anlık yeşil (`.flash-up`) ve kırmızı (`.flash-down`) animasyonları entegre edildi.
5. **Alt Panel RSI(14) & SMA(14) Motoru:**
   * Wilder RSI(14) ve 14 barlık SMA hesaplayıcı yazıldı. `autoscaleInfoProvider` ile 70/50/30 seviye çizgileri ekranda sabit tutuldu; mum grafiği ile çift yönlü zaman/zoom senkronizasyonu sağlandı.
6. **Kart Saat Rengi İyileştirmesi:**
   * Sinyal kartlarının sağ alt köşesindeki saat bilgisi (`.card-footer .card-time`) okunabilirliği artırmak için parlak beyaz renge (`#ffffff`, bold) getirildi.

---

### 🔍 Kod Denetimi ve Çözülen Hatalar (H-01 — H-14):
| Kod | Sorun | Dosya | Durum |
|---|---|---|---|
| **H-01** | Çift Hammer butonu (iki buton aynı bota bağlı) | `index.html` | ✅ Düzeltildi |
| **H-02** | DIV butonu yanlış CSS sınıfı (hammer yerine div) | `index.html` | ✅ Düzeltildi |
| **H-03** | Sayfa açılışında bot başlığı yanlış (Hammer Pro yerine Hammer Pro Plus) | `index.html` | ✅ Düzeltildi |
| **H-05** | FR fundingRate `String()` null güvenlik | `bot-hub.plugin.js` | ✅ Düzeltildi |
| **H-06** | FR difference `String()` null güvenlik | `bot-hub.plugin.js` | ✅ Düzeltildi |
| **H-07** | Hammer Pro kart `s.wt` null guard eksik | `bot-hub.plugin.js` | ✅ Düzeltildi |
| **H-10** | Sayfa title tag eski adı taşıyıyordu | `index.html` | ✅ Düzeltildi |
| **H-11** | 4S Sniper date divider tekrar sorunu (hasToday → lastDate) | `bot-hub.plugin.js` | ✅ Düzeltildi |
| **H-12** | Hammer Pro Plus date divider aynı sorun | `bot-hub.plugin.js` | ✅ Düzeltildi |
| **H-14** | `test_api.ps1` gereksiz dosya repo'da | `terminal/` | ✅ Silindi |

---

## ✅ 4. Tamamlanan İşler ve Doğrulama
* Tüm 9 bot canlı endpoint testlerinden başarıyla geçti (`hammerpro: 4`, `hammerproplus: 6`, `m1premium: 4`, `m1a: 4`, `fr: 7`, `div: 6`, `v3: 7`, `4s: 6`, `4ssniper: 6`, `watchlist: 732 coin`).
* Commit `8d95de0`, `e98a27f`, `6fe91d5`, `8af3e34`, `8ed630f` ile repoya gönderildi.

---

# 📅 25.09.2026

## 💬 1. Konuşmalarımız ve Onaylananlar (Kullanıcı Talepleri & Kararlar)
1. **Alpha Terminal'in Doğuşu:**
   * Kullanıcı ile yapılan görüşmede Binance Vadeli İşlemler anlık canlı veri akışı, profesyonel grafik motoru, akıllı para analizi ve Türkçe sesli teyit spikeri içeren bağımsız bir taktik terminal ihtiyacı belirlendi.
2. **SYNUSDT Örnek Kurulumu:**
   * Vadeli türev verilerinde balinaların long biriktirdiği (`Top Trader: 1.67 -> 1.72`), perakendenin shortta kaldığı (`Global: 0.51`) ve Short Squeeze potansiyeli oluştuğu belirlendi.
   * Giriş Fiyatı: `0.21948`, Tetik: `0.2250`, Hedef: `0.26100`, Stop: `0.2120`.
3. **Eski ECharts Motorunun Kaldırılması:**
   * Yüksek frekanslı mumlarda kasan ECharts yerine Binance'in de kullandığı TradingView Lightweight Charts (v4.2.1) motorunun kurulması onaylandı.
4. **Tek Bakışta Karar Rozeti & Sesli Spiker:**
   * Sayı okuma yorgunluğuna son vermek için renkli karar rozetleri (`🟢 TUT`, `🔥 TEYİT`, `🔴 STOP`) ve Web Speech API ile Türkçe sesli spiker onaylandı.

---

## 🧠 2. Düşündüklerimiz ve Mimari Kararlar
1. **Canlı Taktik ve Teyit Motoru Durum Makinesi (`verdict.plugin.js`):**
   * Yaşam Döngüsü: `HAZIRLIK (Setup) ➔ İZLEME (Watching) ➔ TEYİT (Confirmed) ➔ HEDEF / STOP`.
2. **Akıllı Para Güç İbresi (Smart Money Index - SMI 0 to 100):**
   * Balina pozisyonları, perakende tersliği, taker emir akışı ve fonlama oranını tek bir matematiksel skora dönüştüren fütüristik ibre.
3. **Canlı Balina & Likidasyon Radarı:**
   * `${symbol}@aggTrade` ($600+ büyük işlemler) ve `${symbol}@forceOrder` (likidasyonlar) WebSocket akışlarıyla piyasanın canlı nabzı.
4. **Modüler Klasörleme:**
   * Terminal projesinin ana botlardan izole edilerek `y:\takip\B-5\NewBot\terminal` klasörüne ayrıştırılması kararlaştırıldı.

---

## 🛠️ 3. Yaptıklarımız (Teknik Geliştirmeler)

### 🛡️ Öncelikli 8 Kritik Hatanın Çözümü (H01 — H15):
| Kod | Öncelik | Sorun & Tespit | Uygulanan Kesin Çözüm | Durum |
|---|---|---|---|---|
| **H01 / H07** | **Kritik** | SYN sabit fiyatları tüm coinlere uygulanıyordu (BTC'de %38M PnL hatası) | Sabit HTML değeri kaldırıldı, coin bazlı `localStorage` hafızası bağlandı; pozisyon yoksa `⚪ POZİSYON YOK` basıldı. | ✅ BAŞARILI |
| **H02** | **Kritik** | Kanıtsız squeeze teyidi (OI %10 düşerken kırılım teyidi veriliyordu) | `oiDeltaPct` takibi eklendi; OI düşüşteyse teyit engellendi ve `⚠️ ŞÜPHELİ KIRILIM (OI DÜŞÜYOR)` uyarısı verildi. | ✅ BAŞARILI |
| **H03** | **Kritik** | Short stop kontrolü tersti (fiyat 99'a inince 110 stopu tetikleniyordu) | Seviye kontrolü çift yönlü yapıldı. Short için tetik $\le trigger$, stop $\ge stop$, hedef $\le target$ uygulandı. | ✅ BAŞARILI |
| **H04** | **Kritik** | Coinler arasında veri karışabiliyordu (eski coin yeni grafiği eziyordu) | İstek Nesil Sayacı (`generation ID`) ve aktif sembol kontrolü entegre edildi; eski REST yanıtları düşürüldü. | ✅ BAŞARILI |
| **H06** | **Yüksek** | USDT hacminde birim hatası (BTC 13.4B$ yerine 159K$ görünüyordu) | `websocket.js` 24hrTicker olayına `quoteVolume: parseFloat(msg.q)` eklendi; baz hacmin dolar formatlanması engellendi. | ✅ BAŞARILI |
| **H05** | **Yüksek** | Eksik veri normal piyasa gibi gösteriliyordu (%50 dengeli skoru) | Sembol değiştiğinde tüm alanlar sıfırlandı (`—`), geçersiz sembolde `GEÇERSİZ SEMBOL` ve `VERİ YOK` gösterildi. | ✅ BAŞARILI |
| **H11** | **Yüksek** | Pozisyon kaydı kalıcı değildi (sayfa yenilenince sıfırlanıyordu) | Kullanıcının girdiği pozisyon giriş fiyatı ve taktik seviyeler coin bazlı `localStorage`'a bağlandı. | ✅ BAŞARILI |
| **H08** | **Orta** | EMA çizgileri canlı mumla güncellenmiyordu | `ws:kline` içine `_calcLastEMAPoint` entegre edildi; `ema20Series.update()` ve `ema50Series.update()` her tickte aktı. | ✅ BAŞARILI |

---

### 🔬 İkinci İnceleme ve Takip Hatalarının Giderilmesi (D01 — D07):
| Kod | Öncelik | Kök Neden | Uygulanan Kesin Çözüm | Durum |
|---|---|---|---|---|
| **D01** | **P1** | Otomatik analizin manuel SHORT setup yönünü ezmesi | `userOverridden` bayrağı aktifken direction alanının ezilmesi engellendi. SHORT yönü ve seviyeleri korundu. | ✅ BAŞARILI |
| **D02** | **P1** | SHORT kârının eksi PnL olarak gösterilmesi | `isShort` yön kontrolü öne alındı, formül `((entry - curPrice) / entry) * 100` yapıldı (+%5.00 PnL). | ✅ BAŞARILI |
| **D03** | **P1** | Eksik OI ile teyit üretilmesi | `oiDelta === null` durumunda teyit engellendi; `SEVİYE AŞILDI (OI VERİSİ BEKLENİYOR)` getirildi. | ✅ BAŞARILI |
| **D04** | **P1** | Teyit sonrası zayıflayan verinin yorumu yenilememesi | Teyit sonrası balina çıkışı/OI erimesinde `⚠️ TEYİT SONRASI ZAYIFLAMA / PARA ÇIKIŞI` uyarısı üretildi. | ✅ BAŞARILI |
| **D05** | **P1** | Coin değişiminde eski coin çubuklarının kalması | `_clearLSBar` ve `_clearTakerBar` yazıldı; tüm çubuklar ve yüzdeler anında `—` durumuna çekildi. | ✅ BAŞARILI |
| **D06** | **P1** | Kayıtlı seviyelerin geri yüklenirken inputların boş kalması | `_fillInputValues(..., true)` ile zorunlu yazma eklendi, seviyeler inputlara ve grafiğe aktarıldı. | ✅ BAŞARILI |
| **D07** | **P2** | Fiyat kaynaklı nominal OI artışının para girişi sayılması | Kontrat adedi ile nominal değer ayrıldı; yalnız nominal artışta `⚖️ Değer Değişimi` etiketi uygulandı. | ✅ BAŞARILI |

---

### 📊 Fiyat Mumları - Hacim Çakışması ve RSI 14 / SMA 9 Eklenmesi:
* **Hacim Ölçeği:** `volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.80, bottom: 0 } })` ve mumlara `bottom: 0.25` tamponu verilerek hacim ile mumların birbirine girmesi tamamen önlendi.
* **RSI(14) & SMA(9):** TradingView standartlarında ana grafiğin altına senkronize `#rsi-pane` alt paneli kuruldu; `autoscaleInfoProvider` ile `[0, 100]` aralığına kilitlendi.

---

## ✅ 4. Tamamlanan İşler ve Doğrulama
1. **Temel Regresyon Paketi (`review/terminal-regression-tests.cjs`):**
   * **8/8 BAŞARILI** (`{ "total": 8, "passed": 8, "failed": 0 }`).
2. **Derinlemesine Takip Paketi (`review/terminal-followup-tests.cjs`):**
   * **7/7 BAŞARILI** (`{ "total": 7, "passed": 7, "failed": 0 }`).
3. **Toplam 15/15 regresyon testi eksiksiz geçti.**
4. Commit `767d2c1`, `24390db`, `b592f2e` ile terminal modüler yapısı repoya kaydedildi.
