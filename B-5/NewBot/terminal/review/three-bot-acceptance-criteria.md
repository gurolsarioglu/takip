# Üç bot için bağımsızlık ve sinyal eşleşmesi kabul ölçütleri

Bu belge DIV, 4S Sniper ve Hammer Pro+ botlarını ayrı strateji ve zaman dilimleri olarak değerlendirir. Bir botun sonucu diğerinin sinyal sayısına veya performansına eklenmez. Hedef, Visivero erişimi olmadan Binance halka açık verileriyle aynı sinyal olaylarını aynı zamanda üretmektir.

## “Visivero bağımlılığı bitti” demek için gereken kanıt

Bu ifade ancak aşağıdaki koşulların tümü sağlandığında kullanılmalı:

1. **Algoritma sürümü dondurulmuş olmalı.** Her bot için sembol evreni, borsa/piyasa, zaman dilimi, indikatör kaynak ve periyotları, mumun açık/kapalı kullanımı, ısınma uzunluğu, sinyal filtreleri, tekrar/cooldown ve olayın zaman damgası tanımlanmalı. Bir bot içindeki farklı alt stratejiler (ör. Hammer S1, R1, 1DWS) ayrı ölçülmeli.
2. **Aynı girdi penceresi iki tarafta da eksiksiz olmalı.** Binance mumları/işlemleri ve referansın tüm sinyal kayıtları aynı sembol, piyasa, strateji ve zaman aralığı için saklanmalı. Referansta yalnızca oluşmuş sinyal kayıtları varsa, yerel botun “fazladan” sinyalini sayabilmek için aynı dönemde taranan sembol ve zaman aralıklarının tam listesi de tutulmalı.
3. **Kural geliştirme ve başarı ölçümü ayrılmalı.** Eşik/parametre araması eğitim aralığında yapılmalı; seçilen sürüm ve parametrelerin hash’i dondurulduktan sonra daha önce görülmemiş bir holdout aralığında değiştirilmeden ölçülmeli. Holdout sonucuna bakıp ayar değiştirilirse yeni bir holdout gerekir.
4. **Her olay birebir eşleştirilmeli.** Bot, alt strateji, sembol, yön, borsa, piyasa ve tetik zamanı anahtardır. Aynı referans olayına en fazla bir yerel olay eşlenir. Eşleşme toleransı önceden seçilir; ayrıca kesin zaman farkı dağılımı raporlanır. Referansın `createdAt` alanının tetik zamanı olduğu kanıtlanmadıkça bu alan yalnızca kayıt zamanı sayılır ve “aynı anda” ölçüsü olarak sunulmaz.
5. **Yalnızca sinyal doğruluğu değil, eksiksizlik de ölçülmeli.** Her bot/alt strateji için doğru eşleşme (TP), kaçırılan referans olayı (FN), yerel fazla olay (FP), değerlendirilemeyen olay ve veri kapsama oranı raporlanır. Recall = TP/(TP+FN), precision = TP/(TP+FP), F1 = 2·precision·recall/(precision+recall). Boş veya eksik veri aralıkları başarı sayılmaz.
6. **Tekrar ve zamanlama ayrıca karşılaştırılmalı.** Aynı sembolde aynı yönde tekrar sinyal aralığı, sinyal kümelenmesi, sinyal başına gecikme (medyan ve p95), mum kapanışına göre tetik zamanı ve bot/alt strateji başına sinyal sıklığı çıkarılır. Yön doğru olsa bile geç veya yinelenmiş sinyal tam eşleşme değildir.
7. **Çalışma anında Visivero gerekmemeli.** Dondurulmuş yerel uygulama sadece Binance verisiyle çalıştırılır; Visivero kapalı veya erişilemezken sinyalleri üretir. Ağ kayıtlarında Visivero DNS/HTTP isteği bulunmadığı ve süreç yeniden başladığında yerel durumun doğru kurulduğu gösterilir. Bu aşamada emir gönderimi kapalı tutulur.

## Önerilen kabul kapısı

Kullanıcının hedefi “aynı sinyaller, aynı anda” olduğu için rapor tek bir başarı yüzdesine indirgenmemeli. Kesin iddia için aynı test penceresinde her bot ve alt stratejinin tüm değerlendirilebilir olayları birebir eşleşmeli; FP ve FN sıfır olmalı; veri kapsaması %100 olmalı; zaman farkı seçilmiş toleransın içinde kalmalı. Zaman toleransı, referansın tetik zamanı ve ölçüm çözünürlüğü belirlendikten sonra, holdout görülmeden önce yazılı olarak sabitlenmeli. Daha düşük oranlar yalnızca ölçülen kısmi benzerlik olarak raporlanmalı.

