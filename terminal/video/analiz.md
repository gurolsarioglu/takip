# Scalper Tolga videoları — bilgi notu (UYGULANMADI)

28.10.2026 · Kaynak: whisper.cpp (small, Türkçe) ile yazıya dökülen metinler, `video\<id>.txt`.
Kural: Bu dosya yalnızca bilgi toplar. Sisteme (botlar, engine, web, Pine) hiçbir şey eklenmedi; kararlar birlikte verilecek.

Yazıya dökmedeki hatalı kelimelerin karşılıkları: "are say / aresay" = RSI · "vt crossbar / WT Crossbar" = WT Cross bar (WaveTrend kesişme göstergesi) · "linrek / limre" = LinReg (doğrusal regresyon kanalı) · "P-Max / P-Mex" = PMax · "içim oku" = Ichimoku · "Hemmer / Hemır / Emir" = Hammer botu · "FRE / ferey" = funding rate (FR) · "Nadara(ya)" = Nadaraya-Watson zarfı · "otopivot" = Auto Pivot göstergesi · "Vine / Vayne" = muhtemelen VINE coini · "yüdemi" = Udemy kursu.

---

## Video 1 — Bunları Öğrenmeden Short İşlem Açmayın (09.02.2025, 1:42:00)
https://www.youtube.com/watch?v=u7Ky5ZQrdPk
Not: Konuşmalı kısım ilk 17,5 dakika. Sonrası 1,5 saatlik canlı işlem kaydı (müzikli). Whisper o kısımda "Abone olmayı unutmayın" diye takıldı. 10 dakikalık parçalar halinde yeniden yazıya dökülüyor; konuşma çıkarsa bu bölüme eklenecek.

**Ana kurallar**
- Short = kısa. Short işlem açık bırakılıp uyunmaz: "Uyursan ölürsün." Başında bekleyemeyeceksen ya da bir yere gideceksen short'u kapat.
- Örnek (VINE, 1 saatlik): Short gece 23:00'te açılıp 02:45'te kapatılmış (+125 USDT, ~%120). Sonra 15 dakikada %40'lık fitil atmış; 10x'te %400. Bu, short'çuları patlatan fitil.
- Short'u destekleyen ortam: **BTC.D yükselirken BTC düşüyor** → altcoinler ezilir. Bütün coinler BTC ve dominansa bağlı, "aynı sepetteki yumurtalar". BTC.D artarken tek bir altcoinin ters yöne gitmesini umma.
- **Funding rate fitil uyarısı:** VINE'da FR adım adım negatif yönde büyümüş: 05:10–05:20 civarı −0,010 → −0,015 → −0,020 … 06:00'da −0,0367, 06:09'da −0,0473 (bot alarmı). Sonra "başındaki bir sıfırı atarak" −0,10'lara çıkmış. Okuması: spot-futures farkı açılıyor, short'lar kalabalık, fitil (short squeeze) riski çok yüksek. FR'yi short'tan **kaçış sinyali** olarak kullan.
- Fitilden sonra grafik bozulmadıysa (5 dakikalıkta LinReg negatif bölgede kalıyorsa) yeniden kısa short yapılabilir: "Isır ve kaç."
- **Pozisyon sayısı:** Aynı anda en fazla 2 işlem. Biri 4 saatlikte uyumsuzluğa dayalı long swing (sermaye yönetimiyle bırakılabilir, eklenebilir). Diğeri sadece scalp (volatilite botu, FR, günün en çok yükselen ve düşen coinleri). 8–9 coinde aynı anda işlem olmaz.
- **4 saatlik kapanışlar pivot:** Seanslar arası geçiş anları dönüş yeri. FR ödememek ve FR'de ters kalmamak için bu saatlere dikkat edilmeli.
- **Mesai:** Ya 07:00–19:00 ya 19:00–07:00. Karışık çalışmak uyku düzenini bozar.
- **Hedef:** Günde %1, ayda ~%30 (bileşik). Günde 3–4 saat çalışma.
- **Pratik düzen:** TradingView'da 3 pencere açılır, sembol senkronizasyonu kapatılır. Pencereler: işlem yapılan coin (1 saatlik), BTCDOMUSDT.P (1 saatlik), BTC. Hepsi Binance verisiyle, çünkü "lokomotif borsa Binance".

**Sayısal eşikler**
- FR: short'ta tehlike merdiveni −0,010 → −0,020 → −0,037 → −0,047 → −0,10 (adım adım artış = kaç).
- Fitil: 15 dakikada %40 (10x → %400).
- Aynı anda en fazla 2 işlem.

