# Bot veri doğruluğu ve Visivero davranış eşleşmesi

## Kullanıcı tarafından kabul edilen yön

20.10.2026: Kullanıcı önceki incelemedeki sıralamayı kabul etti. Amaç kendi piyasa verimizden Visivero botlarıyla aynı sembol/yön/zamanda sinyal üretmek. Referans sinyaller araştırma kanıtıdır; üretimde referansın mesajlarını kopyalamak algoritma eşleşmesi sayılmaz.

## Yaklaşım ve alternatifler

Önerilen ve kabul edilen yaklaşım: veri hatalarını gider, ortak strateji/veri akışına geç, sonra referansla ölçerek kalibre et. Alternatif olarak yalnız eşik ayarı veri hatalarını gizler; referans mesajlarını üretime aktarmak bağımsız bot hedefini karşılamaz. Bu iki alternatif uygulanmayacak.

## Birinci teslim: veri doğruluğu

- Gösterge hesaplamasında fiyat basamakları korunur; yalnız sunumda yuvarlanır. Tarihçe EMA ile quant EMA aynı hesap tanımını kullanır.
- Bilinmeyen sentiment/fonlama/üst zaman dilimi verisi null/— olur. NaN karşılaştırması filtre geçiremez. Hesap ve pozisyon oranları birbirinin yerine geçirilmez.
- Gerçek gözlenmiş önceki fiyat olmadan Boost'tan önceki fiyat üretilmez. Sabit kart metrikleri kaldırılır veya gerçek zaman diliminden alınır.
- Merkezi mum önbelleği tazelenir, eşzamanlı istekler paylaşılır, kapasite sınırlıdır. Canlı/kapanmış mum ayrımı metadata olarak korunur. Referans gözlemi olmadan kapanış tercihi değiştirilmez.
- Kayıt, tekilleştirme ve Hub kabul bildirimi tutarlı olur. Referans ve yerel zamanlar farklı alanlarda tutulur.

## Sonraki teslimler

1. Tek strateji fonksiyonu: runner ve merkezi motor aynı karar fonksiyonunu kullanır. Eşikler kanıt gelene kadar hipotezdir.
2. Ortak veri havuzu: Hub üzerinden kısa TTL ve devam eden istek paylaşımı; bağımsız modda aynı veri sözleşmesi.
3. Tek aktif tarama: zamanlayıcı önceki turla çakışmaz; teslim edilmemiş sinyal başarılı sayılmaz.
4. Sinyal yaşam döngüsü: kurulum/teyit/geçersizleşme yalnız ölçülmüş kurallarla tanımlanır.
5. Referans kalibrasyonu: bot/sembol/yön/strateji, referans olay zamanı, gözlem zamanı, yerel olay zamanı, veri tazeliği ve zaman çözünürlüğü kaydedilir. Tek bir yerel sinyal birden fazla referansla eşleştirilmez. Eksik, fazla sinyal ve gecikme raporlanır. Referansta sadece dakika varsa saniye düzeyinde eşleşme iddia edilmez.

## Erişim ve kanıt sınırı

Kullanıcı terminal.visivero.com gözlemini yetkilendirdi. Giriş normal tarayıcı akışıyla yapılır; şifre/token/cookie rapora yazılmaz. Mevcut indirilmiş JS demeti tarihsel kanıttır, canlı sunucu stratejisini kanıtlamaz. Oturum erişimi gelmeden referans algoritması doğrulandı denmez.

## Doğrulama

Gerçek üretim dosyalarına ve Telegram'a dokunmayan izole testler: düşük/missing balina oranı, funding sıfır ve bilinmeyen geçmiş, mikro fiyatlar, yenilenen mumlar, mükerrer kabul, yeniden başlatma ve metadata roundtrip. Mevcut regresyonlar çalıştırılır; bozuk test harness'i uygulama hatasından ayrı raporlanır. Gerçek Binance/Visivero erişimi yoksa çevrimdışı testler canlı eşleşme olarak sunulmaz.
