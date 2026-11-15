# Panik Dibi — özgün sinyal stratejisi ve kullanım kılavuzu

> Hazırlanma: 12.11.2026 · Dayanak: 24 aylık Binance vadeli mum arşivi (Kasım 2024 – Kasım 2026, silinmiş coinler dahil 880 coin)
> Ölçümü yeniden üretmek için: `node db/panik-olcum.cjs b` · `node db/panik-olcum.cjs a 2025-11-01 2026-07-01` · `node db/panik-olcum.cjs c 2026-10-01`
> Bu belge geçmiş veri ölçümüdür, yatırım tavsiyesi değildir. Geçmişte işleyen bir kalıp gelecekte işlemeyebilir.

## 1. Özet

Denediğim giriş fikirlerinin çoğunda avantaj yok. Veride tutarlı çıkan tek kalıp şu: **piyasa topluca çökerken alınan pozisyon, 24 saat tutulursa ortalamada kazandırıyor.** 24 ayda 63 panik günü oldu; bu günlerde alınan sepet 24 saat sonra ortalama **+%4,1** yukarıdaydı ve günlerin **%73'ü** artıda kapandı.

Ama bu kalıp senin alışık olduğun işlem biçimiyle (küçük hedef, yüksek kaldıraç) çalışmıyor. Aynı sinyallerde +%3'te çıkmak 24 ayda kasayı yaklaşık yerinde saydırdı; hiçbir şey yapmadan 24 saat beklemek kasayı kabaca 2–3 katına çıkardı. Fark girişte değil, çıkışta ve pozisyon büyüklüğünde.

## 2. Neleri denedim, ne çıktı

Her fikri önce verinin bir kısmında ölçtüm, sonra hiç bakmadığım başka bir dönemde sınadım. "Gün bazında" bakıyorum, çünkü aynı gün gelen 200 sinyal aslında tek olaydır.

| Fikir | Sonuç (24 saat sonra, long) | Karar |
|---|---|---|
| Rastgele an, rastgele coin | %0,0 (kıyas tabanı) | — |
| Piyasa sakinken **tek başına düşen coini** almak | −%0,1 ile −%0,5; yolda −%10 görmek normal, 10 işlemden 1'i −%29 | **Yapma** |
| Hacimli **24 saatlik zirve kırılımı** ("pump başlıyor") | −%0,9 ile −%1,4; iki yılda da eksi | **Kovalamak kaybettiriyor** |
| Dar bant + hacimli kırılım | −%0,4 ile −%0,9 | Yok |
| Fiyat düşerken OI artmış, fiyat geri dönmüş ("tuzak") | Rastgeleden farksız (30 gün) | Yok |
| Kalabalık long'dan kaçarken fiyat tutunmuş | Rastgeleden farksız (30 gün) | Yok |
| Sert yükselişe **short** (1 sa +%8, 24 sa +%15) | Ortalama +%1,5 ama 10 işlemden 1'inde fiyat %55–68 ters gidiyor | Kaldıraçla yapılamaz |
| OI, long/short oranı, alıcı payı ile coin seçmek | Etkisi masrafın altında (30 gün) | Tek başına sinyal değil |
| **Piyasa paniğinde almak** | **+%2,6 ile +%4,2; iki ayrı yılda da artı** | **Strateji bu** |

İki dürüst not:

- OI ve long/short verimiz yalnız 30 günlük (Binance daha eskisini vermiyor). 30 günde bir strateji kanıtlanmaz; o yüzden bu veriden çıkan hiçbir şeye güvenmedim. Panik kalıbı yalnız fiyat ve hacme dayandığı için 24 ay geriye sınayabildim.
- Panik anında **hangi coini aldığın neredeyse fark etmiyor.** Aynı anda rastgele seçilen coin de aynı ölçüde yükseldi. Yani bu bir "coin seçme" sinyali değil, "şimdi zamanı" sinyali.

## 3. Strateji

