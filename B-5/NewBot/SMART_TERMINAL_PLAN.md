# 🚀 Smart Money & Futures Veri Terminali (Proje Planı & Mimari Şema)

> **Tarih:** 23 Eylül 2026  
> **Proje:** NewBot Suite - Smart Futures Terminal  
> **Konum:** `y:\takip\B-5\NewBot\SMART_TERMINAL_PLAN.md`

---

## 📌 1. Projenin Amacı ve Temel Çözümü

### Yaşanan Temel Sorun:
* Telegram botlarımızdan (`hunter-15m`, `hunter-4spro`, `hunter-1gpro`) sinyal geldiğinde, grafiğe baktığımızda fiyatın gerçekten dönüp dönmeyeceğini, **balinanın içeride olup olmadığını** veya **küçük yatırımcının terste kalıp kalmadığını** göremiyoruz.
* Binance arayüzünde ise **Fiyat Grafiği** bir sekmede, **Vadeli Veriler (Data)** başka bir sekmede dağınık duruyor; ikisini aynı anda tek ekranda analiz etmek çok zor ve yavaş.
* Sonuç: Terste kalma, kârı zamanında alamama veya düşen bıçağı tutma riski.

### Geliştirilecek Çözüm:
Telegram'dan bir sinyal düştüğünde (örneğin `#TAKEUSDT`), tek tıkla veya arama kutusuna yazarak açabileceğimiz;
1. **TradingView Hızında Mum Grafiği** (ve 5 adede kadar seçilebilir indikatör: RSI, EMA'lar, Bollinger, MACD, Volume),
2. **Akıllı Para (Smart Money) Panelleri** (Balina Pozisyonları, Hesap Dağılımı, Perakende Oranı, Taker Hacmi),
3. **Dinamik Renkli Barlar** (İlk bakışta % Long / % Short dengesini gösteren yeşil-kırmızı ilerleme çubukları),
4. **Open Interest (Açık Pozisyon) Delta Sayacı** (Seçilen zaman diliminde örneğin: *"Son 15dk: -5.8M TAKE (%-6.2) Azaldı 🔻"* uyarısı),
5. **Dakikalık Funding Rate (Fonlama) Hız Takipçisi**,
6. **Otomatik Algoritmik Teşhis Şeridi (Live Verdict):** Tüm bu verileri anlık sentezleyip Türkçe taktik veren akıllı yorum kutusu (örn: *"🚨 Balinalar Long'u sıfırladı, OI eridi! 0.190 desteği kırılırsa sert düşüş beklenir!"*).

---

## 🖥️ 2. Terminal Ekran Düzeni (UI Wireframe / Şema)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🦁 ALPHA TERMINAL | [ Coin Ara: TAKEUSDT ▼ ]  [ 1m | 5m | 15m | 30m | 1h | 4h | 1d ]  ● CANLI  │
├──────────────────────────────────────────────────────────────────┬───────────────────────────────┤
│                                                                  │ 🐳 TOP TRADER (POSITIONS)     │
│  📈 FİYAT GRAFİĞİ (TradingView Lightweight 60 FPS)              │ ───────────────────────────── │
│  TAKEUSDT • 0.1950 • % +225.30                                   │ 1.03 [====== 51% | 49% ======]│
│  [ Göstergeler: [x] EMA 20/50  [x] RSI  [x] BB  [ ] MACD ]       │ (Balina Long/Short Parite)    │
│                                                                  ├───────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐  │ 👥 TOP TRADER (ACCOUNTS)      │
│  │                                                            │  │ ───────────────────────────── │
│  │    /\  /\                                                  │  │ 0.62 [=== 38% | 62% =======] │
│  │   /  \/  \    [Candlestick Bars + EMAs]                    │  │ (Elit Hesapların Çoğu Short)  │
│  │  /        \                                                │  ├───────────────────────────────┤
│  │                                                            │  │ 🌐 GLOBAL L/S (PERAKENDE)     │
│  └────────────────────────────────────────────────────────────┘  │ ───────────────────────────── │
│  [ RSI (14): 64.2 ]                                              │ 0.66 [=== 40% | 60% =======] │
│  [ Hacim Barları ]                                               │ (Küçük Yatırımcı Terste)      │
├──────────────────────────────────────────────────────────────────┴───────────────────────────────┤
│ 📊 SMART MONEY & VADELİ METRİKLER GRİDİ                                                          │
├─────────────────────────┬─────────────────────────┬─────────────────────────┬────────────────────┤
│ 💰 OPEN INTEREST (OI)   │ ⚡ TAKER BUY/SELL       │ ⏳ FUNDING RATE         │ ⚖️ OI / MARKET CAP │
│ 74.6M TAKE ($14.5M)     │ 0.89 🔴 Satıcı Baskısı   │ -0.4204% (Aşırı Eksi)   │ %21.00             │
│ Δ 15dk: -6.2M (%-7.8)🔻 │ Alış: 47% | Satış: 53%  │ Sıradaki: 01:42:15      │ Trend: Düşüyor 🔻 │
│ Durum: Para Çıkışı Var! │ Agresif alıcılar bitti  │ Shortlar prim ödüyor    │ Balina dağıtımı    │
├─────────────────────────┴─────────────────────────┴─────────────────────────┴────────────────────┤
│ 🤖 ALGORİTMİK CANLI TEŞHİS & TAKTİK MERKEZİ (LIVE VERDICT):                                      │
│ ⚠️ DİKKAT: Zirveden bu yana OI %38 eridi ve Balina Long üstünlüğü 1.03'e çöktü! Fiyat yatayda     │
│ oyalanırken balinalar malı dağıttı. 0.190 desteği kırılırsa sert short dalgası başlayabilir!    │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ 3. Teknik Mimari ve Kullanılacak Teknolojiler

1. **Grafik Motoru:** 
   - `Lightweight Charts (TradingView)`: Resmi açık kaynak, sıfır gecikmeli, 60fps çalışan kütüphane.
2. **Frontend:** 
   - Saf HTML5, Vanilla JavaScript (ultra hafif ve hızlı), modern Dark Glassmorphism CSS.
   - Binance renk paleti: Koyu tema (`#0b0e11`), Kripto Yeşili (`#0ecb81`), Kripto Kırmızısı (`#f6465d`), Altın Sarısı (`#f0b90b`).
3. **Backend / API Bağlantısı:**
   - Hafif yerel Node.js sunucusu (`terminal-server.js`) veya doğrudan tarayıcıdan Binance Public API'lerine (`fapi.binance.com`) istek.
   - Saniyede 1 canlı kline ve WebSocket güncellemesi.
4. **Veri Uç Noktaları (Endpoints):**
   - Fiyat & Mumlar: `GET /fapi/v1/klines` & WebSocket `@kline`
   - Açık Pozisyon: `GET /futures/data/openInterestHist` & `/fapi/v1/openInterest`
   - Balina Oranları: `GET /futures/data/topLongShortPositionRatio` & `topLongShortAccountRatio`
   - Perakende Oranı: `GET /futures/data/globalLongShortAccountRatio`
   - Taker Hacim: `GET /futures/data/takerlongshortRatio`
   - Fonlama Oranı: `GET /fapi/v1/premiumIndex`

---

## 🧠 4. Algoritmik Teşhis Motoru (Rule-Based Decision Logic)

Terminal sadece ham veri göstermeyecek; veriyi okuyup Türkçe taktik üretecektir:

| Koşul | Algoritma Tespiti | Çıkan Canlı Teşhis Mesajı |
| :--- | :--- | :--- |
| **Top Trader L/S > 1.4** + **Global L/S < 0.8** + **Funding Eksi** | **Short Squeeze** | 🟢 **GÜÇLÜ BOĞA & SHORT SQUEEZE:** Balina Long'da, perakende Short'ta terste! Fonlama eksi, yukarı patlama sürebilir. |
| **Fiyat Zirvede** + **OI Hızlı Düşüyor** + **Top Trader L/S < 1.1** | **Dağıtım / Kaçış** | 🔴 **TEHLİKE / DAĞITIM:** Balinalar Long pozisyonlarını kapattı, masadan para çıkıyor. Long açmayın, stopları sıkılaştırın! |
| **RSI < 25** + **Top Trader L/S Artıyor** + **Taker Buy > 1.2** | **Dip Dönüşü** | 💎 **DİP TESPİTİ:** Aşırı satım bölgesinde balinalar gizlice topluyor ve agresif alıcılar devrede. Long fırsatı! |
| **Funding Aşırı Pozitif (> +%0.05)** + **Global L/S > 1.8** | **Long Squeeze Riski** | ⚠️ **AŞIRI COŞKU:** Perakende çılgınca Long açmış, piyasa yapıcı long tasfiyesi için sert iğne atabilir! |

---

## 🛠️ 5. Telegram Botları ile Entegrasyon

Mevcut botlarımız (`hunter-15m.js`, `hunter-4spro.js`) bir sinyal ürettiğinde mesajın altına doğrudan terminal linki eklenir:

```text
📈 [4Spro] #TAKEUSDT BUY 🟢
...
🔗 [CANLI VERİ TERMİNALİNDE İNCELE] (http://localhost:3000/?coin=TAKEUSDT)
```
Bu linke tıkladığınız anda tarayıcınızda doğrudan TAKEUSDT verileri, grafiği ve Smart Money analizi açılır!

---

## 📅 6. Geliştirme Yol Haritası

1. **Aşama 1: Veri Katmanı ve API Servisi** (`binance-data.service.js`)
   - Binance Futures Data endpoint'lerini tek bir fonksiyonda toplayıp temiz JSON formatına sokma.
2. **Aşama 2: Web Sunucusu ve Arayüz Tasarımı** (`terminal-server.js` + `public/index.html`)
   - TradingView Lightweight Charts entegrasyonu (mum grafiği, EMA'lar, RSI).
   - 4'lü Smart Money göstergeleri ve dinamik renkli ilerleme barları.
3. **Aşama 3: Delta ve Otomatik Teşhis Motoru**
   - Son 15dk / 1 saatlik OI değişimi hesaplayıcısı.
   - Akıllı Türkçe karar/taktik motoru.
4. **Aşama 4: Canlı Test ve Bot Entegrasyonu**
   - Gerçek sinyallerle hız ve tepki süresi testi.
   - Tek tıkla Telegram'dan coine bağlanma.
