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
- **07.11 — V1.2.0:** (1) Sinyal kartında "📥 İşleme girdim": Kasa'yı coin/saat/not ile hazır doldurur, işleme bot + yön kaydedilir; Raporlar'a "Bota göre" tablosu. (2) Coin detay paneli: karttaki coin adına tıklayınca sağdan açılır — mum grafiği (1m/5m/15m/1h/4h, Binance vadeli, sunucu /api/klines üzerinden), grafikte bütün botların sinyal işaretleri (▲/▼), son 48 saatin sinyal listesi, TradingView linki. Telegram göndericisi kullanıcı isteğiyle kapalı (bot kullanıcı tarafından engellenmişti, 01.11–07.11 arası 0 gönderim). Motor 01.11'den beri kesintisiz, hata 0. Runner'dan web yeniden başlatma: tools/web-restart.cjs + v1-run web.
- **07.11 18:30 — PostgreSQL 18.6** (19 henüz RC): zip kurulum C:\projeler\newbot\araclar\pgsql, veri botlar-v1\data\pg, 127.0.0.1:5433, kullanıcı/db "botlar", şifre botlar-v1\db\baglanti.json (otomatik, git'e girmez). Tablo signals (PK src_file+src_line), ingest_state, kasa_periods/kasa_trades (henüz boş; web hâlâ kasa.json kullanıyor). İlk aktarım: 9 dosya, 1.163.443 satır, bozuk 0, dosya=tablo ✓ (db/dogrula.cjs). DB 671 MB. db/yazici.cjs canlı izliyor (JSONL asıl kayıt olarak kalıyor). Servis: botlar-v1\servis\servis-kur.bat (UAC, kullanıcı çalıştırmalı) → BotlarPostgres servisi + "Botlar V1 Denetci" görevi (SYSTEM, açılışta; motor/web/yazıcı, çökerse yeniden başlatır, 03:30 pg_dump yedeği, data\kontrol\<parça>.yeniden ile yeniden başlatma) + çalıştırıcı Başlangıç klasöründe.
- **07.11 19:05 — Eski veri de veritabanında** (db/eski-yukle.cjs, dosyalar yerinde): vv_messages = Visivero orijinal mesajları 656.885 tekil (12 bot; m1 dosyasında 2, m1-premium'da 1 tekrarlı satır vardı), parity_signals = eski motorun 25–31.10 sinyalleri 719.678 (Hammer dahil). Dosya=tablo ✓. DB toplam 1.351 MB. Yüklenmeyen: parity/data/cache (~3,9 GB Binance mum önbelleği, yeniden indirilebilir), analysis (ara çıktılar). Servisler 18:57'de kuruldu ve çalışıyor (BotlarPostgres AUTO, NetworkService; Botlar V1 Denetci SYSTEM).

## V1.3.0 — Sinyal karnesi + veritabanı okuması (07.11.2026)
- klines_5m: 815 coin, 24.10'dan beri 5 dk Binance mumları (~3,4 milyon). db/mumlar.cjs her 5 dk'da günceller.
- karne_signals: db/karne.cjs tekrarsız sinyaller için 15dk/1sa/4sa getiri (sinyal yönünde), 1 sa MFE/MAE; 15 dk'da bir. fr'nin yönsüz özet mesajları hariç.
- Web: 📊 Karne butonu (/api/karne?days=1|3|7|14); coin panelinde son 7 gün sinyaller + sonuçları (/api/coinhist).
- Kasa: ana kayıt hâlâ data/kasa.json (+.yedek); her kayıtta kasa_periods/kasa_trades tablolarına da yansıtılır (gece pg_dump yedeğine girer).
- Denetçi PARTS'a mumlar + karne eklendi → yeni denetçi bir sonraki Windows açılışında (ya da servis-kur.bat tekrar) devreye girer. O zamana kadar runner işleri: mm2 (mumlar sürekli). Karne sürekli: kr3.
- İlk bulgular (30.10–07.11, tek piyasa dönemi, sinyaller aynı anda çok coinde geldiği için gerçek örnek sayısı daha az):
  - 4S 🟢: 411 sinyal, 1 sa kazanan %69, 4 sa ort +0,59%. En iyi grup. 4S 🔴 kötü (%32).
  - 4S Sniper "4H RSI DIVERGENCE": %68 (n=102).
  - M1 / M1 Premium 🟢: %43 kazanan, 4 sa −0,35% → takip edilirse zarar.
  - M1 Premium "1m✅5m✅" uyumsuzluk: 🟢'de %33, 🔴'de %26 → ters gösterge (sinyalin tersi %67–74).
  - V3, DIV, FR, 1DWS: yazı-tura civarı (%50–55).

## M1 Premium scalp testi (07.11.2026, 1 dk mumlar, 14.042 sinyal, 31.10–07.11) — data/rapor/scalp.json, db/scalp.cjs
- Kullanıcı tarzı: stopsuz, 5x/10x, hedef +%3–8 ROE; teyit varsa +%20–40. Çoğu zaman TERS (yorulma) işlem: 🔴'de long, 🟢'de short.
- +%3 ROE'ye 30 dk içinde ulaşma her grupta %70–90 → bu oran tek başına bir şey söylemiyor (oynaklık). Kalan işlemlerin zararı + komisyon ortalamayı eksiye çekiyor.
- TAKİP neredeyse her grupta eksi. Düz TERS (uyumsuzluk yokken) de eksi.
- Pozitif tek güçlü grup: 🔴 + 1m✅5m✅ (+ RSI5m≤20) → TERS long. Ama bu sinyallerin ~%65'i tek günden (05.11, piyasa çapında düşüş+toparlanma; 267 coin). 05.11 dışında ters-kazanan oranı ~%50 → kenar tek bir olaya dayanıyor, henüz kanıt değil.
- Stopsuz risk: 4 saat içinde fiyatın %10 ters gitmesi (10x tasfiye) tüm sinyallerin ~%10'unda oldu. 30 dk'lık işlemde tasfiye %0–2.
- Dar stop (−%10 ROE) kötü: %25–38 stopa takılıyor.

## M1-A "Volume:" satırı çözüldü (07.11.2026, V1.3.1) — db/hacim-agg.cjs
- Volume = (sinyal yönünün işareti) × canlı 1 dk mumun o ana kadarki hacmi (base) / önceki 60 kapanmış 1 dk mumun toplam hacmi × 100.
- Yani "bu dakikada, son 1 saatin hacminin yüzde kaçı işlem gördü". Hacim değişimi DEĞİL; işareti fiyat yönünden geliyor.
- Test: 28.754 Visivero mesajı (26.10 ve 29.10, 8 coin-gün), Binance aggTrades arşivi (data.binance.vision; 28.10 arşivde yok).
  Korelasyon .96, işaret %100, ±0,5 puan içinde %90; kalan fark mesaj saniyesi farkı.
- Elenen adaylar: 24s hacim değişimi, dk/önceki dk hacim değişimi, alış−satış akışı (işaret %88 ama büyüklük tutmuyor), VWAP.

## 10.11.2026 — AI ajan rehberi
- botlar-v1\AGENTS.md yazıldı: projenin tamamı (mimari, motor arayüzü, bot kuralları, veritabanı, web/API, Kasa, ölçüm bulguları, bilinen sorunlar, yol haritası önerileri). Yeni bir ajan önce onu okur; bu dosya (Takip.md) tarihli günlük olarak kalır.
- Durum: motor 07.11 22:23'ten beri kesintisiz (hata 0), DB 3,0 GB, signals 1,43 milyon, karne 47 bin tekrarsız sinyal. mumlar + karne hâlâ çalıştırıcıdan çalışıyor (servis-kur.bat tekrar çalıştırılmadı). klines_1m 07.11'de kaldı.

## 10.11.2026 — Orijinal Hammer + DIV sinyallerinin değeri (db/karne-vv.cjs, 15.09–30.10, 33.085 tekrarsız sinyal)
- klines_5m geriye uzatıldı: 787 coin, 15.09'dan itibaren (+8,65 milyon mum; db/mumlar-gecmis.cjs).
- Kontrol: aynı coinin 6 saat önceki anı. Ölçüler: 15dk/1sa/4sa getiri (sinyal yönünde), 1 sa MFE/MAE, ±%1'e hangisi önce, 1 sa oynama.
- **Hammer = hareket uyarısı, yön tahmini değil.** Hammer Pro: 1 saatte lehte ≥%1 → %55–79 (kontrol %27–38); 1 sa oynama %2,8–8,2 (kontrol %1,8–2,6). Ama "önce lehte %1" ≈ "önce aleyhte %1" (44'e 44).
- Yön kenarı olan alt gruplar: Hammer Pro #W1 🟢 (n=5.288): 15dk +0,25, 1sa kazanan %59 (kontrol %48), 7 haftanın 7'sinde 15dk ort. artı. #W1 🟢 + RSI1m ≤20 (n=713): %72, önce lehte %58 / aleyhte %26, 1sa +0,68. #W1 🟢 ⭐⭐⭐ (n=109): 15dk +1,14, %70. Pro+ #W1 🟢 (n=887): 15dk +0,60, %65, lehte ≥%1 %75.
- 🔴 Hammer sinyalleri: ilk 15 dk sinyal yönünde ortalama EKSİ (#S1 🔴 −0,26; ⭐⭐⭐ −0,81), MAE −%4,8…−%9 → stopsuz short için tehlikeli.
- #S1 🟢 yıldızsız (n=3.476): kenar yok (15dk +0,04, %54). #S1 🟢 hep RSI1m ≤30, #S1 🔴 hep RSI1m ≥70.
- **DIV: ölçülebilir değer yok.** 9.050 sinyal: 15dk ~0, 1sa kazanan %46–49, lehte ≥%1 %24–32 (kontrol %16). RSI ucu, strateji, hafta fark etmiyor.
- Günlük tekrarsız sinyal: Hammer Pro 315, DIV 224, Hammer 113, Pro+ 56, 1D Pro 22.

## 10.11.2026 akşam — Hammer #W1 çalışması + "Pompa" botu fikri
- Karar (kullanıcı): Hammer, #W1 üzerine kendi sürümümüz olarak kurulacak; ölçüt "aynı olayları yakala (±3 dk) + sinyal sonrası fırsat". DIV'e emek harcanmayacak. #S1 ertelendi.
- İndirme: klines_1m 20–30.10 (746 coin, iş mg1). Test: db/hammer-w1.cjs (10 kural adayı, örtüşme + sonuç + fazladanların kalitesi).
- Kullanıcı fikri: pompa başlangıcını yakalayan yeni bot (hacim girişi + OI + long/short + FR + uyumsuzluk). Binance OI/oran geçmişi yalnız 30 gün → db/turev-gecmis.cjs (oi_5m, ls_15m; iş tg1, mg1 bitince başlar, ~5 saat).

## 10.11.2026 19:20 — Pompa botu: 1. örnek INITUSDT (kullanıcı), db/ornek.cjs
- Kullanıcı işareti: giriş 09.11 18:25 TR (0,1308), çıkış 10.11 17:45 TR iğnesi (0,288, +%120). Çıkış kuralı (kullanıcı): short'lar likide olmuş, OI düşüyor / taze para yok, son iğne + yataya sarma → işlem biter, sonrası ilgilendirmez. Veriyi Binance "Data" sekmesinden 5 dk / 1 sa izliyor.
- Başlangıç ÖNCESİ görünen (hacim değil, konumlanma): genel hesapların yalnız %31–33'ü long (kalabalık short), üst hesap POZİSYON oranı %57 long, funding merdiveni −0,005 → −0,011 → −0,039 → −0,069 → −0,294 (4 saatlik), prim −%0,2…−0,5, fiyat dipten (0,1213) düşük hacimle toparlanıyor, OI yatay.
- Tetik: 19:25–19:40 TR, 15 dk'da +%3, hacim 3×→6× (önceki 24 sa ort.), OI artmaya başlıyor. Asıl kalkış 21:40–23:00: hacim 9–45×, OI +%6 → +%23.
- Süresince: OI sürekli arttı (+%88), kalabalık short kaldı (long %35–45), funding −0,68 / −1,02 / −1,39. Bitiş: 17:45 iğnesi hacim 129×, ardından saatlik OI %88 → %75.
- Alıcı payı (taker) hep ~%50 → bu örnekte ayırt edici değil.
- Mevcut botlar: M1 Premium 18:33–19:32 arası 🟢 + "5m✅ uyumsuzluk" (yorulma uyarısı) verdi → pompa başında YANLIŞ uyarı; DIV 20:06 🔴 yanlış. FR 🟢 "deeper" 19:41 doğru yönde.
- Hipotez (tek örnek, kanıt değil): "short sıkışması kurulumu" = kalabalık short + funding hızla negatifleşiyor + fiyat dip yapmış; tetik = ilk hacim genişlemesi + OI artışı.

## 10.11.2026 20:25 — Hammer #W1 testi (db/hammer-w1.cjs, hammer-w1-izgara.cjs; 20–30.10, 746 coin, 1 dk mum)
- klines_1m geriye uzatıldı: 20.10–30.10 (+11,6 milyon mum). Aday havuzu: data/rapor/hammer-w1-aday.json (485 bin WT kesişimi).
- **Tetik doğru:** "kapanan 1 dk mumda WT(10,21,4) kesişimi + wt2 ±53 + son 5 mumda Boost ≥1" Visivero #W1 olaylarının %89'unu ±3 dk içinde yakalıyor (1.958'in yalnız 114'ü hiçbir adayla eşleşmiyor).
- **İsabet tutturulamıyor ve tutturulması anlamsız:** Visivero'nun sinyal sayısı gizli bir durumla (yön nöbeti / 96 sa engel / yeniden başlatma seli) belirleniyor: 20–26.10'da 258/gün, 26–30.10'da 77/gün. Ayar döneminde isabet %57–60 iken sınama döneminde %15–18'e düşüyor; yakalama ise sabit (%73–80).
- Seçilen aday: wt2 ≥57, Boost ≥1, son 5 mumda RSI ucu ≤26,5, 24 sa aralık ≤%23, haftalık pivot ≤%9, aynı coin+yön 6 sa soğuma → ayar 334/gün yak. %76; sınama 395/gün yak. %80. 24 sa soğuma + aralık ≤%15: ~265/gün, yak. %73.
- Sonuç (sınama, bizim sinyaller): 🟢 15dk ~0, 1sa kazanan %56–59, lehte ≥%1 %66–70; 🔴 15dk +0,1–0,2, 1sa kazanan %60.
- **DÜZELTME:** 6 haftalık ölçümde #W1 🟢 1sa kazanan %59 çıkmıştı; bu 10 günlük pencerede orijinal #W1 🟢 yalnız %42 (15dk +0,14). Yön kenarı istikrarlı değil → Hammer yön sinyali değil, hareket uyarısı sayılmalı.
- Visivero'da olmayıp bizim verdiğimiz ("fazladan") sinyaller sonuç olarak daha kötü değil (🟢 %59'a karşı eşleşenler %42; lehte ≥%1 %72'ye karşı %49) — daha oynak coinlerden geliyorlar.
- Türev geçmişi indirmesi (tg1) 20:10'da başladı: 811 coin, ~5,5 saat.

## 10.11.2026 21:12 — V1.4.0: Hammer botu canlıda (rules\hammer.cjs, botId "hammer")
- Kullanıcı onayı: canlıya al, aynı yön tekrarı 24 saat. Ayar: wt2 ±57, Boost ≥1, RSI ucu ≤26,5, 24 sa aralık ≤%15, pivot ≤%9, aynı coin+yön 24 sa. Test: ~265 sinyal/gün, Visivero #W1 olaylarının %73'ü.
- Motor yeniden başlatılmadı (kural dosyası 15 sn içinde yüklendi, 21:11:43). Web BOTS'a eklendi (kart birleştirme 1 sa), karne GAP 1 sa (karne süreci yeniden başlayınca geçerli; o zamana kadar 15 dk).
- Mesaj: Hammer Pro biçimi (Strategy: #W1, Boost, RSI/SRSI 1m|5m|1h, WT, Pivot, FR). "BTC Status" satırı yok (kuralı bilinmiyor).
- Yapılacak: 1–2 hafta sonra Karne'den gerçek sonuç; #S1 yıldızlı sürümü ikinci aşama.

## 10.11.2026 22:10 — V1.4.1: kod incelemesi ve hata düzeltmeleri
- Ayrıntılı tablo: botlar-v1\AGENTS.md §13.1. Özet: (1) haftalık mum hizası perşembe → pazartesi (pivotlar yanlış haftadan hesaplanıyordu), (2) kopma sonrası geri doldurma 30 dk ile sınırlıydı, (3) mumlar.cjs Binance istek ağırlığını ~3 kat aşıyordu, (4) start-v1.bat ikinci motor başlatabiliyordu, (5) iki runner çalışıyordu, (6) web 48 saatten eski kartları atmıyordu, (7) BTC Status sabit yazıydı → kural: BTC son 10 dk aralık ≥ %0,5 = Volatilite (db/btc-durum.cjs: yakalama %99, yanlış alarm %3,4), (8) küçük sağlamlaştırmalar.
- Motor 22:08'de yeniden başlatıldı (motor dosyaları değişti; ~13 dk sinyal yok). Web yeniden başlatıldı. mumlar → mm4, karne → kr5, türev geçmişi → tg2 (eski runner kapatılınca işleri de öldü, kaldığı yerden devam ediyor).
- Excel'e aktarma tarayıcıda sınandı: dosya hatasız üretiliyor.
- 10.11 22:40 — Video 6 (TrHqB9-aAEE, "Funding Rate Mucizesi") dökümü ve kural özeti: video\TrHqB9-aAEE.txt, video\analiz.md. Pompa botuna aday özellikler: FR merdiveni (ardışık derinleşme sayısı, hızı), sabitlenme (frenleme) = çıkış/tepe işareti, funding ödemesine kalan süre, 4 sa mum sınırları.
- 11.11 00:55 — Video 7 (W7mkuLL7_AQ, "Canlı Yayında PUMP", REEF) dökümü + kural özeti + İDDİANIN ÖLÇÜMÜ (db\fr-seri.cjs): video\analiz.md. Sonuç: "funding merdiveni = long" tek başına tutmuyor; bağlam (24 sa değişim, funding seviyesi, ödemeye kalan süre) belirleyici; frenleme sonrası short küçük artı. Not: bu videonun parçaları (video\parca\W7_0x.txt) 10.11 22:43–22:54'te başka bir araçla zaten yazıya dökülmüştü; mevcut dökümler kullanıldı.

## 11.11.2026 08:10 — V1.4.2: FR mesajına bağlam satırları (kullanıcı onayıyla)
- rules\flow.cjs: 🟢 mesajlarına `Seri: N. 🟢 · X dk · toplam Δ`, `24s: ±x%` (+ günün ilk 10 yükseleninde 🔝 ve sırası), uyarılar (ödemeye < 30 dk, 24 saatte ≤ −%10, funding ≤ −1); 🔴 mesajına `Seri bitti`; yeni mesaj `⏸ FR serisi durdu` (3+ yeşillik seri 10 dk yeşil almayınca, yönsüz).
- Hangi sinyalin geldiği değişmedi (Visivero uyumu aynı). Motor yeniden başlatılmadı; 08:08:56'da yüklendi, hata 0. İlk canlı örnek: INITUSDT "Seri: 2. 🟢 … 24s: +38,4% 🔝 günün 1. yükseleni".
- Türev geçmişi indirmesi 01:46'da bitti: oi_5m 4,07 milyon satır, ls_15m 1,40 milyon satır (811 coin, ~30 gün). mumlar.cjs düzeltmesinden beri "Binance sınırı" beklemesi 0.

## 11.11.2026 08:20 — V1.5.0: TEK KAYIT = PostgreSQL (kullanıcı kararı)
- Web akışı artık signals tablosundan okunuyor (dosya okuma kaldırıldı); gecikme ~2 sn (yazıcı döngüsü 2 sn → 0,7 sn).
- Kasa'nın asıl kaydı veritabanı (kasa_periods/kasa_trades); her değişiklik tek transaction, hata olursa kullanıcıya döner. kasa.json → data\kasa-arsiv-2026-11-11.json (dondurulmuş arşiv). Ekle/güncelle/sil API'si sınandı, durum eski haline döndü (35 $, 0 işlem).
- JSONL günlük dosyaları motorun tamponu. Yazıcıya temizle() eklendi: data\ayar.json {"jsonlGun": N} varsa, tamamı aktarılmış ve N günden eski dosyaları siler (byte konumu = dosya boyutu VE tablodaki son satır = dosyadaki son satır şartıyla). AYAR DOSYASI HENÜZ YOK → hiçbir dosya silinmiyor; kullanıcı onayı bekleniyor (13 dosya, 656 MB; tabloda 1.496.650 satır; 11.11 gece yedeği var).
- OLAY: 08:16:28'de çalıştırıcı (runner) penceresi kapandı (çıkış kodu 0xC000013A = konsol kapatıldı) → onun başlattığı mumlar (mm4) ve karne (kr5) de öldü. Motor/web/yazıcı (denetçi) etkilenmedi. Kalıcı çözüm: servis-kur.bat'ın tekrar çalıştırılması (mumlar+karne denetçiye geçer). Çalıştırıcı yeniden açılana kadar uzaktan iş çalıştırılamıyor.

## 11.11.2026 12:05 — FR yakalamaları: liste + "hedefte çık" benzetimi
- db\fr-yakalama.cjs → fr_yakalama tablosu + data\rapor\fr-yakalama.json: 30.10–11.11, 277 coin, 799 yakalama (12 sa sessizlikten sonraki ilk 🟢; sonraki 48 sa). En iyiler: AKE 05.11 12:33 0,002192 → 0,006615 (+%202, 07.11 12:05), INIT 09.11 11:17 0,13299 → 0,30298 (+%128), LYN +%68, LSK +%43, BMT +%38. Ortanca tepe +%3,4 / ortanca dip −%3,3. Funding dibi ≤ −1 olanlarda +%10 görme %50 ama ortanca dip −%9,8. "Eksiye döndü" türünün çoğu (hisse sözleşmeleri dahil) gürültü.
- db\fr-islem.cjs (kullanıcının bakışı: hedefte çık, sonrasına bakma, aynı coine tekrar girme; stopsuz; 48 sa): 
  - 10x, ilk yeşilde giriş, coin başına tek işlem (277): fiyat +%3 → hedef %56 / tasfiye %10; +%5 → %39 / %13; +%10 (ROE 100) → %15 / %16; +%15 → %6 / %18. İşlem başı ortalama ROE ≈ 0 (−4…+2).
  - 10x, funding ≤ −0,10 olunca giriş (103): +%5 → %51 / %18 (ort +4); +%10 → %28 / %28 (ort −2). ≤ −0,50 (45): +%10 → %22 / %40 (ort −16).
  - 5x aynı tetikler: tasfiye %2–7'ye iniyor; ortalama yine ≈ 0…+4.
  - INIT örneği: funding −0,30'da giriş (09.11 11:31, 0,1365) → 3,4 saatte −%10,9 ile 10x tasfiye, +%128'lik yükselişten ÖNCE.
- Sonuç: FR sinyalinde mekanik giriş + hedefte çıkış bu 12 günde başa baş; 10x stopsuzda tasfiye oranı kazancı siliyor. Büyük hareket var, ama önce çoğu zaman −%5…−%10 geliyor → giriş yeri ve kaldıraç belirleyici.

## 11.11.2026 12:45 — FR + OI / long-short ölçümü (db\fr-oi.cjs) ve görev dosyası (botlar-v1\GOREV-FR-OI.md)
- Veri: 13.10–10.11, 409 coin, 1.971 yakalama (ilk yeşil) / 391 (funding ilk kez ≤ −0,10). Sonuç ölçüsü: long 10x stopsuz 48 sa, −%9,5'ten önce +%10.
- BEKLENENİN TERSİ: yakalama anında OI ve fiyat zaten artmışsa kötü (OI 4sa ≥ +%3,3 → hedef %19 / tasfiye %42 / ort −23,5; fiyat 24sa ≥ +%4 → %25 / %51 / −27,6); fiyat düşmüş ve OI şişmemişse iyi (fiyat 4sa ≤ −%2,7 → %41 / %26 / +12,6). Kalabalık SHORT (long ≤ %55) en kötü dilim; kalabalık long ≥ %66,5 iyi. Hacim 1sa ≥ 5× iyi. Funding ≤ −0,20 kötü, −0,10…−0,14 iyi.
- Birleşik puan (6 koşul) iki dönemde de aynı yön: FR ≤ −0,10 & puan 5–6 → n=76 (51 coin): hedef %57 / tasfiye %13 / ort +43 ROE (1. dönem +61, 2. dönem +14); puan 0–2 → %16 / %37 / −20. Kaçın işareti 2+ → %19 / %43 / −24.
- "OI zirveden −%5 → çık": fiyat zirveden −%5 kuralından iyi değil (tepenin ~%44'ü), çıkışların %62'sinde fiyat 4 sa sonra daha yukarıda → sinyal olarak yapılmayacak.
- "OI ve fiyat birlikte artınca gir": hemen girmekten kötü (tasfiye %25–34) → yapılmayacak.
- Uyarı: eşikler tüm veriye bakılarak seçildi; 30 gün tek dönem; olaylar kümeleniyor.
- Büyük hesap POZİSYON oranı indiriliyor (db\turev-poz.cjs → lsp_15m, iş tp1); ölçümü sonra.
- Görev dosyası başka bir ajanın kodlaması için: motor extras 'oi', flow.cjs bağlam satırları + Kurulum puanı + Kaçın işaretleri + "⭐ FR Kurulum" sinyali, türev verisinin sürekli güncellenmesi, kabul ölçütleri.

## 11.11.2026 — V1.6.0: FR botuna OI / long-short bağlamı + ⭐ FR Kurulum
- Görev: `botlar-v1\GOREV-FR-OI.md` (uygulandı). Ölçüm: `db\fr-oi.cjs` (30 gün, 799 yakalama).
- Motor artık bütün coinlerin OI'sini topluyor (açılışta 25 sa geri doldurma ~10 dk, sonra 5 dk'da bir). Oran döngüsü 150 → 600 ms (IP sınırı).
- 🟢 mesajlarına: OI 4sa/24sa, Fiyat 4sa/24sa, Long (kalabalık/büyükler), Hacim 1sa ×, Kurulum puanı (6 üzerinden) ve gerekiyorsa ⚠️ Kaçın.
- Yeni sinyal ⭐ FR Kurulum: puan ≥ 5 + en çok 1 kaçın işareti. A = yakalamanın ilk yeşili; B = yakalama içinde funding ilk kez ≤ −0,10.
  Geçmiş ölçüm (long 10x, stopsuz, 48 sa, hedef +%10): B n=76 → hedef %57, tasfiye %13; A n=155 → %25 / %12. Beklenen sıklık A ~5/gün, B ~2,7/gün.
  Uyarı: eşikler aynı veriye bakarak seçildi; 2. yarıda B tasfiyesi %31'e çıktı. Canlı Karne ile izlenecek.
- Yeni denetçi parçası `turev` (db\turev.cjs: oi_5m, ls_15m, lsp_15m 6 saatte bir). Kalıcı olması için servis\servis-kur.bat yeniden çalıştırılmalı.

## 12.11.2026 — Özgün strateji araştırması: "Panik Dibi"
- 24 aylık 5 dk mum arşivi indirildi (data.binance.vision, silinmiş coinler dahil; `botlar-v1\data\arastirma\k5`, `k5b`, `k5c`, ~5 GB). Betikler: `db\ozgun-arsiv.cjs`, `db\ozgun-arsiv-olay.cjs`, `db\ozgun-olay.cjs`, `db\panik-olcum.cjs`.
- Denenip elenenler: tek başına düşen coini almak, hacimli zirve kırılımı, dar bant kırılımı, OI/long-short ile coin seçimi, pump'a short.
- Tutan tek kalıp: piyasa paniğinde (coinlerin ≥ %20'si 24 sa'te −%10, ≥ %20'si 1 sa'te −%2, BTC 1 sa ≤ −%1) alıp 24 saat tutmak. 63 panik günü, 24 sa gün ortalaması +%4,1, günlerin %73'ü artı.
- Küçük hedefle (+%3) aynı sinyal 24 ayda kasayı ×1,2 yaptı; 24 saat bekleyince ×2,1–2,9 (3x, 5–10 pozisyon), yolda −%15 ile −%29 düşüş.
- Kullanım: `botlar-v1\KILAVUZ-PANIK.md`. Kodlama görevi (henüz yazılmadı): `botlar-v1\GOREV-PANIK.md`.

## 14.11.2026 — AKE incelemesi ve "pump önceden bulunur mu" ölçümü (bot değişikliği yok)
- AKE 13.11: 0,0026 → 0,0132. Öncesinde 16 saatte OI +%25 (fiyat yatay), iki deneme sıçraması; yükselişte kalabalık long %68 → %31, funding +0,005 → +0,10 (long'lar ödedi).
- Betikler (salt okunur): `db\pump-ara.cjs` (24 ay, saatlik panel → `data\arastirma\pump-panel.csv`), `db\pump-oi.cjs` (30 gün OI/oran → `pump-oi.csv`), `db\fr-gecmis.cjs` (funding geçmişi → `funding.jsonl`), `db\fr-arti.cjs` (henüz çalıştırılmadı).
- Sonuç: 24 ayda +%100 (48 sa) olayı 682, +%200 olayı 181. Sakin coinde taban olasılık +%50 için %0,9. Son 48 saatte ≥ %10 saatlik sıçrama varsa %4,3–6 (5–7 kat). "Fiyat yatayken OI artışı" tek başına olasılığı artırmıyor (%0,4). Kalkış saatinde giriş: %12–17'si +%50 görüyor ama %66–76'sı önce −%10 görüyor; hiçbir hedef/zarar yapısı iki yılda da artı değil.

## 15.11.2026 — V1.7.0: Terminal sayfası (izleme listesi + 4 grafik + OI/hacim)
- Görev: `botlar-v1\GOREV-TERMINAL.md`. Kodlama Opus 5.5, denetim: kod incelemesi, 67 ağsız test, sahte veriyle 1366×768 ve 1920×1080 ekran denemesi, gerçek sunucuda bütün `/api/t/*` uçları (`parity\tools\t-test.cjs`) ve tarayıcıda AKEUSDT.
- Yeni: `web\terminal.cjs` (tek Binance kuyruğu: istek arası ≥150 ms, `/futures/data` ≥700 ms, ağırlık >1.500 bekleme, 429/418'de durma), `web\public\terminal.html` (kendi canvas grafiklerimiz, dış betik yok), `db\test-terminal.cjs`, `db\terminal-deneme.cjs` (sahte veriyle 127.0.0.1:3299).
- Yeni tablo `izleme` (izleme listesi; ilk kurulumda BTC + ETH). `server.cjs` ve `index.html`'de yalnız yönlendirme ve iki bağlantı. Motor yeniden başlatılmadı; yalnız web.
- Adres: http://localhost:3200/terminal.html · sinyal sayfasında "📈 Terminal" düğmesi ve coin panelinde "Terminalde aç".

## 15.11.2026 — V1.7.1: Terminal dik düzen + RSI / SRSI / WT
- Kullanıcı isteği (TradingView telefon görünümü örneğiyle): 4 grafik 2×2 yerine **yan yana 4 dik sütun**; her grafiğin altında RSI(14)+SMA14, Stokastik RSI K/D, WaveTrend(10,21,4) ve kesişim noktaları. `RSI · SRSI · WT` kutusuyla kapatılır. OI paneli 200 → 160 px.
- Yalnız `web\public\terminal.html` değişti. Gösterge hesabı `lib\ind.cjs` ile 800 mumluk rastgele seride karşılaştırıldı: fark 0. 67 test geçti; sahte veriyle 1366×768 ve 1920×1080 ekran denemesi, konsol temiz.

## 15.11.2026 — V1.8.0: Terminalde Trader Club katmanları
- Kullanıcı isteği: TC 5in1 + S/R + Buy/Sell grafik üzerinde, tek tek açılıp kapanabilir. `TC göstergeleri ▾` menüsü: Buy/Sell, TP/SL, Mild X, uyumsuzluk ▲▼, Ribbon, Reversal Bands, S/R. Formüller `parity\pine\tc_klon_v2.pine`, `tc_sr_v1.pine` ve `parity\research\tc\rflib.cjs`'den taşındı.
- Yalnız `web\public\terminal.html` değişti. Buy/Sell, `rflib.cjs` mantığıyla 3.000 mumluk rastgele seride karşılaştırıldı: 24 sinyal, fark 0. Diğer katmanlar (Mild X, uyumsuzluk, bantlar, S/R) yalnız Pine'dan birebir aktarıldı, TradingView ile yan yana karşılaştırılmadı. Pine'daki açık noktalar aynen geçerli (S/R seviye seçimi 5/6, bant adımı yaklaşık, ◇ Reversal yok).
- 67 test geçti; sahte veriyle 1366×768 ve 1920×1080 ekran denemesi, konsol temiz.

## 15.11.2026 — V1.9.0: Terminal — tüm evren + delist uyarısı, alt paneller (ME / Funding / OI / TP), piyasa özeti
- Kullanıcı isteği 1 (12:38): izleme listesi motorun taradığı bütün coinler olsun, yeni/delist kendiliğinden güncellensin, delist olacaklarda uyarı. `GET /api/t/evren` (`exchangeInfo`, 5 dk). Liste kipleri `Tümü` / `Listem`; ☆ ile Listem'e ekleme. Delist kaynağı: Binance'in `deliveryDate` alanı (duyurudan sonra kapanış zamanına çekiliyor; normalde 2100).
- Kullanıcı isteği 2 (23:16, TradingView ekran görüntüsüyle): WT'nin altına Market Exposure, Funding Rate, Open Interest, Trader Positioning; listenin altına "Market Overview" benzeri özet (OI, emir defteri, long/short poz., trader positioning, market exposure, funding + geri sayım, 24s hacim). Market cap yok (Binance vadeli API'sinde bulunmuyor).
- Binance payı: motor `/futures/data` uçlarını ~200 istek/dk kullanıyor (oran döngüsü), bu yüzden alt paneller geçmişi veritabanından (`ls_15m`, `lsp_15m`, `oi_5m`; 796 coin, 12.10'dan beri, turev 6 saatte bir) alıyor; Binance'ten yalnız son 24 saat (coin başına 5 dk'da 4 istek). Emir defteri `depth` (ağırlık 5) 15 sn'de bir, yalnız seçili coin.
- Değişen: `web\terminal.cjs`, `web\public\terminal.html`, `db\test-terminal.cjs` (74 test geçti), `db\terminal-deneme.cjs`. Sahte veriyle 1366×768 ve 1920×1080 ekran denemesi, konsol temiz. Motor yeniden başlatılmadı.
- Denenmeyenler: gerçek bir delist duyurusu sırasında `deliveryDate` davranışı yalnız Binance belgesine dayanıyor; `topLongShortPositionRatio` yanıtındaki alan adı (`longAccount`) gerçek veride doğrulanacak.
- Gerçek veride doğrulandı (15.11 23:27): evren 796 coin (motorla aynı; ilk sürümde yalnız tam `PERPETUAL` süzülüp 560 çıkmıştı, `TRADIFI_PERPETUAL` gibi türler eklendi), `topLongShortPositionRatio` alanı `longAccount` dolu geliyor, ARIA'da veritabanı + Binance birleşimi, funding aralığı 4 sa doğru. O an duyurulmuş delist yok.

## 19.11.2026 — V1.9.1: Grafik gösterge motoru
- RSI, Stoch RSI, WaveTrend/WT Cross ve TC hesapları çizimden ayrıldı. Mum ve sonuç önbelleği grafik başına tutulur. Sayfa açılışında kaydedilen çizgi göstergeleri Alt paneller menüsünde görünür.
- V1.9.0 çıktısıyla 7 zaman dilimi × 500 örnek mum karşılaştırıldı. RSI, Stoch RSI, WaveTrend ve TC hesaplarında fark çıkmadı. Dört ayrı zaman dilimi, gecikmiş yanıt, eski mum düzeltmesi ve hatalı gösterge ağsız testlerle sınandı.

## 19.11.2026 — V1.10.0: Dört grafik ve sağ panel
- Onaylanan düzen uygulandı. Grafikler solda yan yana, sağda izleme listesi ve altında dokuz bot. Ayırıcılar fare veya klavyeyle çalışır ve genişlikler yerelde saklanır. Seçilen botun akışı tek satırlı ve en yeni öncedir. Sembol tıklaması dört grafiği günceller.
- `Göstergeler` menüsünde taze profilde RSI, Stoch RSI ve WT Cross açık gelir. Kayıtlı tercihler korunur. Piyasa özeti açılınca gerektiğinde yalnız bir grafikten türev verisi yüklenir.
- Canlı akış oturum, gecikme ve sıralı güncelleme bilgisi taşır. PostgreSQL arşivinde sembole göre, isteğe bağlı bot/yön ile 90 güne kadar sayfalı salt okunur sorgu eklendi. Bu kopyada canlı arşiv kapsamı ölçülmedi.
- 42 otomatik test başarılı (mevcut 74 terminal kontrolü dahil). Yerel örnek verili Chromium testinde sinyal seçimi, ham mesaj, arşiv sayfalama, göstergeler, zaman dilimleri, fare/klavye ayraçları ve genişlik kalıcılığı doğrulandı. 1366, 1920, 1024 ve 390 piksel genişlikler sınandı.
