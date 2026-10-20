# Mevcut botlar: formüller, hatalar ve referans farkları

Veri ortaktır; her bot bağımsız strateji, zaman dilimi, tarama ve sinyal kimliğine sahiptir. Scalp ve swing kararları birleştirilmez. Aşağıdaki koşullar yerel kodun koşullarıdır; Visivero'nun sunucu algoritmasının çözüldüğü anlamına gelmez. Ana karar kaynağı `bots/strategy-rules.js`, sürüm `local-hypothesis-v1`.

## Yerel sinyal koşulları

`R` RSI, `K` StochRSI K, `WU` WaveTrend yukarı kesişimi, `OS` WT aşırı satım, `D` pivot uzaklık yüzdesi. Bu tablo karar kapısını gösterir; aday sembol seçimi, veri yeterliliği, cooldown ve tekilleştirme ayrıca uygulanır. Merkezi giriş ve runner'ın aday/ölçüm pencereleri henüz tamamen aynı değildir. Eski `ingest()` sınıfları da ayrı bir yol olarak kalmaktadır.

| Bot | Mevcut koşul | Referansta görülen uyuşmazlık |
|---|---|---|
| M1-A | `abs(changePct) >= 0.95` | Aynı sembolde yaklaşık 10 sn aralıkla, bazen 250 ms içinde farklı kayıtlar var; yerel cooldown/tek mum kısıtı uymaz. |
| M1 Premium | `changePct >= 0.7 AND volumeRatio >= 1.05 AND (R>=55 OR K>=60)` | Referans aşağı yönlü de üretiyor. |
| Hammer Pro | `R5m<=42 OR (WU5m AND R5m<=50)` | Referansta aşağı yön ve 1m WT, W1 etiketi var. |
| Hammer Pro+ | `R5m<=38 AND (WU5m OR OS5m OR R1h<=40) AND D5m<=1.2` | Referansta S1 ve yüksek RSI ile aşağı yön var. |
| 4S | `R1h>=58 OR K1h>=70` | Referans yeşil örneğinde RSI1h=45, RSI4h=39; yerel kod gerçek 4h stratejiyi temsil etmiyor. |
| 4S Sniper | `(R1h<=40 OR K1h<=25) AND whaleLong>=55` | NW UP/DOWN, 4H RSI DIVERGENCE ve 55 altı konumlanma örnekleri var. |
| Divergence | `bullDiv5m OR bearDiv5m OR bullDiv1h OR bearDiv1h` | Referans zaman dilimi/strateji bazında ayrılıyor; pivot eşleşmesi henüz ölçülmedi. |
| V3 | `quoteVolume24h>=5,000,000 AND deltaVolPct>=15` | Referansta %11.48 gibi değerler; gösterilen 24s hacim temel para biriminde. |
| FR | `fundingRate<0` | Referansta dakika grupları/tekrarlar var; yalnız negatiflik yeterli açıklama değil. |

Örneklerde görülen en küçük değer, stratejinin kesin eşiğini kanıtlamaz. Boost yüzdesi de gösterilen current/previous fiyatlardan her zaman türemiyor; hareketli pencere veya farklı gözlem anı ihtimalleri ölçülmeli.

## Kullanılan gösterge matematiği