**Mantık.** Piyasa topluca sert düştüğünde kaldıraçlı longlar zorla kapatılır. Bu zorunlu satış bitince fiyat kısmen geri gelir. Tek bir coin düştüğünde ise sebep genellikle o coine özeldir (haber, delist, balina) ve geri gelmez.

**Kural (5 dakikalık mum kapanışında bakılır):**

| Ölçü | Tanım | Eşik |
|---|---|---|
| Hasar | Coinlerin yüzde kaçı son 24 saatte −%10 veya daha fazla düşmüş | ≥ %20 (Güç 2), ≥ %35 (Güç 3) |
| Yaygın satış | Coinlerin yüzde kaçı son 1 saatte −%2 veya daha fazla düşmüş | ≥ %20 |
| BTC | Son 1 saatteki değişim | ≤ −%1 |
| Coin | Son 1 saat ≤ −%3; son 24 saat −%8 ile −%25 arası; 24 saatlik hacim ≥ 5 milyon $ | aday |

Üç piyasa koşulu birlikte sağlandığında bot her 5 dakikada en çok düşmüş 5 adayı yayınlar. Aynı coin 6 saat içinde yeniden gelmez. −%25'ten fazla düşmüş coinler bilerek dışarıda: onlarda sebep çoğunlukla coine özel.

"Hasar" %10–20 arasındayken (yarım panik) sonuç daha zayıf (24 saatte +%1,6 ile +%2,3) ve en taze örneği (29.10.2026) ekside kapandı; bot bunu yalnız uyarı olarak gösterir, sinyal vermez.

**Sıklık.** 24 ayda 63 gün, ayda ortalama 2–3 gün. Düzensiz gelir: Ocak 2025'te 8 gün, Temmuz–Eylül 2026'da hiç. Bu bot her gün sinyal vermez.

## 4. Geçmişte ne oldu

Üç dönem birbirinden bağımsız. Kuralı ortadaki dönemde kurdum; diğer ikisine kural dondurulduktan sonra baktım.

| Dönem | Panik günü | Sinyal | 24 sa sonra gün ortalaması | Artıda kapanan gün | En kötü gün | En iyi gün |
|---|---|---|---|---|---|---|
| Kasım 2024 – Ekim 2025 (sonradan sınandı) | 45 | 2.488 | +%4,1 | %67 | −%12,9 | +%23,2 |
| Kasım 2025 – Haziran 2026 (kural burada kuruldu) | 15 | 912 | +%4,0 | %87 | −%1,6 | +%11,7 |
| Ekim – Kasım 2026 (en taze veri) | 3 | 135 | +%5,3 | %100 | +%2,9 | +%6,8 |

Tek tek işlemlere bakınca (2024–25 dönemi): 24 saat sonunda %67'si artıda, %45'i +%5'in üstünde, %9'u −%10'un altında. Girişten sonraki 24 saat içinde işlemlerin **%33'ü en az −%9,5, %10'u en az −%19 gördü.** Yani 10x'te üç işlemden biri, 5x'te on işlemden biri tasfiye olurdu.

En kötü beş gün: 02.02.2025 (−%12,9), 18.12.2024 (−%12,6), 07.01.2025 (−%10,0), 09.12.2024 (−%6,5), 03.03.2025 (−%5,8). Ortak noktaları: çöküşün ilk bacağıydı, düşüş ertesi gün de sürdü. Bunu önceden ayıran bir işaret bulamadım.

## 5. Çıkış: asıl farkı yaratan kısım

Aynı sinyaller, farklı çıkışlar (fiyat yüzdesi, işlem başına ortalama, %0,2 masraf düşülmüş):

| Çıkış biçimi | 2024–25 | 2025–26 | Ekim–Kasım 2026 |
|---|---|---|---|
| +%3'te çık, stop yok | +0,14 | +1,41 | +1,98 |
| +%5'te çık, stop yok | +0,63 | +1,67 | +2,91 |
| +%10'da çık, stop yok | +1,67 | +2,04 | +4,42 |
| **Hedef koyma, 24 saat sonra kapat** | **+2,69** | **+2,52** | **+4,83** |
| 24 saat bekle, −%9,5'te stop | +2,00 | +0,30 | +3,69 |
| +%5 hedef, −%5 stop | +0,19 | −0,12 | +1,80 |