İlk operasyonel kanıt olarak bir kesintisiz gölge çalışma dönemi önerilir. Süre, her bot/alt stratejinin yeterli sayıda sinyal örneği üretmesine göre seçilmeli; ayrıca en az bir tam yüksek zaman dilimi mum çevrimi ile yeniden başlatma senaryosu kapsanmalı. Sinyal sayısı yetersiz alt strateji için süre uzatılır; örnek azlığı başarı kabul edilmez. Bu dönemde referansla paralel kayıt alınır ve algoritma dondurulur.

## Şu anki kanıt ve açık kalanlar

- **4S Sniper:** İlk örneklemde Nadaraya–Watson yön durumu referansla yakından örtüşüyor; ek olaylarda Binance aggTrade fiyatıyla 19/19 değerlendirilebilir yön durumu sağlandı. Bu, event parity değildir: örneklem küçük, yeni W1 holdout olayı yok ve tekrar/cooldown, tam olay zamanı, sembol evreni ile fazla sinyal oranı henüz ölçülmedi.
- **Hammer Pro+:** İlk örneklemde W1 olaylarının 55/55’i son kapanmış 1 dakikalık WaveTrend kesişimiyle yön bakımından açıklanıyor. Bu, kural hipotezini destekler; tam sinyal eşleşmesini, S1/R1/1DWS alt stratejilerini, tekrarları veya gecikmeyi kanıtlamaz.
- **DIV:** Sinyal türleri arasında dağılım ve küçük RSI/SMA kesişim örneği görüldü; divergence tarafında aday formüller referans kayıtları açıklamıyor. DIV için tetik mantığı henüz çözümlenmiş değil.
- API örnekleri yalnızca mesaj üretilen olayları içeriyor ve bazı alt akışlarda sayfalama devam ediyor. Referans `createdAt` zamanının gerçek strateji tetik anı olduğu doğrulanmadı. Bu nedenle mevcut veriden güvenilir FP oranı veya aynı anda yakalama iddiası çıkarılamaz.
- REA ile incelenen statik JavaScript paketi istemci/chart kodudur; çıkarılan gösterge şablonları server tarafındaki bot uygulamasını kanıtlamaz. Kaynak kodunun bulunması gibi değerlendirilmemeli.

## Sıradaki ölçüm çalışması

1. Referans akışlarının tüm sayfalarını ve alt strateji filtrelerini çekip benzersiz olay kimlikleriyle arşivle; zaman damgasının anlamını ve kayıt gecikmesini canlı gözlemle ölç.
2. Aynı sembol evreni ve Binance mum/işlem penceresini yerel adaylarla ham girdi olarak sakla. Veri boşluğu, API hatası ve saat farkını ayrı kalite bayrakları olarak yaz.
3. Mevcut adayları yeniden ayarlamadan önce karşılaştırıcıya iki tarafın tam olay listesini ver; her bot ve alt strateji için TP/FN/FP, precision/recall, zaman farkı, tekrar aralığı ve kapsama raporu çıkar.
4. Uyumsuzlukları zaman sırasıyla sınıflandır: formül/parametre, açık-kapalı mum, tetik fiyatı, hesaplama gecikmesi, yeniden-sinyal/cooldown, sembol/alt-strateji kapsamı veya veri/saat kalitesi. Bir seferde yalnızca açıklanabilen kuralı değiştir; değişiklik sonrası yeni holdout ayır.
5. Dondurulan sürümü Visivero erişimi olmadan gölge çalıştır ve ağ kaydıyla yalnızca Binance verisi kullandığını doğrula. Tüm kabul kapıları geçmeden bağımlılığın bittiğini söyleme.

## Mevcut iddia sınırı

Bugünkü bulgular “4S Sniper ve Hammer için açıklayıcı aday kurallar var; DIV ve tüm botların olay-zamanı/tekrar eşleşmesi çözülmedi” demeye yeter. Üç botun aynı sinyalleri aynı anda ürettiğini ya da Visivero bağımlılığının sona erdiğini söylemeye yetmez.