- Fiyat değişimi: `100*(Pnow/Pbase-1)`. Baz fiyatın hangi andan alındığı stratejinin parçasıdır. Ardışık mum kapanışı değişimi ayrı `measuredChangePct` alanıdır; referans Boost'u yerine geçirilmez.
- EMA(n): başlangıç ilk n değerin SMA'sı; devamı `EMA_t=alpha*x_t+(1-alpha)*EMA_(t-1)`, `alpha=2/(n+1)`. Tam n veri ile yalnız başlangıç SMA'sı vardır; yeterli ısınma gerekir.
- Wilder RSI(14): `g=max(delta,0)`, `l=max(-delta,0)`; ilk 14 ortalamasından sonra `G_t=(13*Gprev+g)/14`, aynı biçimde L. `RSI=100-100/(1+G/L)`. Yerel kod L=0 için 100 döndürür; düz seri/eksik veri davranışı referansla ayrıca doğrulanmalı.
- StochRSI(14,14,3,3): `S=100*(RSI-min14)/(max14-min14)`; `K=SMA3(S)`, `D=SMA3(K)`. Yerel kod sıfır aralığa 50 verir; seri başında kısmi ısınma ve 2 basamak yuvarlama vardır.
- WaveTrend(10,21): `AP=(H+L+C)/3`, `ESA=EMA10(AP)`, `d=EMA10(abs(AP-ESA))`, `CI=(AP-ESA)/(0.015*d)`, `WT1=EMA21(CI)`, `WT2=SMA4(WT1)`. Yukarı kesişim önce `WT1<=WT2`, şimdi `WT1>WT2`; aşırı satım `WT1<=-60`.
- Klasik pivot: `P=(H+L+C)/3`. Fiyatla uzaklık yüzde olarak hesaplanır. Hangi mumun pivot kaynağı olduğu eşleşme için ayrıca önemlidir.
- RSI divergence: en fazla son 30 mum içinde sağ/sol 2 komşuyla bulunan son iki fiyat pivotu karşılaştırılır. Boğa: `Low2<Low1 AND RSI2>RSI1 AND RSI1<=35`; ayı: `High2>High1 AND RSI2<RSI1 AND RSI1>=65`. Sağdaki iki mumdan sonuncusu canlı olabilir; kapanış teyidi zorunlu değil.
- Hacim sıçraması: `100*(Vcurrent/mean(Vprevious20)-1)`. Premium'un `volumeRatio` değeri oran biçimindedir; yüzde değişimle karıştırılmamalıdır.
- Funding gösterimi: ham oran yüzde için 100 ile çarpılır; fark `100*(rateNow-ratePrevious)` yüzde puandır. Önceki oran bilinmiyorsa fark bilinmez; gerçek `nextFundingTime-now` geri sayımın kaynağıdır.
- Hesap oranı: `100*longAccount`; pozisyon oranı ayrı veridir. Bu ikisini birbirinin yerine kullanmak aynı filtre değildir.

## Düzeltilen doğruluk ve verimlilik sorunları

Sentiment alan uyuşmazlığının NaN ile Sniper filtresini geçirmesi, uydurulmuş Boost/üst zaman dilimi metrikleri, funding ölçeği ve geri sayımı, mikro fiyat EMA/pivot hassasiyeti, yenilenmeyen merkezi mum önbelleği, reddedilen sinyalin başarılı bildirilmesi ve yeniden başlatmada tekilleştirme kaybı düzeltildi. Hub mum istekleri kısa TTL ve devam eden istek paylaşımı kullanır. Bot taramaları kendi içinde çakışmadan tamamlanır; bir botun seçimi diğerini tetiklemez.

Ortak veri akışının kapsamı henüz tam değildir: runner yardımcılarında Hub arızasında doğrudan Binance fallback'i vardır; bütün süreçler için tek global istek bütçesi kurulmadı. Önbellek seri başına sınırlıdır; toplam seri sayısı için LRU yoktur. Canlı/kapanmış mum politikası referans kanıtı olmadan değiştirilmedi. Bunlar tamamlanmış kabul edilmemeli.

## Kanıt ve sıradaki çalışma

Yetkili tarayıcı oturumunda 9 bottan 20'şer, toplam 180 geçmiş referans mesajı incelendi. Örnek kimlikler, sunucu olay zamanları ve gözlem sınırları `visivero-api-baseline-2026-10-20.json` dosyasındadır. Bunlar farklı tarih aralıklarıdır; eşzamanlı yerel/referans ölçümü değildir. Kullanıcı saatini düzelttikten sonraki tek Binance ölçümü yaklaşık +419 ms ofset / 437 ms istek süresi verdi. Önceki +296 sn fark yalnız eski gözlemlere aittir.

Önce M1-A/Premium'un hareket penceresi, iki yönü ve tekrar davranışı aynı piyasa verisiyle ölçülmeli; ardından Hammer, 4S/Sniper ve divergence ayrı zaman dilimleriyle ele alınmalı. Kurulum/teyit/geçersizleşme yaşam döngüsü henüz bilinmiyor. Çevrimdışı karşılaştırıcı bot/sembol/yön/borsa/piyasa/strateji kimliğiyle bire bir eşleştirir, bilinmeyen olay zamanını gözlem zamanı ile doldurmaz. Eşleşme oranı veya aynı anda sinyal başarısı henüz raporlanamaz.
