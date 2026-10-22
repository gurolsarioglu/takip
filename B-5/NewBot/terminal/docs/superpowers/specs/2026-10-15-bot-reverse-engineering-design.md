# 🦁 Reverse-Engineered Autonomous Bot & Terminal Architecture Specification

**Tarih:** 2026-10-15  
**Proje:** Alpha Terminal  
**Hedef:** Dış sitelere bağımlı kalmadan, doğrudan Binance Vadeli (Futures) verisi üzerinden çalışan; `terminal.visivero.com`'daki botlarla eşzamanlı ve aynı kriterlerle sinyal üreten bağımsız yerel terminal motorunun inşası.

---

## 1. Kapsam ve Hedefler

### 1.1 Kapsam İçi (In-Scope)
1. **İzleme Listesi (Watchlist):** Binance Futures'taki 700+ USDT-M sözleşmesini anlık fiyat, 24s değişim ve fonlama oranıyla listeleyen ve filtreleyen bileşen.
2. **Alt Coin Bilgi Paneli:** Watchlist'in hemen altında seçili coinin 24s High, Low, Quote Volume, Open Interest ve sonraki fonlamaya kalan süresini gösteren bilgi kartı.
3. **4'lü Piyasa Pozisyonlanma (Sentiment) Barı:** Butonla açılan; Binance vadeli verilerinden beslenen 4 oran:
   - Order Book (Derinlik Bid % / Ask %)
   - Long/Short Positions (Balina Net Pozisyon Oranı)
   - Trader Positioning (Balina Hesap Sayısı Oranı)
   - Market Exposure (Genel Piyasa Hesap Dağılımı)
4. **Yerel Tarama ve Sinyal Motoru (`BinanceScannerEngine`):** 700+ coin üzerinde 1m, 5m, 1h, 4h ve 1d mumlarını takip eden, göstergeleri yerel hesaplayan ve 9-10 botun şartlarını tarayan arka plan servisi.
5. **9 Bağımsız Bot Masası:** `start_all_bots.sh` ile 2. ekranda açılan pencerelerde canlı ve doğru sinyallerin listelenmesi.