Okuması:

- **Küçük hedef kazancı kesiyor.** İyi günlerde sepet +%10–20 gidiyor. +%3'te çıkınca bu günlerden +%3 alıyorsun ama kötü günün −%10–19'unu tam yiyorsun. "+%3'te %80 kazanıyorum" doğru, ama kalan %7'lik tasfiye bütün kazancı siliyor (2024–25: +0,14).
- **Dar stop çalışmıyor.** Tipik işlem dönmeden önce %7 aleyhine gidiyor. −%5 stop koyarsan işlemlerin yarısında dipte satarsın.
- **Geniş stop (−%9,5) kötü günü sınırlıyor** ama iyi yılda kazancın çoğunu da alıyor. İkisi arasında net üstünlük yok.

## 6. Kasa: aynı sinyalle büyüyen ve büyümeyen kasa

Benzetim: gelen her sinyale girilir, yer yoksa atlanır. Her pozisyonun büyüklüğü kasanın %10'u (örnek: 3x kaldıraçta kasanın %3,3'ü teminat).

| Yöntem | 2024–25 (12 ay) | 2025–26 (8 ay) | Eki–Kas 2026 | 24 ay toplam | En büyük düşüş |
|---|---|---|---|---|---|
| 10x, +%3'te çık, stop yok | ×0,91 | ×1,22 | ×1,06 | ×1,18 | −%29 |
| 5x, +%3'te çık, stop yok | ×0,88 | ×1,28 | ×1,09 | ×1,23 | −%31 |
| 5x, +%5'te çık, stop yok | ×1,12 | ×1,16 | ×1,12 | ×1,46 | −%32 |
| 5x, 24 saat bekle | ×1,56 | ×1,24 | ×1,22 | ×2,36 | −%32 |
| **3x, 24 saat bekle, en çok 10 pozisyon** | ×1,80 | ×1,28 | ×1,24 | **×2,86** | −%29 |
| **3x, 24 saat bekle, en çok 5 pozisyon** | ×1,66 | ×1,15 | ×1,10 | **×2,10** | −%15 |
| 3x, 24 saat bekle, en çok 20 pozisyon | ×1,40 | ×1,48 | ×1,45 | ×3,00 | **−%59** |

Okuması:

- İlk iki satır senin bugünkü tarzına en yakın olanlar. 24 ayda kasa neredeyse yerinde saymış, yolda %30 erimiş.
- 24 saat beklemek aynı sinyalle kasayı 2–3 katına çıkarmış. Ama bedeli var: **yolda kasanın %15–30'unu geri verdiği dönemler oldu** (Aralık 2024 – Mart 2025 arası üst üste kötü günler).
- **Daha çok pozisyon daha iyi değil.** 20 pozisyonda kazanç aynı kalırken düşüş −%59'a çıkıyor. Panik günü bütün coinler birlikte hareket eder; 20 pozisyon 20 ayrı bahis değil, tek büyük bahistir.
- "En büyük düşüş" kapanan işlemlere göre. Pozisyonlar açıkken anlık görünen zarar daha derin olabilir: 10 pozisyonda kasanın %20–33'üne kadar.

## 7. Nasıl kullanılır