## Video 2 — Scalping'de Gizli Kalan Strateji: Funding Rate ve 4H Uyumu (27.07.2025, 22:38)
https://www.youtube.com/watch?v=3PuWZBQF7dc

**Ana kurallar**
- Örnek: GLM, günün en çok yükselen 2. coini. Günlük grafik yeşil ve zirvede, FR ~−0,35 (yeni başlamış). FR alarmı Hammer'ın içine görsel olarak gönderiliyor.
- Giriş: Heikin Ashi'de, 5 dakikalık grafikte "soldan 3. yeşil" mumda. Order book'a en geniş açıdan bakılıyor (en küçük fiyat adımına tıklanarak). Alış %56 / satış %43 → spotta da yükleniliyor.
- **Negatif ve büyüyen FR + zirvedeki coin = long scalp fırsatı** (short'çular yakıt). FR'nin −0,35'ten −0,40, −0,50, −0,60'a büyümesi yükselişin devam edebileceği anlamına geliyor. −0,91 "%1'e ramak kalmış".
- Sermaye yönetimi FR var diye bozulmuyor.
- **ÇIKIŞ: 4 saatlik mum kapanışı (03, 07, 11, 15, 19, 23).** Kapanıştan önce scalp kapatılır ("11'den önce kaçalım"). Kâr %35–%42'de alınmış.
- **FR ile long'dayken bir göz Hammer'da olsun:** Hammer "tek yıldız" ya da hızlı çıkış alarmı verirse long'dan çık. Ama bu hemen short aç demek değil.
- Kapanış öncesi 5 dakikalıkta uyumsuzluk başladı ve WT Cross bar kırmızıya döndü → çıkış teyidi.
- **"Kıskanç yenge":** 1 dakikalıkta Nadaraya zarfı çok darsa işlem yok; FR artarken dar zarfla yukarı fırlayabilir.
- Öğrenci örneği: FR −0,60 civarı long'a girmiş. Giriş anı: 1 dakikalıkta mum yeşerirken, FR artarken ve WT Cross bar yeşile dönerken.
- Gösterge listesi: Ichimoku (5 dakikalık), WT Cross bar, Nadaraya, LinReg, PMax, Heikin Ashi.
- Bilgisayar ve hızlı internet şart; telefondan işlem yapılmaz.

**Sayısal eşikler**
- FR −0,35 → başlangıç; −0,40…−0,60 → devam edebilir; ~−0,9 → çok aşırı.
- Seans kapanışları: 4 saatlik mumlar 03, 07, 11, 15, 19, 23 (TR saati).
- Kâr al: %35–40 (kaldıraçlı).

## Video 3 — Güne Başlarken Long mu? Short mu? Aramalıyım (29.03.2025, 13:16)
https://www.youtube.com/watch?v=2ikBo26J_0U

**Güne başlama sırası (yol haritası)**
1. Hangi gün, hangi saat? Hafta sonu, bayram ya da arife mi? Özel günlerde ya volatilite çok düşer ya da sert çöküş/pump olur.
2. **BTC günlük grafik:** Fiyat nerede, LinReg pozitif mi negatif mi, RSI kendi ortalamasını kesmiş mi, WT Cross bar rengi ne? Sonra 4 saatlik. Büyük zaman diliminden küçüğe bakılır.
3. **BTC.D:** "2×2=4 kuralı yok." BTC.D↑ ve BTC↑ → altcoinler ezilir. BTC.D↑ ve BTC↓ gibi varyasyonlar ayrıca okunur.
4. **Funding rate'ler:** Hangi coinde peş peşe yeşil var?
5. **Liste:** Günün en çok yükselen ve en çok düşen coinleri.
6. **Botlar:** Volatilite botu ve Hammer botu ("yıldızlı ünlemli alarmlar").
- Long mu short mu sorusunun cevabı tek bir göstergede değil; mesainin başladığı andaki "fotoğraf"ta.

**Önemli uyarı (MAVIA örneği)**
- 12:08 ve 12:18'de yıldızlı Hammer alarmı geldi; 5 dakikalıkta uyumsuzluk vardı; long'a girildi.
- Ama 4 saatlikte **mum boşluğu (gap) vardı**: hack ya da delist sonrası 4 saatte %72 çöküş.
- **"Her şey indikatör değil."** Alarm gelse de 4 saatlik ve günlük grafiğe geniş açıdan bakılmalı. Gap'leri Heikin Ashi daha iyi gösteriyor.
- Twitter'da (X) haber kontrolü yapılmalı.
- Sinyal paylaşanlara güvenilmemeli.

## Video 4 — Swing Trade Nasıl Yapılır? (17.01.2025, 18:45) — ÖNEMLİ
https://www.youtube.com/watch?v=D5cQFW8Xi3g

**Tanım ve çerçeve**
- 3 işlem şekli: Spot "8 Asker ve Karargâh", **Swing** (vadeli), Scalping.
- **Swing = günlük grafik baz alınarak 4 saatlik grafiğe göre girilen işlem.** 1 saati geçen işlemler swing sayılır. Hafta sonu dahil 1 haftaya kadar açık kalabilir.
- **Kaldıraç en fazla 10x.** Sermaye bölünür.
- **Stop-loss kullanmıyor.** Bunun yerine sermaye yönetimi (bkz. eleştiri notu).
- Ters giderse 2. asker eklenir (spotta −%25'te). 3. asker hiç kullanılmamış.

**Giriş kuralları**
- **Uyumsuzluk sadece mum ile RSI arasında değil, göstergeler arasında da olur:** RSI ile WT Cross bar arasındaki uyumsuzluk. Örnek: WT Cross bar kırmızı verip dibe geldiğinde RSI ~36. Sonra WT Cross bar aşağı, RSI yukarı yönlü. Arkasından yeşil → giriş.
- Teyitler: 5 dakikalıkta Ichimoku "yavaş yavaş kafasını çıkarıyor". **4 saatlikte fiyat kendi "mavi" çizgisinin üstünde, LinReg pozitif bölgede.**
- **Hedef = 4 saatlik PMax seviyesi** (örnekte +%70; mevcut %10 + %70 ≈ %90).
- Coin kalitesi: Fiyat yaklaşık 40 USD (spot ve swing için iyi). Maksimum arz 10 milyon (az olması iyi). Dolaşımdaki arz oranı (34). Çok sayıda borsada listeli olması (Binance, Bitget, MEXC, Gate, Bybit, Uniswap).
- 2. örnek (RUN): RSI kendi ortalamasını yukarı kesmiş, yeşil gelmiş, Nadaraya'ya dokunup dönmüş. Önceden çizilen yere alarm kurulmuş.
- Çıkış: "Gözünüze hoş görünen bir yer"; emir verilip beklenir. Kesin kural yok.
- FR hem Binance'ta hem işlem yapılan borsada takip edilir. Bot ayarları Binance'a göre.

## Video 5 — Swing Trade Nasıl Yapılır? 2 (21.01.2025, 15:20)
https://www.youtube.com/watch?v=SVLqZA8BT10

**Ana kurallar**
- **RSI uyumsuzluğu eşiği:** Uyumsuzluğun dip ya da tepelerinden en az birinin **30'un altında** (boğa) ya da **70'in üstünde** (ayı) olması gerekir. Videodaki örnekte önce bu koşul sağlanmış, sonra coin tekrar düşerken RSI uyumsuzluğu oluşmuş ve işleme girilmiş.
- **Çıkış hedefi:** 4 saatlikte Auto Pivot seviyeleri; en azından **PMax'in bir alt seviyesi**. SWARM örneği PMax'e kadar yaklaşık +%740 vermiş.
- **1 saatlik swing:** 1 saatlik grafik Heikin Ashi'ye alınır (en temiz görüntü). Hedef 1 saatlik LinReg'in üst bandı. Örnek ROM: ~1 saat 15 dakika sürmüş; günlük kırmızıyken bile 1 saatlikte swing yapılmış.
- **Stop yerine ekleme:** Ters giderse sermaye yönetimiyle 2. ekleme. "Coinlerin %90'ı sağlıklı değil", coin seçimi kritik.
- **Pratik:** 1 dolarla gir, 4 ve 8 saat sonra ne olduğunu izle, zaman kavramını otur.
- **Haber riski:** TRUMP ve MELANIA tokenleri Trump konuşurken çöktü. Haber kaynaklı hareketlerde aceleci olunmamalı. Örnek: Elon Musk Twitter logosunu Doge yapınca Doge short'u.
- **Hedef:** Aylık %30 (büyük sermayede ~%20). 5.000 USD sermayeyle günde ~50 USD, ayda ~1.500 USD.

---

## Bizim sistemle olası ilişki — SADECE NOT, karar sonra

| Konu | Videodaki bilgi | Bizdeki karşılığı | Olası kullanım (karar bekliyor) |
|---|---|---|---|
| FR botu | FR'nin adım adım büyümesi (negatif) = short'çu kalabalığı | FR botu Visivero ile %93/%86 eşleşiyor | (a) FR mesajına "short'ta kaç / long scalp fırsatı" yorumu; (b) FR merdiveni (−0,01→−0,1) için ayrı alarm |
| 4 saatlik kapanış | 03/07/11/15/19/23 öncesi scalp kapatılır | Yok | Sinyal Masası'nda "4 saatlik kapanışa X dk" sayacı |
| BTC + BTC.D | BTC.D↑ ve BTC↓ → altcoin ezilir, short ortamı | Watchlist'te BTC.D yok | Sinyal Masası'na BTC / BTC.D durum kutusu (1 saatlik yön) |
| Hammer | "Tek yıldız" ya da hızlı çıkış = long'dan çıkış alarmı | Hammer Pro klonu %54/%39 | Hammer'ı giriş değil çıkış teyidi olarak da kullanmak |
| Trader Club göstergesi | RSI–WT Cross bar uyumsuzluğu, 4 saatlik LinReg/PMax hedefi | TC Klon v2 (X / ▲▼ çözüldü) | ▲▼'nin videodaki "göstergeler arası uyumsuzluk" ile karşılaştırılması |
| RSI uyumsuzluğu | Dip/tepeden biri 30 altı / 70 üstü | DIV botu: anchor RSI 30 | Aynı mantık; DIV botu bu kuralla uyumlu |
| Gap / haber | 4 saatlikte mum boşluğu, delist, hack | Yok | Sinyalde "4 saatlikte gap var" uyarısı |
| Mesai / risk | Aynı anda en fazla 2 işlem; short'ta uyuma | — | İleride ajan ya da skill kuralı |

## Eleştiri notları (kullanıcı açık eleştiri istedi)
- **"Stop-loss kullanmıyorum, ters giderse eklerim":** Videodaki tek hayatta kalma sigortası "10x'i geçmemek + sermayeyi bölmek". Bu, coin sıfırlandığında ya da delist olduğunda (Video 3'teki MAVIA gap'i) tüm ayrılmış sermayeyi kaybettirir. Kendi örneği bile bu riski gösteriyor. Ajan ya da skill'e aktarılacaksa en azından likidasyon mesafesi ve gap/delist kontrolü şart.
- **"Ayda %30", "günde %1":** Doğrulanabilir bir performans kaydı yok. Videolar ayrıca eğitim satışı içeriyor (#reklam).
- **Kurallar ölçülebilir değil:** "Gözünüze hoş görünen yer", "2×2=4 yok". Bir ajan ya da skill için eşiklerin (FR merdiveni, RSI 30/70, 4 saatlik kapanış saatleri, en fazla 2 işlem) netleştirilmesi gerekecek.
- **FR işaret karmaşası:** Metinde "eksi" ve "0,0473" gibi değerler hem yüzde hem oran olarak geçiyor. Binance FR'si %0,01 (= 0,0001) birimindedir. Bizim FR botunun gösterdiği birimle eşleştirilip doğrulanmalı.

## Video 6 — Funding Rate Mucizesi (TrHqB9-aAEE, 8:59) — 10.11.2026, yalnızca bilgi
Anlatılan kurallar (videodaki sözlerden; uygulanmadı):
1. **FR merdiveni = gizli sinyal.** Funding eksi yönde adım adım büyüyorsa (örnek: −1,45 → −1,55 → −1,68 → −1,80 → −2,0) short'tan kaçılır, long denenir ("en az 10 defa deneyin").
2. **Hız önemli.** Artışlar ~10 dakikada bir geliyor (FR tarama mesajlarının aralığı); "pıtır pıtır artıyor" = devam.
3. **Frenleme = olgunlaşma.** FR bir değerde sabitlenince (örnekte −2'de 10+10 dk aynı) hareket yoruluyor.
4. **Referans borsa Binance** ("lokomotif").
5. **Saat/mum yapısı:** 4 saatlik mum kapanışları (TR 23:00 vb.) dönüm noktası; bir sonraki funding ödemesine kalan süre uzunsa ("sabaha kadar ödeme yok") hareket sürebilir.
6. **Tepeden short (videodaki işlem):** FR sabitlendi + 23:00 mumu açıldı + 5 dk grafikte fiyat "haddini aşmış" + fiyat DEMA9'a dokunurken short; düzeltme beklenir, düzeltme bitince çıkılır. Uyumsuzluk şartı aranmıyor.
7. Trend takibi için 1 saatlik Heikin Ashi kullanıyor.
Bizdeki karşılığı: FR botu tek adımı ("FR deeper", dakikada ≥0,009 puan) ve ≤ −%0,20 taramasını veriyor; MERDİVENİ (ardışık derinleşme, hız, sabitlenme) ölçmüyor. INIT örneğiyle uyumlu (−0,005 → −0,29 → −1,39).

## Video 7 — Canlı Yayında PUMP işlemi (W7mkuLL7_AQ, 50:11, REEF örneği) — 11.11.2026, yalnızca bilgi
Anlatılanlar:
1. **Mekanizma:** çok yükselen coine inatla short açılır → hacim oluşur → long'lar bastırır → funding eksiye gider → coin pompalanır ("short'çuların inadı mesafeyi belirler").
2. **FR botu "pump makinesi":** funding eksi yönde ilerlerken bot 🟢 mesaj atar; yeşiller **peş peşe, 2–3 dakika arayla** geliyorsa hareket sürüyor. Örnek: −0,16 (11:00) → −0,51 → −0,52 → −0,53 → −0,54 → −0,56 → −0,58. Yeşiller seyrekleşince "frene bastı". Botta filtre var ("her funding değil").
3. **Short'a girmeme kontrol listesi:** (a) günün en yükseleni mi? (b) funding eksi yönde artıyor mu? (c) Fibonacci uzatması nereyi gösteriyor? İkisi de "evet" ise short açılmaz. Funding −1, −2 görürse short kurtarılamaz.
4. **Zamanlama:** 4 saatlik mum kapanışları (TR 11:00, 15:00, 19:00, 23:00) referans; ideal giriş kapanışta, funding ilerlerken.
5. **İşlem yönetimi:** stoplu giriş, hep 10x ve aynı tutar; 10x'te ~%110 (fiyat %11) görünce çıkış; üst Fibonacci seviyesine alarm; sonra funding durumu ve 4 sa kapanışına göre short aranır. Borsalar arası funding farklıdır; referans Binance.

### Ölçüm: iddia veride tutuyor mu? (db/fr-seri.cjs — Visivero FR botunun 7.319 orijinal 🟢/🔴 mesajı, 15.09–30.10.2026, 432 coin, klines_5m)
Seri = art arda 🟢 (arada 🔴 yok, iki yeşil arası ≤ 6 dk). Giriş: mesajın geldiği 5 dk mumunun kapanışı.
- **Tek başına "merdiven = long" tutmuyor.** Serinin 3.–10+ yeşilinde long: 1 sa ort. −0,2…−0,4, 4 sa ort. −0,6…−2,0, 4 sa kazanan %44–49.
- **Derin funding long için kötü:** funding < −1 iken 3.+ yeşilde long → 4 sa ort. −%6,5…−%7,7, kazanan %20–35 (13 ve 11 coin; küçük örnek).
- **Bağlam belirleyici (3.+ yeşil):** coin son 24 saatte −%10…0 → 1 sa +%1,0, kazanan %76, 4 sa %73 (n=764, 73 coin). Coin ≤ −%10 düşmüşse → 4 sa −%4,3, kazanan %26. Günün yükseleni (≥ +%25) → 4 sa −%4,7 ama iki yöne de %5+ hareket %73–82 (çok oynak, yazı-tura).
- **Funding ödemesine < 30 dk kala long kötü:** 1 sa −%4,0, kazanan %23 (n=137, 21 coin). > 120 dk: 1 sa +%0,43, kazanan %65.
- **Erken ve hafif merdiven en iyisi:** funding 0…−0,2 arasında 3.+ yeşil → 1 sa +%0,55, kazanan %66, 4 sa %63 (n=668, 96 coin).
- **"Frenleme sonrası short" küçük ama tutarlı artı:** seri bittikten 10 dk sonra short → 1 sa +%0,6…+%1,4, 4 sa +%1,7…+%3,3; önce +%2 / önce −%2: %31–44 / %22–26 (n=250).
- **Haftadan haftaya çok değişken:** 7 haftanın 1'inde (12.10) %89 kazanan, 4'ünde %6–38. Örnekler birkaç coinde kümeleniyor → rakamlar gösterge, kanıt değil.
