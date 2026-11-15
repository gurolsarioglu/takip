# Terminal — Geliştirme Önerileri (V1.8.0 sonrası)

> Tarih: 15.11.2026. Bu dosya, Terminal sayfasını (http://localhost:3200/terminal.html) hiç görmemiş bir AI kodlama ajanı için yazıldı.
> **Önce `AGENTS.md`'yi tamamen oku** (özellikle §2 kesin kurallar, §3 kullanıcının işlem tarzı, §9 Terminal, §11 TC göstergeleri).
> Buradaki maddeler **öneridir**; hangisinin yapılacağına kullanıcı karar verir. Onay almadan başlama.
> Her madde bağımsız bir iş olarak alınabilir. Sıra, kullanıcıya faydasına göre yukarıdan aşağıdır.

## 0. Şu anki durum (V1.8.0)

- `web\public\terminal.html` tek dosya (HTML + CSS + JS, dış betik yok). Grafikler kendi `Chart` canvas sınıfımız.
- Düzen: solda izleme listesi, ortada **yan yana 4 dik grafik** (her biri kendi zaman dilimi), altta OI + hacim paneli.
- Her grafiğin altında 3 bölme: RSI(14)+SMA14, Stokastik RSI K/D, WaveTrend(10,21,4) + kesişim noktaları.
- TC katmanları (`TC göstergeleri ▾` menüsü): Buy/Sell, TP/SL, Mild X, uyumsuzluk ▲▼, Ribbon, Reversal Bands, S/R.
- Gösterge hesabı sayfanın içindeki `TA` nesnesinde; `lib\ind.cjs` ile aynı sonucu verir (elle karşılaştırıldı, fark 0).
- Sunucu: `web\terminal.cjs` (`/api/t/*`). Bütün Binance istekleri tek sıralı kuyruktan geçer. Tarayıcı Binance'e bağlanmaz.
- Veri tazeleme: grafik başına 5 sn'de bir `klines?limit=3` (REST yoklama).

## 1. Değişmeyecek kurallar

1. Emir/işlem yok, API anahtarı yok. Sayfa yalnız veri gösterir.
2. Yalnız `127.0.0.1`. Tarayıcı doğrudan Binance'e bağlanmaz; her şey `web\terminal.cjs` üzerinden.
3. Motorla aynı IP: Binance kuyruğu kuralları (§9) gevşetilmez. Yeni bir Binance ucu eklenecekse ağırlık hesabını yaz.
4. Dış bağımlılık, CDN, derleme adımı yok. Tek bağımlılık `pg`.
5. `rules\*.cjs` (botlar) bu işlerin hiçbirinde değişmez. FR botuna dokunma (kullanıcı talimatı).
6. Görünen her değişiklikte `VERSION` artar, `Takip.md`'ye tarihli not düşülür, `AGENTS.md` §9 güncellenir.
7. Ölçmediğini ölçmüş gibi yazma. Örnek sayısını ve dönemi belirt.

## 2. Öneriler

### Ö1 — TC sinyallerini ölç (kod yazmadan önce en değerli iş)

**Neden:** Grafikte Buy/Sell, Mild X ve uyumsuzluk işaretleri var ama bunların para kazandırıp kazandırmadığı **hiç ölçülmedi**. Projenin
bütün geçmişi aynı dersi veriyor: güzel görünen işaretlerin çoğu ölçülünce değersiz çıktı (AGENTS.md §10). Ölçülmemiş bir işarete bakarak
işlem açmak, terminali geliştirmenin tersine çalışır.

**Ne:** `klines_5m` tablosundaki geçmişle (24.10.2026'dan beri, ~800 coin) TC Buy/Sell, Mild X ve uyumsuzluk sinyallerini üret; her sinyal
için Karne ile aynı ölçümü yap: 1 sa / 4 sa getiri, kazanan %, MFE/MAE, ilk 1 saatte +%1 / −%1'e değme oranı. Ayrıca kullanıcının tarzına
göre **TERS** yön de ölçülsün (AGENTS.md §3: yorulmayı oynar).

**Nasıl:** yeni betik `db\tc-olcum.cjs` (`--bir-kez`; salt-okunur; Binance'e gitmez). Gösterge kodu `terminal.html`'deki `TA` ile aynı
olmalı (bkz. Ö7: ortak dosya). 5dk mumlardan 15dk / 1s / 4s üret. Çıktı: `data\rapor\tc-olcum.json` + ekrana tablo.

**Kabul:** tablo; sinyal sayısı, coin sayısı, dönem, günlere dağılım (tek güne yığılma var mı) yazılı. Sonuç kötüyse açıkça "değersiz" yaz.

### Ö2 — "Yorulma" özeti (kullanıcının gerçekten baktığı şey)

**Neden:** Kullanıcı işlem kararını şuna bakarak veriyor: RSI aşırı bölgede mi, WT aşırı bölgede kesişti mi, uyumsuzluk var mı; bunu
1dk / 5dk / 1s'te tek tek gözle okuyor. Şu an 4 grafiğin alt bölmelerine tek tek bakması gerekiyor.

**Ne:** Başlığın altına küçük bir tablo: satırlar = açık 4 zaman dilimi, sütunlar = RSI (≤30 / ≥70 işaretli), SRSI (≤10 / ≥90),
WT kesişimi (aşırı bölgede, son N mum; rengi kesişim yönü), RSI uyumsuzluğu (çapa dedektörü, AGENTS.md §7.5). Hepsi aynı yönü gösteriyorsa
satır vurgulanır ("yorulma: long tarafı" / "short tarafı"). Bu bir sinyal değil, **okuma kolaylığıdır**; öyle etiketlensin.

**Nasıl:** hesap tarayıcıda, zaten yüklü mumlardan (`Chart.calc()`). Ek Binance isteği yok. Uyumsuzluk için `rules\div.cjs`'deki
`anchorDivergence` mantığını taşı (N=80, minDist=2, pivR=5). RSI bölmesinde uyumsuzluk çizgisi (iki tepe/dip arası) çizilebilir.

**Kabul:** aynı coin + aynı an için M1 Premium mesajındaki `Divergence:` ve `WT Cross:` satırlarıyla tutarlı (parametreler §7.1).

### Ö3 — İzleme listesine tarama sütunları (veritabanından, Binance'e yük bindirmeden)

**Neden:** Liste şu an yalnız fiyat / 24s % / hacim gösteriyor. Hangi coine bakmaya değer olduğu listeden anlaşılmıyor.

**Ne:** coin başına ek sütunlar (seçilebilir): OI 1sa / 4sa değişimi, funding, son bot sinyali (bot + yön + kaç dk önce), RSI 5dk / 1s.
Sütuna tıklayınca sıralama (mevcut sıralama düzeni).

**Nasıl:** yeni uç `GET /api/t/liste-ozet` → **yalnız PostgreSQL** (`oi_5m`, `klines_5m`, `signals`). Binance'e istek yok.
OI için motorun 5 dk'lık turu `oi_5m`'e düşüyor mu önce doğrula (AGENTS.md §4: `turev` 6 saatte bir; yeterince taze değilse
`data\live\status.json` / motor çıktısı yerine kullanılabilecek kaynak yok — bu durumda sütunu "6 sa bayat olabilir" diye etiketle
ya da maddeyi OI'siz yap). 30 sn önbellek.

**Kabul:** 100 coinlik listede uç < 300 ms; sütunlar boşsa "—", uydurma değer yok.

### Ö4 — Canlı veriyi yoklama yerine tek WebSocket'ten al

**Neden:** Şu an 4 grafik 5 sn'de bir REST'e gidiyor: mum 5 sn gecikmeli, ve dakikada ~48 istek. TradingView hissi yok.

**Ne:** `web\terminal.cjs` seçili coin için **tek** Binance WebSocket bağlantısı açar (`wss://fstream.binance.com/market/stream`,
`<sym>@kline_1m` — AGENTS.md §6.1: yalnız `/market/stream` yolu çalışıyor), tarayıcıya `text/event-stream` (SSE) ile iletir.
Tarayıcı 1 dk mumdan üst dilimlerin canlı mumunu kendisi günceller (motorun `pushMinute` mantığı). REST yoklaması 60 sn'ye iner (eşitleme).

**Risk:** motor zaten aynı IP'den ~5 WS bağlantısı kullanıyor; bir bağlantı daha sorun değil ama coin değiştikçe aç/kapa yapma —
tek bağlantıda `SUBSCRIBE` / `UNSUBSCRIBE` kullan. Sekme kapanınca bağlantı kapanmalı. 45 sn sessizlikte yeniden bağlan.

**Kabul:** fiyat etiketi ≤ 1 sn gecikmeli; `x-mbx-used-weight-1m` katkısı düşmüş; sekme gizliyken akış duruyor.

### Ö5 — Alt panele funding ve long/short geçmişi

**Neden:** Kullanıcı OI + funding + long/short üçlüsünü birlikte okuyor (pump incelemelerinde böyle baktık). Şu an yalnız OI var.

**Ne:** OI panelinde sekme: `OI · Funding · Long/Short`. Funding: geçmiş ödemeler + anlık tahmini. Long/Short: kalabalık ve büyük
hesap oranı.

**Nasıl:** long/short için önce veritabanı (`ls_15m`, `lsp_15m`), eksikse Binance `/futures/data/*` (kuyruk kuralı: ≥700 ms, 30 gün sınırı).
Funding geçmişi `/fapi/v1/fundingRate` (ağırlığı ve sınırını Binance belgesinden doğrula; ezbere yazma).

### Ö6 — Kullanım kolaylığı (küçük işler, tek pakette yapılabilir)

- **Bölme yükseklikleri sürüklenebilir** olsun (fiyat / gösterge bölmeleri arası ayırıcı); oran `localStorage`'da saklanır.
- **Göstergeler tek tek** açılıp kapansın (şu an RSI+SRSI+WT tek kutu) ve parametreleri (WT 10,21,4 / 9,12,4) seçilebilsin.
- **Klavye:** ↑ / ↓ izleme listesinde coin değiştirir, 1–4 grafiği büyütür, Esc geri alır.
- **OI paneli ve izleme listesi daraltılabilir** (grafiklere tam yükseklik).
- **Zaman eşitleme:** isteğe bağlı "aynı zaman aralığını göster" (bir grafikte kaydırınca diğerleri aynı tarihe gelsin).
- **Aynı muma çok bot sinyali:** tek işaret + sayı (×N); şu an üst üste yığılıyor.
- **TP/SL etiketleri** grafik uzaklaştırılınca üst üste biniyor: yalnız çizgi + sağ eksende etiket.
- **Yatay çizgi / not:** grafiğe çift tıkla seviye ekle; coin başına veritabanında (`izleme_cizgi` tablosu) saklansın.
- **"İşleme girdim"** düğmesi terminalde de olsun (Kasa formunu açar); açık işlem varsa giriş fiyatı grafikte çizgi olarak görünsün.

### Ö7 — Gösterge kodunu tek kaynağa indir + test

**Neden:** RSI / SRSI / WT / Range Filter şu an iki yerde: `lib\ind.cjs` (botlar) ve `terminal.html` içindeki `TA`. Biri değişirse
diğeri sessizce farklı değer gösterir.

**Ne:** `TA`'yı `web\public\ta.js` dosyasına taşı (tarayıcıda `<script src>`, Node'da `require` edilebilecek biçimde:
`if (typeof module !== 'undefined') module.exports = TA`). `db\test-terminal.cjs`'e test ekle: rastgele 1.000 mumda `TA` ile
`lib\ind.cjs` farkı 0; Range Filter için `parity\research\tc\rflib.cjs` ile sinyal farkı 0. `lib\ind.cjs`'e **dokunma**
(tohum ve yuvarlama ayrıntıları botların uyumunu belirliyor).

**Kabul:** `node db\test-terminal.cjs` → "hepsi TAMAM"; sayfa `ta.js` olmadan açılmıyorsa `/api/version` damgası onu da izliyor.

### Ö8 — TC klonlarını TradingView ile doğrula

**Neden:** Buy/Sell doğrulanmış (27/27). Mild X 17/18, uyumsuzluk 8/9; S/R 5/6; bant adımı yaklaşık; ◇ Reversal yok. Terminale
taşınan sürüm TradingView ile yan yana **karşılaştırılmadı**.

**Ne:** kullanıcı aynı coin + zaman dilimi + saat için TradingView ekran görüntüsü verir; ajan terminaldeki işaretlerle karşılaştırır,
farkları listeler. Ajanın TradingView'e erişimi yok (AGENTS.md §11); kendi başına tahminle "düzeltme" yapma.

**Ek:** kullanıcının telefon ekranında görülen ama bizde olmayanlar: eğimli kanal (regresyon kanalı gibi), "High Level / Low Level"
etiketleri. Hangi göstergeden geldiği bilinmiyor; önce kullanıcıya sor.

### Ö9 — Çok coinli görünüm

**Ne:** ikinci düzen kipi: 4 grafik = **4 farklı coin, aynı zaman dilimi** (ör. izleme listesinin ilk 4'ü ya da sabitlenenler).
Tek coine 4 dilimden bakmak yerine piyasaya yan yana bakmak için.

**Risk:** Binance isteği 4 katına çıkmaz (zaten 4 grafik var) ama OI / coin özeti tek coine bağlı; hangisinin "seçili" olduğu net olmalı.

## 3. Önerilen sıra

1. **Ö1** (ölçüm) — sonucu, diğer maddelerin hangisine emek verileceğini belirler.
2. **Ö7** (tek kaynak + test) — Ö1 ve Ö2'nin önkoşulu; küçük iş.
3. **Ö2** (yorulma özeti).
4. **Ö6** (kullanım kolaylığı paketi).
5. **Ö4** (canlı akış), **Ö3** (liste sütunları), **Ö5** (funding / long-short).
6. **Ö8**, **Ö9** — kullanıcı isterse.

## 4. Her iş için teslim listesi

- [ ] `node -c` / sayfa betiği sözdizimi temiz; `node db\test-terminal.cjs` → "hepsi TAMAM".
- [ ] Sahte veriyle (`node db\terminal-deneme.cjs` → `http://127.0.0.1:3299/terminal.html`) 1366×768 ve 1920×1080'de taşma yok, konsol temiz.
- [ ] Gerçek sunucuda bir coinle denendi; `data\live\status.json` → `errors` artmadı; Binance sınır uyarısı yok.
- [ ] Yalnız web yeniden başlatıldı (`data\kontrol\web.yeniden`); motor **yeniden başlatılmadı**.
- [ ] `VERSION`, `package.json`, `AGENTS.md` §9, `Takip.md` güncel.
- [ ] Rapor: ne yapıldı, ne denendi, **ne denenmedi**.
