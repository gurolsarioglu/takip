# DIV, 4S Sniper ve Hammer Pro+ — araştırma durumu

Kullanıcının önceliği bu üç bağımsız bottur. Nihai hedef, yalnız Binance piyasa verisiyle aynı sembol/yön/stratejide ve yakın zamanda sinyal üreterek Visivero ihtiyacını bitirmek. Bu rapor tam eşleşme veya üç botun çözüldüğü iddiası değildir.

## Kanıt kümesi

- İlk araştırma: her bottan 100, toplam 300 özgün API mesajı. Binance FUTURES; USDT ve USDC. Şifre, cookie veya token kullanılmadı. Bilinen salt okunur `/api/bot-messages` rotası normal HTTP isteğine 200 JSON döndürdü.
- İlk 300 kayıttan bağımsız ek aramalar: Hammer R1 için API'nin döndürdüğü 92 kayıt (`hasMore=false`); Sniper `1dws` alt kanalından 100 kayıt (`hasMore=true`). R1 kümesindeki bir kayıt ilk 300 içinde de var; sayılar benzersiz toplam gibi toplanmamalı.
- İlgili zaman dilimlerinde 500 mum isteği hatasız kaydedildi: 199 adet 1h, 101 adet 4h, 100 adet 1m, 100 adet 5m. İlk sınırlı keşif ayrıca h4/daily örneklerini içerir; bunlar bağımsız örnek sayısı değildir.
- `createdAt` API kayıt zamanıdır. Gerçek tetik anı ile aynı olduğu doğrulanmadı. Referans kayıt zamanı, Binance işlem zamanı ve yerel gözlem zamanı ayrı tutulur.
- REA: `ev_911f0212a68650ab7058f323bee0299f621ca609b4d37d68c9800ebb2fce89dc`. `0-qg45til74n9.js` inert ayrıştırıldı: 404087 AST düğümü, 58 bulgu, 0 parse hatası. Diğer 38 dosya bu çalışmanın dışında kaldı. REA sunucu bot kodunu elde etmiş değildir.
- Kaynak demet SHA256: `29920c343683e713e7fd3a30e2cf402c21068a912432d50575567b513e1374a2`. 10 Python grafik şablonu çalıştırılmadan çıkarıldı. Byte aralıkları ve ayrı SHA256 değerleri `three-bot-evidence/template-manifest.json` içinde.

## 4S Sniper

100 standart kanal kaydı: 51 NW DOWN, 40 NW UP, 6 4H RSI DIVERGENCE, 3 4H RSI SMA CROSSED. Günlük/haftalık `1dws` ayrı akıştır; standart kanalla eşitlenmemeli. Burada NW, 4H RSI ve 1D alt stratejileri var. Haftalık davranış bu sınırlı örnekte kanıtlanmadı.

**NW için güçlü aday:** Trader Club 5in1 grafik şablonunun varsayılanı `h=8`, `mult=3`, `source=close`, `repaint=true`, en fazla 500 mum.

Son 500 kapanış için `w(i,j)=exp(-(i-j)^2/(2*8^2))`; merkez `mu_i=sum(w(i,j)*C_j)/sum(w(i,j))`. Hata bandı `E=3*mean(abs(C_i-mu_i))`. Üst `U_i=mu_i+E`, alt `L_i=mu_i-E`. Aday NW UP: son kaynak fiyatı alt bandın altında; NW DOWN: üst bandın üstünde.

İlk 91 NW kaydında, kapanmış geçmişe mesajın fiyatını canlı close olarak ekleyen aday **91/91** yön koşulunu sağladı. Yalnız son kapanmış mum kullanımı 89/91; yalnız yeni bant kesişimi 27/91. Bu ayrım, sadece yeni kesişim aramanın birçok referans mesajını kaçırabileceğini gösteriyor.

