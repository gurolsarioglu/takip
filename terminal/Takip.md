# Takip.md — Visivero Kopyası Projesinin Hafızası

> Bu dosya projenin ortak hafızasıdır. Yeni bir oturumda (Claude veya siz) **önce bu dosya okunur**.
> Her önemli karar, bulgu, değişiklik ve sonuç buraya işlenir. En yeni bilgi ilgili bölümü günceller;
> tarihli olaylar en alttaki **Günlük** bölümüne eklenir.
> Son güncelleme: 2026-10-27

---

## 1. Amaç

- terminal.visivero.com'daki **izleme listesini** ve **sinyal botlarını birebir** kopyalamak:
  aynı sinyal, aynı anda, aynı mesaj formatıyla. Hedef: Visivero'ya bağımlı kalmamak.
- Visivero üyeliği **27 Ekim 2026'da bitti / bitiyor**. Ancak Visivero'nun mesaj kaynağı (aşağıda) üyelik
  istemiyor; açık kaldığı sürece karşılaştırma ve ayar yapmaya devam edebiliriz.
- Kullanıcının **kişisel strateji botu (DEMA9 + 5m uyumsuzluk + hacim) BEKLEMEDE.** Kullanıcı: "Şuan için ayrı
  bot beklesin". Odak: Visivero ile birebir uyum.

## 2. Çalışma düzeni (altyapı)