1. **Sinyal gelene kadar bir şey yapma.** Bu bot ayda 2–3 gün konuşur. "Yarım panik" uyarısı giriş sinyali değildir.
2. **Sinyal gelince coin seçimine takılma.** Gelen adaylardan likit olanları, tanıdıklarını al. Seçim sonucu değiştirmiyor.
3. **Toplam büyüklüğü baştan belirle.** Ölçümde makul görünen aralık: aynı anda 5–10 pozisyon, her biri kasanın %10'u büyüklüğünde, yani toplam pozisyon kasanın yarısı ile tamamı arası. Bunun üstü düşüşü büyütüyor, kazancı büyütmüyor.
4. **Kaldıracı düşük tut: 3x, en çok 5x.** 10x'te üç işlemden biri 24 saat içinde tasfiye fiyatını gördü. Kaldıraç burada kazancı artırmıyor, yalnız teminatı azaltıyor.
5. **Hedef koyma, saate bak.** Girişten 24 saat sonra kapat. Erken çıkmak istersen +%10'un altında çıkma.
6. **Dar stop koyma.** Stop istiyorsan −%9,5 gibi geniş koy; ya da stop yerine kaldıracı düşür.
7. **Aynı panikte ekleme yapma.** Ertesi gün yeni sinyal gelirse ve yerin doluysa atla. En kötü dönemler üst üste gelen günlerde ekleme yapıldığında oluştu.
8. **Panik dışında bu mantığı uygulama.** Piyasa sakinken tek başına düşen coin geri gelmiyor.

Senin mevcut "yorulma" okuman (OI düşüyor, taze para yok, son iğne) çıkışı 24 saatten erken ya da geç yapmak için kullanılabilir; bunu ölçmedim, o senin takdirin.

## 8. Bu ölçümün sınırları

- **Olay sayısı az.** 63 gün, bunların 45'i tek bir yılda. İstatistik olarak anlamlı (t ≈ 4,5) ama birkaç kötü gün tabloyu değiştirir.
- **Çıkış kuralını bütün veriye bakarak seçtim.** Giriş kuralı bağımsız dönemde sınandı; "24 saat bekle" ise üç dönemde de en iyi çıktığı için seçildi, ayrıca sınanmadı.
- **Giriş fiyatı varsayımı:** sinyal mumunun kapanışı. Panikte emir defteri incedir; küçük coinlerde gerçek giriş daha kötü olabilir. 5 ve 15 dakika geç girişi denedim, sonuç değişmedi.
- **Masraf %0,2** (komisyon + kayma) varsayıldı. Funding ödemeleri dahil değil; panikte funding çoğunlukla eksi olduğundan long lehine işler.
- **Benzetim bir insanın yapacağını tam taklit etmez:** her sinyale anında girilmiş, 24 saat sonra tam zamanında çıkılmış sayıldı.
- **Rejim riski.** Uzun bir ayı piyasasında "çöküşten sonra toparlanma" zayıflar. 2024–25'teki −%29'luk dönem bunun küçük örneği.

## 9. Canlıda doğrulama ve vazgeçme ölçütü

Bot canlıya alınınca her sinyal Karne'ye düşer. Değerlendirme gün bazında yapılmalı:

- İlk 10 panik gününde 24 saatlik gün ortalaması **eksi** ise ya da 10 günün 6'sı eksi kapanırsa stratejiyi durdur, bana haber ver.
- İlk 10 günde ortalama +%2'nin üstündeyse geçmişle uyumlu demektir.
- Bu sürede küçük büyüklükle başlamak (örneğin 5 pozisyon) ölçümün gösterdiği en düşük düşüşlü yoldur.

## 10. Sırada ne var

- **Panikte BTC/ETH almak:** küçük coinlerdeki −%19'luk kuyruk olmadan aynı zamanlamayı kullanmak. Ölçülmedi.
- **Çıkışı OI ile zamanlamak:** OI verisi biriktikçe (şu an 30 gün) "OI yeniden artmaya başladı" anının 24 saat kuralından iyi olup olmadığı ölçülebilir.
- **FR Kurulum ile birleşim:** panik günlerinde eksi funding'li coinlerin ayrışıp ayrışmadığı.

Araştırma verisi `data\arastirma` klasöründe yaklaşık 5 GB yer tutuyor (`k5`, `k5b`, `k5c` klasörleri ve `arsiv-olay-*.jsonl`). İstersen silinebilir; ölçümü yeniden üretmek için yeniden indirmek 1,5 saat sürer.