**Ayrı kontrol:** Adaylar `three-bot-hypotheses-2026-10-20.json` dosyasında sabitlendikten sonra yeni mesaj kimlikleri alındı. 20 yeni NW kaydından 19'unda kayıt zamanında veya öncesinde Binance aggregate trade bulundu. Referans fiyatı hesap girdisi yapılmadan, bu bağımsız fiyatla **19/19** bant yön koşulu sağlandı. GMEUSDT için 2 sn ve 30 sn pencerelerde işlem bulunamadı; puanlanmadı. İşlem bulunamaması strateji uyumsuzluğu veya başarısı sayılmadı. Bu geçmişte oluşmuş ama model belirlenirken görülmemiş bir örnek penceresidir; ileriye dönük canlı test değildir.

Bu oranlar pozitif koşul uyumudur. Tüm sembol evreninde negatif zamanlar taranmadı; precision, recall, tam sinyal eşleşmesi veya zaman gecikmesi ölçülmedi. Güncel fiyatı referans kayıt anında almak, olası gerçek tetik/kayıt gecikmesini çözmez.

RSI14/SMA14 canlı kesişim adayı, standart kanaldaki **3/3 RSI SMA CROSSED** örneğinde yönü açıklıyor. Üç örnek tam bir kuralı kanıtlamak için azdır. RSI divergence kısmı henüz açıklanmadı.

## Hammer Pro+

100 kayıtta 55 W1, 44 S1, 1 R1 var; yönler her alt stratejide ayrıca ele alınmalı.

**W1 için güçlü aday:** son kapanmış 1m mumda WaveTrend kesişimi **55/55** örnekte doğru yönde. 5m WT kesişimi bu örneklerde 0/55; canlı mumla yaklaşık WT aynı sonucu vermiyor. Mesajdaki `WT: 1m` etiketi bu bulguyla tutarlı.

WT formülü: `AP=(H+L+C)/3`; `ESA=EMA10(AP)`; `d=EMA10(abs(AP-ESA))`; `CI=(AP-ESA)/(0.015*d)`; `WT1=EMA21(CI)`; `WT2=SMA4(WT1)`. Yukarı: önce `WT1<=WT2`, şimdi `WT1>WT2`; aşağı bunun tersidir. Gösterge şablonunun OB/OS seviyeleri 60/53 ve -60/-53'tür; botta hangi filtrelerin kullanıldığı henüz kanıtlanmadı. Test mevcut yerel WT hesaplayıcısını kullanır; TA-Lib/Pine başlangıç ve eşitlik sınırları ayrıca sınanmalı.

**S1:** canlı RSI14'ün SMA14 kesişimi, referans fiyatından yapılan yaklaşık hesapla 37/44 örnekte görülüyor. Yalnız kapanmış mumda 1/44. Eksik 7 örneğin bazılarında mesajdaki RSI ile fiyattan yeniden hesaplanan RSI da ayrılıyor; tetik/gösterim zamanı ve yuvarlama çözülmeden eksikleri eşik değiştirerek kapatmak doğru olmaz. Stoch K/D kesişimini doğrudan S1 saymak da örnekleri açıklamıyor.

**R1:** ek sorguda 09.07.2026–19.10.2026 aralığında 92 kayıt döndü; tamamı aşağı yönlü, 1m RSI değerleri 71–85 arasında. Bu, yukarı yönün olmadığı veya kesin eşik 70 olduğu kanıtı değildir. İlk kümeye göre tek örnekle karar vermek yerine geniş tarihçe artık hazır. R1 formülü henüz çözülmedi.

W1 eşleşmesi tek başına Hammer Pro+ değildir. Ek RSI/WT filtreleri, hareket ölçüm penceresi/Boost, yıldızlar, aday evreni, tekrar koşulları ve strateji önceliği bekliyor. Kullanılmayan yeni W1 kimliği bu ayrı kontrol penceresinde gelmedi; W1 için ayrı kontrol oranı verilmedi.

## DIV