- **Proje klasörü (kullanıcının Windows PC'si):** `C:\projeler\newbot\terminal`
  - Bizim kopya motor: `C:\projeler\newbot\terminal\parity`
  - Kullanıcının kendi terminali: `C:\projeler\newbot\terminal` (`terminal-server.js`, port **3000**)
  - Repo: https://github.com/gurolsarioglu/takip.git (eski araştırmalar `B-5/NewBot/terminal/review`)
- **İnternet:** Claude'un bulut ortamı Binance/Visivero'ya erişemez. Tüm ağ işleri kullanıcının PC'sinde çalışır.
- **İş çalıştırıcı (runner):** `parity\start-parity-runner.bat` → `parity\runner.cjs`.
  - Bu pencere **açık kalmalı**. PC yeniden başlarsa kullanıcı bu .bat'ı tekrar açar, Claude işleri yeniden başlatır.
  - İş vermek: `parity\jobs\<ad>.job.json` = `{"script":"x.cjs","args":[...]}` veya `{"kill":"<işadı>"}`.
  - Çıktı: `jobs\<ad>.log`, bitince `jobs\<ad>.done`. Çalışanlar `jobs\_runner.json` içinde.
  - Claude tarafında iş adı öneki `me-NNN-...` (son kullanılan: me-100).
- **Dosya gönderme (Claude için not):** `device_commit_files` aynı staging yolunu önbellekler →
  **her seferinde yeni klasör** kullan: `/mnt/user-data/outputs/me-N/...` (son kullanılan: me-58).
  Göndermeden önce cihazdaki dosyanın md5'i ile yerel kopyayı karşılaştır.
- **Sürekli çalışan işler:**
  | İş | Ne yapar |
  |---|---|
  | `030-follow` | `collect.cjs --follow`: Visivero mesajlarını ~8 sn'de bir çeker → `data\ref\<bot>.jsonl` (seenAt alanı ile) |
  | `me-066-live` | `engine\live.cjs`: bizim canlı sinyal motoru → `data\live\signals-YYYY-MM-DD.jsonl`, `status.json` |
  | `me-085-web` | `web\server.cjs`: web siteleri (3100/3101/3102) |

## 3. Web siteleri (yalnızca o PC'den açılır, dışarıya kapalı — kullanıcı böyle istedi)

| Adres | Ne |
|---|---|
| http://localhost:3100 | **Sinyal Masası**: bizim vs Visivero eşleşme kartları (✓ Eşleşti / ✗ Kaçırdık / ＋ Fazla / ⏳), bot skorları (Yakalama/İsabet), Binance izleme listesi, 👍👎💬 geri bildirim |
| http://localhost:3101 | **Visivero Botları**: yalnızca Visivero mesajları, Visivero görünümü (sol bot şeridi + akış) |
| http://localhost:3102 | **Bizim Botlar**: aynı tasarım, yalnızca bizim mesajlar |

- Kullanıcı 3101 ve 3102'yi **ayrı ayrı** istedi (aynı sayfada değil), iki pencerede yan yana açıyor.
- Sayfalar **otomatik yenilenir**: site dosyaları değişince veya sunucu yeniden başlayınca (`/api/version`, 8 sn'de bir kontrol). Kullanıcı elle yenilemek istemiyor.
- Kullanıcının terminal başlığında (3000) "📡 Sinyal Masası" butonu var.
- **Geri bildirim dosyası:** `parity\data\feedback.jsonl` — kullanıcının notları/oyları. **Claude her oturumda okumalı.**
- Dışarıdan erişim (Cloudflare Tunnel / Tailscale) önerildi, kullanıcı **istemedi** ("böyle kalabilir").

## 4. Veri kaynakları

- **Visivero mesajları (üyelik gerekmez):**
  `https://terminal.visivero.com/api/bot-messages?bot_id=X&limit=100&exchange=binance&market_type=FUTURES&before=<ISO createdAt>`
  - Sonuçlar artan sırada; sayfalama için en küçük createdAt kullanılır.
  - Sembol başına yalnızca **son 100 mesaj** saklanıyor (eski mesajlar silinir — "kaçırdık" sanma).
  - Bot id'leri: `m1, m1-premium, fr, v3, hammer, hammer-pro, hammer-pro-plus, 1d-hammer-pro, 4s, 4sniper, 1dws, div`.
  - Derin arşiv: ~312 bin mesaj, 9 Temmuz 2026'dan beri (`data\ref`).
- **Binance Futures:** REST `fapi.binance.com`; WebSocket **yeni adres** `wss://fstream.binance.com/market/stream?streams=...`
  (eski `/stream` ve `/ws` çalışmıyor). İzleme listesi: `.../market/ws/!miniTicker@arr`.
- Visivero sitesine tarayıcıdan toplu veri çekme denemesi **engellendi** — tekrar deneme.
- Claude kullanıcının şifresini **yazmaz**; giriş gerekirse kullanıcı kendisi yapar.

## 5. Kod haritası (`parity\`)

| Dosya | Görev |
|---|---|
| `AGENTS.md` | Alt ajanlar için çalışma protokolü |
| `lib\ind.cjs` | İndikatörler: sma, ema, rma, rsi (Wilder), stochRsi (Pine K=SMA3), waveTrend, crossAt, nwRepaint, pivotlar |
| `lib\pivot.cjs` | Haftalık Fibonacci pivot, en yakın pivota % uzaklık |
| `lib\ref.cjs` | Visivero mesaj ayrıştırıcı (`parse`) |
| `lib\net.cjs` | Binance/Visivero istekleri + önbellek (`klinesAt`, `klinesRange`, `botMessages`...) |
| `lib\schedule.cjs` + `scan-schedule.json` | Visivero'nun tarama sırası/gecikmeleri (alfabetik) |
| `lib\hammer-seed.json` + `make-hammer-seed.py` | Hammer yön sırası başlangıç durumu |
| `engine\market.cjs` | Tüm USDT/USDC perpetual'lar: REST + WS 1m, üst zaman dilimleri 1m'den üretilir; kopma bekçisi (45 sn mesaj yoksa yeniden bağlan) |
| `engine\live.cjs` | Kural modüllerini yükler (15 sn'de bir sıcak yeniden yükleme), durum kaydı, sinyal yazar |
| `rules\m1.cjs` | M1-A ve M1 Premium |
| `rules\hammer.cjs` | Hammer / Pro / Pro+ / 1D Pro |
| `rules\four-s.cjs` | 4S / 4S Sniper / 1DWS |
| `rules\div.cjs` | DIV (1H RSI DIVERGENCE) |
| `rules\flow.cjs` | FR ve V3 |
| `collect.cjs` | Visivero arşivleme / takip |
| `compare.cjs` | Canlı karşılaştırma raporu (bölüm bazlı eşleştirme) → `data\live\parity-report.json` |
| `web\server.cjs`, `web\public\index.html`, `web\public\bots.html` | Web siteleri |
| `research\...` | Araştırma betikleri ve raporlar |

## 6. Botların çözülmüş kuralları (bilinenler)

**Genel:** İndikatörler kapanmış barlar + o anki fiyattaki canlı bar ile hesaplanır. Normal mum (Heikin Ashi **değil** — test edildi, reddedildi).

- **M1-A / M1 Premium:** Tetik |fiyat / canlı 1m açılış − 1| > %1. M1-A her tikte tekrar eder; Premium sembol başına ≥10 sn arayla.
  ⭐ = canlı 1m barın sinyal yönündeki uzaması ≥ %1,7 (%93 uyum). M1-A'daki "Stochastic (K/D)" = StochRSI.
  - **"Divergence: 1m✅ 5m✅ 1h✅" satırı** (Premium) — ortak uyumsuzluk dedektörü, **sinyalin tersi yönde** uyumsuzluk:
    1m N80 high/low canlı barda; 5m N30 kapanış (canlı veya son kapanan); 1h N50 high/low. Eklendi (27.10).
  - **"WT Cross: 1m🟢 5m🔴 1h🔴" satırı** — Visivero 25.10 15:00'te ekledi. Kullanıcı: **önemli uyarı bilgisi, olsun.** 27.10'da eklendi.
    Kural: sinyalin **tersi yönde** yakın zamanda WaveTrend kesişimi, aşırı bölgede; renk = kesişim yönü (🟢 yukarı, 🔴 aşağı).
    1m: LazyBear WT(10,21,4) kapanan barlar, son 2 bar, wt2 ≥53 · 5m: LazyBear canlı bar dahil, son 4 bar, wt2 ≥60 · 1h: TC WT(9,12,3) kapanan, son 5 bar, wt2 ≥53.
    Uyum: 1m %83/%82, 5m %87/%87, 1h %97/%83 (yakalama/isabet). Satır sırası: Divergence → WT Cross → FR.
  - Bilinen küçük fark: mesajdaki 1h RSI %50, 1h SRSI %20 birebir tutuyor (sinyal zamanını etkilemiyor).
- **Ortak uyumsuzluk dedektörü (Visivero'nun):** Son N bardaki en uç RSI = çapa; çapa RSI ≤30 (short için ≥70); çapa ±pivR barda yerel uç;
  fiyat çapayı geçmiş, RSI geçmemiş; arada daha uç fiyat yok.
- **DIV (1H RSI DIVERGENCE):** Dedektör N80, pivR **5** (27.10 güncellendi), canlı RSI kapısı up ≤40 / down ≥57, 3 bar soğuma, aynı çapa tekrar etmez.
  7 günlük simülasyon: yakalama %93,9, isabet %70. Pivot satırı haftalık Fib pivota uzaklık < %1 ise yazılır.
- **4S:** 4 saatlik canlı WaveTrend(10,21,4) kesişimi + WT1 ±55 ötesi. Her 4s döngüde bir kez, alfabetik tarama (~15 dk).
- **4S Sniper:** NW (Nadaraya-Watson, h8, mult3, 500 bar, repaint) UP/DOWN; 4H RSI SMA CROSSED (önceki RSI ≤30/≥70);
  **4H RSI DIVERGENCE (27.10'da açıldı):** dedektör N80 pivR5 + çapa RSI ≤22, uzaklık ≤20 bar, kapanan bar RSI ≤40. Test: isabet %50–72, yakalama ~%45.
- **1DWS:** 00/12 UTC. NW + RSI SMA CROSSED. 1D RSI DIVERGENCE **kapalı** (aynı dedektör yalnızca %36 yakalıyor).
- **Hammer ailesi:** Yön sırası (aynı yönde ikinci sinyal için önce ters sinyal gerekir); Visivero yeniden başladığında toplu sinyal → durum sıfırlanır.
  Yıldız (Boost): <2 yok, 2–3 ⭐, 3–5 ⭐⭐, ≥5 ⭐⭐⭐. Pro+ = Pro + (Boost ≥2 veya 6 uç değer). Düz Hammer = Pro #S1/#R1, Strategy satırı yok.
  - **#W1:** LazyBear WT(10,21,4) kesişimi, kapılar: haftalık pivot ≤%9, **24 saatlik aralık ≤%23** (Hammer kılavuzundaki "istediğimiz hacim ve volatilite" ipucu).
  - **#W1 aynı yön engeli (27.10):** Visivero aynı coinde son W1'iyle aynı yönde 96 saat içinde tekrar W1 vermiyor. `lib\vv-last.cjs` Visivero'nun son W1'ini takip dosyasından okuyor; aynı yönse ve <96 saat ise bizim W1 engellenir. Ölçüm: fazla W1'lerin 96/180'i kalkar, eşleşen 52/52 korunur.
  - **#S1 / #R1 KAPALI:** denenen hiçbir kural isabeti %10'un üstüne çıkaramadı (son deneme 27.10: yön sırası + volatilite + pivot → %10).
- **FR:** birebir yeniden üretim. 27.10: FR taramasında az işlem gören coinler atlanıyordu (motor yalnızca işlem gelince değerlendiriyordu) → motora dakikalık tarama eklendi (`minuteSweep`). İkinci hata: tarama dakikası gerçek saate göre seçildiği için o dakikanın başında değerlendirilen coinler listeden düşüyordu → artık nominal dakika (:00.55) kullanılıyor. 17:03 UTC kontrolü: liste Visivero ile aynı (BULLAUSDT, DOODUSDT). **V3:** hacim formülü bulundu.
- **Tarama zamanlaması:** 4s/4sniper/div/1dws sembolleri alfabetik sırayla taranır (4s döngü ~15 dk, div saatlik ~13 dk, 1dws 00/12 UTC).

## 7. Güncel başarı (canlı, 27.10 06:37–08:20 UTC)

Yakalama = Visivero'nun sinyallerinden bizim de verdiğimiz; İsabet = bizim sinyallerimizden Visivero'da da olan.

| Bot | Yakalama | İsabet |
|---|---|---|
| M1-A | %93,7 | %96,5 |
| M1 Premium | %94,7 | %97,1 |
| 4S | %93,8 | %100 |
| 4S Sniper | %95,7 | %75,9 |
| DIV | 3/4 | 3/5 |
| FR | %92,9 | %76,5 |
| V3 | %88,9 | %72,7 |
| Hammer Pro | %27 | %12,5 |
| Hammer / Pro+ / 1D Pro | zayıf (S1/R1 kapalı) | |

Güncel değerler her zaman Sinyal Masası'nın sağ panelinde.

## 8. Açık işler (öncelik sırasıyla)

1. WT Cross satırının canlı uyumunu izle (eklendi 27.10).
2. **Hammer Pro iyileştirme** — en zayıf bot. Adaylar: DEMA9 konumu, hacim oranı, 5m uyumsuzluk, TC Buy/Sell etiketi, S/R bölge uzaklığı.
   Bot Akışı sitelerinde (3101/3102) Hammer Pro yan yana incelenecek; bizim fazla #W1'ler var.
3. 4S Sniper 4H divergence'ın canlı isabetini izle; gerekirse eşikleri ayarla.
4. Kullanıcının `feedback.jsonl` notlarını düzenli oku ve işle.
5. İleride: kararlı botları kullanıcının terminaline / Telegram'a bağlama (teklif edildi, kullanıcı seçmedi).

## 9. Denenen ve reddedilenler (tekrar deneme)

- Heikin Ashi mumları → uymadı.
- Trader Club "Mild Buy" etiketi ≠ #W1.
- Hammer #S1 için elmas/diamond işareti, RSI/StochRSI eşik kombinasyonları, W1 kapıları → isabet ≤%10.
- 1h RSI farkı için: bekletilmiş fiyat, 15m/30m/2h/4h, 30 dk kaydırılmış saat, hlc3, Heikin Ashi → hiçbiri açıklamadı.
- Excel dosyaları (3X, Yuzde30) boş para yönetimi şablonları; eğitim belgeleri (linreg, EMA9, PMax) takdire dayalı yöntemler — kural ipucu yok.

## 10. Kullanıcı tercihleri

- Türkçe, sade anlatım; sonuçlar sayılarla.
- Tüm teknik seçimleri Claude'a bıraktı ("ne gerekiyorsa yap").
- Siteler yalnızca kendi PC'sinde; dışarı açılmasın.
- Visivero ve bizim botlar **ayrı sitelerde**.
- Mesajlardaki uyarı satırları (WT Cross gibi) önemli — eksiksiz olsun.

## 11. Sık işlemler (nasıl yapılır)

- **Motoru yeniden başlat:** `{"kill":"me-066-live"}` işi, sonra `{"script":"engine/live.cjs"}` (yeni ad, ör. me-0XX-live). Hammer'dan önce `python3 lib/make-hammer-seed.py`.
- **Kural değiştir:** `rules\*.cjs` dosyasını güncelle → motor 15 sn içinde kendisi yeniden yükler (yeniden başlatma gerekmez).
- **Web sitelerini yeniden başlat:** `{"kill":"me-085-web"}` → `{"script":"web/server.cjs"}`.
- **Karşılaştırma raporu:** `{"script":"compare.cjs","args":["--from","<ISO>","--to","<ISO>"]}`.

## 12. Günlük (tarihli olaylar)


- **2026-10-25** — Proje başladı. Altyapı (runner), Visivero arşivi, ilk kurallar (M1, FR, V3, 4S ailesi, DIV, Hammer).
- **2026-10-26** — Canlı motor çalışmaya başladı; Binance WS adres değişikliği düzeltildi; pivot = haftalık Fib pivot bulundu;
  Hammer W1 volatilite kapısı (24s aralık ≤%23) bulundu ve doğrulandı; ortak uyumsuzluk dedektörü M1 Premium etiketlerinden çıkarıldı.
- **2026-10-27 03:10 (TR)** — WS 30 dk sessiz koptu → kopma bekçisi eklendi, motor yeniden başlatıldı (09:32 TR).
- **2026-10-27 10:00–11:30 (TR)** — DIV pivR 5; 4S Sniper 4H RSI DIVERGENCE açıldı; M1 Premium Divergence satırı eklendi; Hammer S1 kapıları denendi (başarısız).
- **2026-10-27 12:00–13:15 (TR)** — Sinyal Masası (3100), Visivero Botları (3101), Bizim Botlar (3102) kuruldu.
  Visivero'nun M1 Premium'a yeni "WT Cross" satırı eklediği fark edildi. Bu Takip.md oluşturuldu.
- **2026-10-27 13:20 (TR)** — WT Cross satırı kuralı bulundu ve M1 Premium'a eklendi; ilk canlı örnek (AINUSDT "WT Cross: 1h🔴") Visivero ile aynı.

- **2026-10-27 15:05 (TR)** — Bağımsız "Visivero Botları" projesi GitHub'a yüklendi: https://github.com/gurolsarioglu/sinyal (yerel kopya `C:\projeler\newbot\sinyal`). Claude oturumu doğrudan push edemiyor (GitHub uygulaması bağlı değil); yükleme kullanıcının Windows git'iyle `parity\tools\publish-repo.cjs` işi üzerinden yapılıyor.
- **2026-10-27 18:45–19:10 (TR)** — FR dakikalık tarama düzeltmesi + motor yeniden başlatıldı (me-100-live). Hammer W1 96 saat aynı yön engeli eklendi. DIV canlı RSI eşikleri denendi (30–40 / 57–65): anlamlı kazanç yok, değiştirilmedi. Sonuçlar ~19:45'te kontrol edilecek.
- **2026-10-27 19:50–20:05 (TR)** — Kontrol (16:00–16:52 UTC): Hammer Pro isabet %57 (4/7, sabah %20), FR %83, 4S Sniper %90, M1 %92/%94. FR tarama ikinci hatası düzeltildi. DIV bu saatte %35 (6/17) — hâlâ açık sorun.

## 13. Trader Club göstergeleri (27.10 akşam, TradingView ekranından)

**BUY-SELL [V.1] ayarları:** Sensitivity 3, Stop Loss %1, Signals Offset 5, Trend Ribbon smoothing 5/8, Show Reversals, P.D H/L/C kapalı, EMA 7/21/144 (gizli), Swing Point Period 10 (gizli), Trend Dashboard açık, Reversal Bands Length 30.
**Stil adları:** Buy/Sell Label; **X = Mild Buy/Mild Sell**; **▲▼ = Divergence Buy/Sell**; **◇ = Reversal Buy/Sell**; Bar Color 2 renk (turkuaz/pembe; sarı mumlar başka göstergeden); Rev.Zone Upper/Lower 1–4 (gizli); Ribbon Fill.
**Çözülenler:**
- TP/SL: giriş = son Buy/Sell mum kapanışı; SL %1, TP1/2/3 = %1/%2/%3.
- Reversal Bands: orta = SMA(ohlc4, 30) (4 örnekte birebir); bantlar orta ± 3,4,5,6 × adım (birebir); adım ≈ 1,12 × WMA(high−low, 48) (~%1 hata, kesin değil).
- Trend tablosu: her zaman diliminde son Buy/Sell yönü.
**S/R ayarları:** Strength 2, Dotted 2, Zones açık, High Low Zones açık, Zone Width %2 (tooltip: son 300 mumun en yüksek−en düşük mesafesinin yüzdesi), Expand SR. Çizgi/kutu nesneleri (plot yok). EVAAUSDT 5m: 0.7628 = pivotHigh(10,10), 0.5269 = pivotLow(10,10).
**Açık:** Buy/Sell kuralı (SuperTrend 1.200 varyant: en iyi 3–4/7 → değil), Mild X, Divergence ▲▼, Reversal ◇ kuralları.
**Hammer bağlantısı (1 örnek):** BREVUSDT 27.10 17:53:07Z Hammer Pro+ 🟢 #S1, Trader Club 1m Buy etiketinin (17:52 mumu, kapanış 17:53:00) 7 sn sonrası; öncesinde ◇ Reversal Buy ve Mild Buy X. Hipotez: #S1 = 1m TC Buy + şartlar. Toplu test gerekli.
**Kullanıcı notu:** TradingView uygulaması "read" izinli — Claude yalnızca ekranı görür, kullanıcı tıklar. Kullanıcı açık/sert eleştiri istiyor.

## 14. Başarı kaydı (27.10 22:40'tan itibaren)
- `parity\reporter.cjs` (iş me-114-reporter, sürekli): her saat başı +3 dk önceki saati compare.cjs ile ölçer → `parity\data\score-history.jsonl` (kalıcı saatlik kayıt) ve `C:\projeler\newbot\terminal\raporlar\YYYY-MM-DD.md` (TR saatiyle günlük rapor: gün toplamı + saat saat yakalama/isabet).
- 27.10 geriye doldurma 10:00–21:00 TR. Not: 20:00 TR saatinde M1 %66 düştü — incelenecek.
- Yapılacak: Sinyal Masası'na "Geçmiş" bölümü (score-history.jsonl'den).

## 15. 28.10 sabah bulguları
- **Trader Club Buy/Sell = Range Filter** (kaynak hlc3, periyot ~50, çarpan 2): BREVUSDT 1m 7/7 etiket, fazla 0 (periyot 47–58 aynı sonuç). EVAAUSDT 5m'de çarpan 3 daha temiz (m2'de 2 fazla dönüş) → çarpan/zaman dilimi ilişkisi henüz net değil. TP/SL'deki "Entry" değeri sinyal mumunun kapanışıyla birebir tutmuyor (0.08793 vs 0.08802) — açık.
- **Hammer ilişkisi (son 5 gün, 300 sinyal, 1m RF hlc3/50/2):** #S1 sinyallerinin %40'ında aynı yönde RF dönüşü sinyal mumunda veya 1 önceki mumda (kontrol: %4,6 → ~9 kat). #W1'in %63'ü aynı yönde dönüşten 1–3 mum sonra (kontrol %14). Kural değil, güçlü ilişki.
- Pine taslağı: `parity\pine\tc_clone_v0.pine` (Range Filter Buy/Sell + TP/SL + Reversal Bands + basit S/R).
- Gece (17:00–06:50 UTC) canlı: M1 %95/%94, M1P %95/%95, 4S %100/%100, 4S Sniper %94/%98, 1DWS %87/%96, DIV %93/%83, FR %93/%86, V3 %90/%80, Hammer Pro %54/%39 (önceki %20 isabet). 1D Hammer Pro 27 kaçırılan (kapalı).
- feedback.jsonl yok (kullanıcı henüz not bırakmadı).
- **28.10 akşam — Sensitivity ölçümü (BREVUSDT 1m, 17:55–19:35 TR):** s1: 12 etiket, s3: 3, s6: 3. Range Filter hlc3 periyot 50 ile: s1 12/12 (çarpan 1,15–1,35), s3 3/3 (2,0–2,35) + dünkü 7/7, s6 3/3 (3,65–3,7). **Çarpan = 0,7 + 0,5 × Sensitivity** (s1 1,2 / s3 2,2 / s6 3,7) — üç ayara da uyuyor. Pine taslağı buna göre güncellendi.
- **28.10 20:30 — Buy/Sell'in Hammer'a şart olarak testi (research/tc/hamrf.cjs, s3):** W1 (bizim 833 sinyal): "RF durumu = sinyal yönü" şartı isabeti %24 → %28'e çıkarıyor ama eşleşenlerin %40'ını kaybettiriyor → **eklenmedi**. S1 adayları (1.500, isabet %1): RF şartı işe yaramıyor. Visivero S1'lerinin yalnız %7'sinde kapanmış mumlarda RF aynı yönde; %36'sında dönüş canlı mumda → S1 "dönüş anında" geliyor, RF ise aynı anda ya da sonra dönüyor. Sonuç: RF ilişkili ama S1'in tetikleyicisi değil.
- Pine: TP/SL fiyat etiketleri eklendi (Entry / Stop Loss / Take Profit 1–3 + fiyat), `scale = scale.right` (grafikle birlikte hareket).

### 28.10 akşam — TC Ribbon + Pine ölçek
- Ribbon (smoothing 5/8) = SMA(ohlc4,5) ve SMA(ohlc4,8). BREV 1m 4 ölçüm (TR 19:45, 20:05, 20:20, 20:33), hata ≤0.000005 (ekran yuvarlaması). Script: research/tc/ribfit.cjs.
- Pine artık pine/tc_klon_v1.pine ("TC Klon v1"). `scale=` parametresi KOYMA; v0'daki scale.right ayrı ölçek açtırıyordu, TradingView ayarı aynı adlı göstergede hatırladı → yeni adla çözüldü, mumlarla birlikte hareket ediyor.
- TP/SL (BREV 1m 20:34 Buy): Entry 0.08272, SL 0.08189, TP1-3 0.08354/0.08437/0.08520 — orijinalle birebir.
- Sıradaki eksikler: X (Mild), ▲▼ (Divergence), ◇ (Reversal).
- **Mild X = WaveTrend (hlc3) kesişmesi aşırı bölgede** (wt1 wt2'yi yukarı keser & wt2 < −L → mavi X altta; tersi kırmızı X üstte). Sensitivity'den bağımsız (s1/s6 aynı X'ler). 9 gözlem (28.10 TR 17:57–20:43, 27.10 20:22/20:49): wt(11–16, 13–15, 3) ±60 → 9/9 (±1 mum), 8/9 tam mum. Pine'da varsayılan (11,15,3) ±60 — parametre kesin değil. 27.10 21:24'te model X diyor, orijinalde aynı yerde ▲ var → Divergence aynı mumda X'i bastırıyor olabilir. Script: research/tc/mildfit2.cjs.
- **Divergence ▲▼ = WaveTrend(9,12,3) wt2 fraktal uyumsuzluğu** (Cipher B mantığı): 7 mumluk fraktal (3/3), dip ≤ −40 / tepe ≥ ~20; önceki geçerli fraktala göre fiyat daha düşük dip + wt2 daha yüksek dip → ▲ (tersi ▼). İşaret fraktal mumundan 2 mum sonra görünüyor. 7 gözlem (28.10 TR 08:37, 08:48, 16:24, 16:47, 20:59; 27.10 19:47, 21:25): 6/7, ~9 saatte fazladan 0. 08:37 ▲ hiçbir varyantta çıkmadı (açık soru). RSI pivot uyumsuzluğu denendi, tutmadı. Script: research/tc/divfit2.cjs. Pine'a eklendi (offset −1).
- Dikkat: 28.10 08:35/08:36 ve 15:36/15:37 TR'de yan yana iki X, 15:51/15:56 iki Buy, 16:03/16:06 iki Sell görüldü → bizim klonla orijinal 1 mum kayıyor olabilir; orijinal tek başına açılıp kontrol edilmeli.
- **28.10 21:15 orijinal/klon karşılaştırması (BREV 1m, TR 15:45–21:15, iki ayrı ekran):**
  - Buy/Sell farkı Pine'daki hatadan: orijinal Range Filter'da `src != src[1]` şartı var (JS rflib'de vardı, Pine'da yoktu). JS listesi orijinalle birebir (15:55B 16:06S 16:53B 17:46S 17:48B 17:58S 19:01B 19:04S 19:54B 20:22S 20:34B 21:13S). Pine düzeltildi. research/tc/rflist.cjs.
  - Mild X yeniden fit (18 X): **WT(9,12,4) ±53** → 17/18, fazladan 0 (eski 11,15,3 ±60 iki X'i kaçırıyordu). Pine varsayılanı güncellendi.
  - Divergence yeniden fit (9 ok): **wt2(9,12,3), 7 mumluk fraktal, tepe ≥20 / dip ≤ −40** → 8/9, fazladan 0; yeni 14:39 ve 14:55 TR ▼'leri önceden tahmin etti (örneklem dışı doğrulama). Kaçan yine 08:37 ▲.
- **DÜZELTME 28.10 21:40 — Buy/Sell kaynağı ohlc4, hlc3 değil.** BULLA 5m (orijinal tek başına, 15 etiket) + BREV 1m (12 etiket) birlikte: Range Filter **ohlc4**, periyot 50, çarpan 2,2 (s3) → 27/27 (fazladan 1 = ekranda üstte kesilen 17:28 Sell); hlc3 → 24/27. Önceki "src != src[1] hatası" teşhisim YANLIŞTI (JS'te o şart sonucu değiştirmiyor); asıl fark kaynaktı. Pine src = ohlc4 yapıldı. research/tc/rffit2.cjs. Not: TradingView mumlarının kapanışı Binance REST'ten bazen 1 tick farklı (20:05, 20:33 TR ölçümü).
- **28.10 21:55 — S/R ayrı Pine: pine/tc_sr_v1.pine ("TC S/R v1").** Ölçüm (BULLA 5m, orijinal S/R, TR 21:51): noktalı çizgiler 0.0792, 0.0731, 0.0690, 0.0637, 0.0593, 0.0559 = 5m pivot(10) değerleri 0.079, 0.07302, 0.0689, 0.0636, 0.05921, 0.05583. Bölge kalınlığı ≈ 0.0015 ≈ seviye ± cw, cw = (300 mum en yüksek − en düşük) × %2 = 0.00079 → "Zone Width %2" doğrulandı. AÇIK: hangi pivotların seçildiği. Denenen kurallar (research/tc/srsim2.cjs) en iyi 5/6; 0.079'u hiçbiri seçmiyor. Fiyatın içinde olduğu 0.0615–0.0622 pivot kümesi orijinalde YOK (gizleniyor olabilir). Pine kuralı: çok pivotlu bölge önce, eşitse yeni olan; 2×cw'den yakınlar tek; fiyatın içindeki bölge gizli.
- Bekleyen (Buy/Sell): BULLA 5m 21:35 TR'de bizim Pine Buy veriyor, orijinal ve JS vermiyor. v2'ye RF iç değerlerini gösteren hata ayıklama satırları eklendi (filtre/aralık/sayaç/kaynak); JS'te 21:35: filtre 0.061230, aralık 0.001368, kaynak 0.062480.

## 16. Video bilgi notları (UYGULANMADI — karar birlikte verilecek) — 28.10 23:45
- Kullanıcı kuralı: videolardan sadece bilgi toplanır, sisteme hiçbir şey eklenmez/değiştirilmez. İleride skill dosyaları + ajan planı var.
- Araçlar: C:\projeler\newbot\araclar (yt-dlp.exe, whisper.cpp, ggml-small.bin). İş akışı: parity/tools/video-al.cjs (ses+başlık) → VM'de ffmpeg 16kHz wav → tools/video-sira.cjs / video-yazi.cjs (whisper, TR). Metinler: terminal\video\<id>.txt (başında "# Video N: başlık"). Uzun videoda whisper "Abone olmayı unutmayın" döngüsüne giriyor → tools/video-parca.cjs (10 dk parçalar, -mc 0).
- 5 video: 1 Short işlemler (u7Ky5ZQrdPk), 2 FR + 4H uyumu (3PuWZBQF7dc), 3 Güne başlarken long/short (2ikBo26J_0U), 4 Swing Trade 1 (D5cQFW8Xi3g, ÖNEMLİ), 5 Swing Trade 2 (SVLqZA8BT10). Analiz: terminal\video\analiz.md.
- Öne çıkanlar: short'ta uyuma/kaç; BTC.D↑+BTC↓ = altcoin ezilir; FR merdiveni (−0,01→−0,02→−0,037→−0,047→−0,1) short'tan kaçış / long scalp fırsatı; 4H kapanışlar (03/07/11/15/19/23) öncesi scalp kapat; aynı anda en fazla 2 işlem; swing = günlük baz + 4H giriş, hedef 4H PMax / AutoPivot, RSI uyumsuzluğunda bir uç 30 altı/70 üstü; göstergeler arası uyumsuzluk (RSI vs WT Cross bar); Hammer "tek yıldız" = long çıkış teyidi; 4H gap/delist kontrolü.

## 17. Botlar V1 (30.10.2026 22:45) — Visivero'dan bağımsız ilk sürüm
- Karar (kullanıcı): Visivero takibi DURDURULDU (030-follow ve me-114-reporter kapatıldı, 30.10 22:34). Hammer ailesi için eldeki veri kullanılacak: data/ref/hammer*.jsonl (hammer-pro 39.371, hammer 12.348, hammer-pro-plus 6.847, 1d-hammer-pro 1.973 satır, son 30.10 21:39 TR).
- Son ölçüm (30.10): M1/M1P %96 yakalama (03:00 TR patlaması: bizde 2.640 vs VV 1.183 → isabet %77–79), 4S %95/%97, 4S Sniper %91/%96, 1DWS %75/%95, DIV %87/%78, FR %93/%85, Hammer Pro %10/%15. V3: Visivero 29.10 17:14 TR'den beri mesaj yayınlamıyor (API'de de yok).
- V1 = C:\projeler\newbot\terminal\botlar-v1 (VERSION 1.0.0). Botlar: M1, M1 Premium, 4S, 4S Sniper, 1DWS, DIV, FR, V3 (Hammer yok). Kendi motoru (parity engine kopyası, rules m1/four-s/div/flow), kendi data/ klasörü, web http://localhost:3200 (yalnız 127.0.0.1). start-v1.bat (motor + web + tarayıcı). Runner'dan: tools/v1-run.cjs engine|web (job adları v1-engine, v1-web).
- Parity laboratuvarı (me-100-live motor, me-094-web 3100–3102) şimdilik açık; V1 oturunca kapatılabilir (RAM: makine 85 GB, motor ~1,1 GB).
- Sıradaki: V1.1 Telegram mesajları.
- **31.10 — Kasa özelliği (V1):** Üst çubukta "Kasa" düğmesi (güncel kasa + dönem başı sermayeye göre %). Tıklayınca yarı saydam pencere: Yuzde30.xlsx'in aynısı (COIN/TARİH/SAAT/KAZANÇ/KASA/YÜZDE + NOT; özet: toplam kazanç, güncel kasa, kazanç %, hedef ×1,3, kalan, hedefe kalan %, günlük alınacak = kalan/kalan gün, maks. pozisyon = kasa×%10, işlem/kazanan, ilerleme çubuğu). Giriş: işlem sonrası kasa YA DA kazanç/zarar (kullanıcı kararı). 30 gün dolunca "Yeni dönem" (eski arşiv, yeni dönem güncel kasa ile). Raporlar sekmesi: yıllık / çeyreklik (Ç1–Ç4) / aylık. Excel'e aktar (ExcelJS CDN, orijinal formüllerle). Veri: botlar-v1\data\kasa.json (+ .yedek). API: GET/POST /api/kasa. Excel'deki Trader Club logosu bilerek konmadı.