### 1.2 Kapsam Dışı (Out-of-Scope)
* **Grafik Alanı (4'lü Ekran):** Kullanıcının isteği doğrultusunda boş bırakılacak, ileride bu alana **Kasa Defteri** modülü entegre edilecektir.
* **Otomatik Karmaşık Test Kodları:** Kullanıcı testi bizzat `terminal.visivero.com` ile kendi bot pencerelerini canlıda karşılaştırarak yapacaktır.

---

## 2. Sistem Mimarisi ve Bileşenleri

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       BINANCE FUTURES DATA FEED                         │
│  • WSS: wss://fstream.binance.com/ws/!miniTicker@arr                    │
│  • REST: /fapi/v1/continuousKlines, /fapi/v1/depth                      │
│  • REST: /futures/data/topLongShort*, /futures/data/globalLongShort*    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 YEREL ARKA PLAN SERVİSLERİ (Node.js)                    │
│                                                                         │
│  ┌─────────────────────────┐       ┌─────────────────────────────────┐  │
│  │    WatchlistService     │       │        SentimentService         │  │
│  │ (700+ Coin Fiyat & FR)  │       │   (4'lü Bar & Derinlik Analizi) │  │
│  └─────────────────────────┘       └─────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                   BinanceScannerEngine                            │  │
│  │ • 1m, 5m, 1h, 4h, 1d Mum Önbelleği (OHLCV)                        │  │
│  │ • İndikatör Motoru: Wilder RSI(14), SRSI(14,14,3,3),              │  │
│  │   WaveTrend(10,11,21), Pivot(Daily/Session), SMA(Vol,20), EMA200  │  │
│  │ • Sinyal Üretimi: 9 Strateji Kural Kontrolü                        │  │
│  └─────────────────────────────────┬─────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                   BotManager (MVC Katmanı)                        │  │
│  │   bots/strategies/*.bot.js -> Yeni Sinyal Kuyruğu & Eşleme        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP API (localhost:3000)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       ÖN YÜZ (KULLANICI ARAYÜZÜ)                        │
│  • Ana Ekran: Watchlist + Alt Coin Info + 4'lü Sentiment Modalı         │
│  • Orta Alan: Boş (Gelecekteki Kasa Defteri için Rezerve)               │
│  • 2. Ekran: 9 Bağımsız Bot Monitör Penceresi (start_all_bots.sh)       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Bot Stratejileri ve Matematiksel Kriter Sözleşmesi

Visivero'nun canlı sinyallerinden tersine mühendislikle doğrulanan kural tablosu:

### 3.1 🔨 Hammer Pro Plus (`hammer-pro-plus`)
* **Stratejiler:** `#S1` (Pivot/Destek Teması) ve `#W1` (WaveTrend Dip Dönüşü).
* **Kriterler:**
  - `1m RSI <= 30`, `5m RSI <= 30`, `1h RSI <= 35`
  - `5m SRSI <= 10`, `1h SRSI <= 25`
  - Seanslık/Günlük klasik Pivota uzaklık $\le \%0.50$ (Temas ve tepki)
  - Anlık mum sıçraması: `Boost Value >= +1.50%`
* **Yıldız Puanı:**
  - ⭐: 1m/5m RSI dip dönüşü
  - ⭐⭐: 1m+5m+1h aşırı satım + Boost $> \%2.0$
  - ⭐⭐⭐: 1m+5m+1h dip + WT yeşil kesişim + Pivot teması $\le \%0.30$

### 3.2 🔨 Hammer Pro (`hammer-pro`)
* **Strateji:** `#W1` (WaveTrend Dönüşü).
* **Kriterler:**
  - Long: `1m RSI <= 30`, `5m RSI <= 35`, WaveTrend 1m Bullish Cross (`WT: 1m🟢`).
  - Short: `1m RSI >= 70`, `5m RSI >= 65`, WaveTrend 1m Bearish Cross (`WT: 1m🔴`), 4H EMA200 mesafesi $\le \%0.50$.

### 3.3 🔨 Hammer Classic (`hammer`)
* **Kriterler:** Pro indikatörler olmadan klasik çoklu zaman dilimi aşırı satım (`1m/5m/1h RSI <= 25`, `5m/1h SRSI <= 10`).

### 3.4 🛡️ 4S Structure (`4s`)
* **Kriterler:** 4 saatlik yapı takibi.
  - `Boost Value >= +3.0%`
  - `4h SRSI = 0` veya `1d SRSI = 0` aşırı uçlar
  - Balina pozisyon oranı (`topLongShortPositionRatio` $\ge \%60$ Long veya Short)
  - Perakende piyasa dağılımı (`globalLongShortAccountRatio`) teyidi

### 3.5 🎯 4S Sniper (`4sniper`)
* **Strateji:** `NW UP` (New Wave Up) veya `NW DOWN` (New Wave Down).
* **Kriterler:**
  - 4 saatlikte dipten/tepeden yeni dalga başlangıcı
  - `4h SRSI <= 10` (Long) veya `4h SRSI >= 90` (Short)
  - 1H RSI dönüşü + Balina Long/Short $\ge \%60$

### 3.6 📊 V3-A Hacim (`v3`)
* **Kriterler:**
  - $\Delta Vol\% = \frac{Vol - SMA(Vol, 20)}{SMA(Vol, 20)} \times 100 \ge +8\%$
  - Anlık hacim patlaması + 24s hacim büyüklüğü

### 3.7 📐 1H Divergence (`div`)
* **Strateji:** `1H RSI DIVERGENCE` (Pozitif Boğa veya Negatif Ayı Uyumsuzluğu).
* **Kriterler:**
  - Boğa: Fiyat son 20 mumda daha düşük dip (Lower Low) yaparken, 1H RSI daha yüksek dip (Higher Low) yapar.
  - Ayı: Fiyat daha yüksek tepe (Higher High) yaparken, 1H RSI daha düşük tepe (Lower High) yapar.
  - 1H RSI-SMA kesişimi veya WaveTrend onayı.

### 3.8 💰 Funding Rate (`fr`)
* **Kriterler:**
  - Fonlama oranının artıdan eksiye geçmesi ($+ \to -$) veya aşırı negatif olması ($\le -0.05\%$).
  - 8 saatlik fonlama ödeme zamanına kalan süre sayacı.

### 3.9 🔴 M1-A Mikro Düşüş/Sıçrama (`m1`)
* **Kriterler:**
  - 1 dakikalık mumda $|\text{Boost Value}| \ge 1.00\%$
  - 1m Hacim artışı $> \%10$, 1m RSI aşırı bölge ($\ge 70$ veya $\le 25$)
  - 1m Stochastic K/D kesişimi + BTC volatilite filtresi

### 3.10 ⚡ M1 Premium (`m1-premium`)
* **Kriterler:** 1 dakikalık breakout momentum ivmesi.
  - Mum sıçraması $\ge +1\%$, `1m RSI >= 65`, `5m RSI >= 60`, `1h RSI >= 60`.

---

## 4. Kullanıcı Doğrulama ve Kabul Kriteri (Acceptance Criteria)

* **Başarı Kriteri:** Kullanıcı `terminal.visivero.com`'u bir ekranda, kendi `start_all_bots.sh` ile açılan Alpha Terminal pencerelerini diğer ekranda açık tuttuğunda; karşı tarafta herhangi bir bota yeni bir coin sinyali düştüğünde, bizim yerel çalışan bot penceremize de aynı coinin aynı kriterlerle düşmesi.