100 kayıtta 97 adet 1H RSI DIVERGENCE, 2 adet 1H RSI SMA CROSSED, 1 adet 4H RSI DIVERGENCE var. RSI14/SMA14 canlı kesişim adayı iki SMA örneğinin ikisini açıklıyor.

RSI göstergesinin gömülü özgün Pine'ı, RSI pivotlarında 5 sol/5 sağ mum, regular divergence ve 5–60 bar aralığı kullanıyor. Çıkarılan Python RSI şablonunda divergence hesaplaması uygulanmış değil. 5in1 ise HIGH/LOW fiyat pivotu, regular+hidden, 20 pivot/200 bar arama ve ara çizgi ihlali kontrolü kullanıyor. İki farklı adaydır.

1H divergence kayıtlarında standart RSI pivotu adayı tam kayıt mumunda **0/97**; 5in1 RSI fiyat-pivot adayı yalnız kapanmış veriyle **1/97**, canlı fiyat teyidi yaklaşımıyla **11/97** yön koşulunu sağladı. Yerel 2-komşu/30-bar divergence kuralı da 98 DIV divergence örneğinin yalnız 4'ünde yönü açıklıyor. Bu sonuçlar mevcut adayların bu biçimiyle yetersiz olduğunu gösterir; farklı teyit zamanı/state penceresi ihtimalini dışlamaz.

DIV çözülmüş sayılmaz. Yeni üretim divergence eşiği uydurulmadı.

## Veri ve doğrulama sınırları

- Geçmiş Binance mumlarının `closeTime < createdAt` koşulu uygulanır. Sonradan tamamlanan canlı mumun final H/L bilgisi kullanılmaz.
- `PriceApprox`, yalnız RSI/close temelli deneyde referans fiyatını ekler; gerçek intrabar OHLC değildir. Canlı fiyat-pivot adayında bilinmeyen H/L NaN bırakılır; yeni sağ-mum pivot teyidi kaçabilir. Bu eksik bilgi tam başarısızlık kanıtı değildir.
- Repaint bantları her kayıt anına kesilmiş veriyle yeniden hesaplanır; gelecekteki bantlar geçmişe taşınmaz. Grafik üzerindeki geçmiş ok konumu, teyit anı değildir.
- Aynı sembolün USDT/USDC kontratları farklı piyasalardır. Sniper'ın 1dws alt kanalı ve Bybit kapsamı bu 4h modelin dışındadır.
- Üretimdeki `local-hypothesis-v1` bu araştırma adaylarıyla değiştirilmedi. Bu turdaki araçlar `review/` altında; emir, Telegram, canlı arşiv veya bot yeniden başlatması yok.

## Yeniden çalıştırma

`node --test review/three-bot-research.test.cjs review/three-bot-candidates.test.cjs` saf çevrimdışı testtir. `node review/three-bot-candidates.cjs` kaydedilmiş mumlarla sonuçları yeniden üretir; sonuç dosyasına yazar. `node review/three-bot-research.cjs extract` inert kaynak çıkarır. `collect`, `supplements`, `candles`, `expand`, `holdout` ağ ve araştırma dosyası yazımı içerir. Yeniden collect/holdout mevcut örnek dosyalarını günceller; tarihsel kıyas korunacaksa yeni run klasörüne uyarlanmalıdır. Ham mum/işlem dosyaları yerelde tutulur ve Git'e dahil edilmez; bunlar olmadan sayısal karşılaştırma yeniden üretilemez.

## Tam bağımsızlık için kalan kabul ölçütleri

1. NW/W1 için tüm piyasa evreninde ileriye dönük bağımsız tarama; referans sessizken fazla sinyalleri de sayma.
2. DIV divergence, Hammer S1/R1 ve Sniper daily/week alt stratejilerinin ayrı kuralları.
3. Tarama sırası/periyodu, kurulum/teyit/iptal ve restart sonrası tekrar davranışı.
4. Hesaplamada referans fiyatı veya mesajı kullanmadan bot/sembol/yön/strateji bazında bire bir karşılaştırma ve zaman farkı dağılımı.
