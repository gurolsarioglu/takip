# Profesyonel işlem terminali uygulama planı

> Uygulama ajanları için: işleri aşağıdaki sırayla yürütün. Bağımsız görevlerde `subagent-driven-development`, test ve teslim aşamalarında `verification-before-completion` kullanın.

**Temel sürüm:** Botlar V1.9.0, `a7cbb02`. Dosya yolları `terminal/botlar-v1` dizinine göre verilmiştir.

**Hedef:** Bir sembolü grafiklerden ve piyasa verilerinden incelemek, bot sinyallerini takip etmek ve favoriler arasında geçmek için tek çalışma ekranı.

**Mimari:** Yerel Node.js sunucusu, mevcut Canvas grafikleri, HTML/CSS/JavaScript ve PostgreSQL. Terminal ekranı mevcut uçları kullanır. 90 günlük arşiv, PostgreSQL üzerinden ayrı ve sayfalı bir sorgu olur. PostgreSQL asıl kayıttır. Uygulama 127.0.0.1 üzerinde çalışır.

## Mevcut eksikler

| Öncelik | Sorun | Kodda görülen neden |
| --- | --- | --- |
| P1 | Sinyalden grafiklere geçerken sayfa bağlamı kayboluyor | `web/public/terminal.html:91` ayrı sinyal sayfasına bağlantı veriyor. `web/public/index.html:133` sinyali ayrı coin panelinde açıyor. |
| P1 | Sütun genişlikleri ve grafik yoğunluğu esnek değil | `web/public/terminal.html:28` izlemeyi 290 px'e, :57 dört grafiği tek sıraya, :66 OI panelini 160 px'e sabitliyor. |
| P1 | Canlı akış durduğunda boş/gecikmiş akış ayırt edilmiyor | `web/server.cjs:61` son başarılı okuma zamanını bildirmiyor. `web/public/index.html:139` mesaj hatalarını yutuyor. |
| P1 | Kesinti sonrası canlı kartlar atlanabilir | `web/server.cjs:237` sınırlı listeyle küresel `maxSeq` döndürüyor. `web/public/index.html:147` sayacı bu değere ilerletiyor. Sunucu yeniden başladığında sayaç değişiyor. |
| P1 | 90 günlük coin sorgusu arayüzde yok | `web/server.cjs:65` canlı belleği 48 saat tutuyor. :212'deki `/api/coinhist` en çok 14 gün gösteriyor. `db/sema.sql:23` sembol ve zaman dizini mevcut. Canlı veritabanının kaç ayı kapsadığı ölçülmedi. |
| P2 | Akış hızlı güncellenirken odak ve okuma konumu kaybolabilir | `web/public/index.html:129` güncellemede listeyi yeniden kuruyor. `web/public/terminal.html:37` ve :44'te bazı izleme işlemleri fareye bağımlı. |
| P2 | Grafik ve kontrol yoğunluğu ekrana uymuyor | `web/public/terminal.html:60` tek satırlı grafik başlıkları kesiliyor, :87'de kullanım ipuçları gizleniyor. |

## Onaylanan ekran taslağı

```text
┌ Botlar Terminal · BTCUSDT · Son fiyat / 24s % · OI / Funding ──────────────────────┐
├ VERİ TERMİNALİ · Göstergeler · Kısa / Uzun vade ──────────────┬─ İZLEME LİSTESİ ──┤
│ 5dk          │ 15dk         │ 1sa           │ 4sa             │ Sembol ara / ekle  │
│              │              │               │                 │ BTCUSDT   …       │
│ Mum + hacim  │ Mum + hacim  │ Mum + hacim   │ Mum + hacim     │ ETHUSDT   …       │
│              │              │               │                 ├─ SİNYAL BOTLARI ──┤
│ RSI          │ RSI          │ RSI           │ RSI             │ M1                │
│ Stoch RSI    │ Stoch RSI    │ Stoch RSI     │ Stoch RSI       │ M1 Premium        │
│ WT Cross     │ WT Cross     │ WT Cross      │ WT Cross        │ 16:46 ARCUSDT SELL│
│              │              │               │                 │ 16:44 SOLUSDT BUY │
│ OI ve hacim                                                   │ 4S, 4S Sniper …   │
└───────────────────────────────────────────────────────────────┴───────────────────┘
```

- Masaüstünde dört uzun grafik yan yana ve sağda tek bir panel. İzleme listesi her genişlikte botların üstünde yer alır. Dar ekranda ikisi birlikte grafiklerin altına geçer.
- Üç grafik ayracı ve bir sağ panel ayracı fare, dokunma ve klavyeyle çalışır. Ayarlar okunabilir asgari genişliklere uyar, çift tıklama varsayılanı geri getirir ve seçimler yenilemede korunur. Tek grafik odak modu, OI/hacim, göstergeler ve Türkiye saati korunur.
- Görsel dil koyu grafit (`#10151B`), panel (`#192129`), çizgi (`#303D48`), metin (`#E7EDF0`), seçili öğe için bakır (`#D5A66B`). Yön için ok, metin ve renk kullanılır. Sayılar hizalı, kritik değerler daha büyük, ikincil metin 12 px ve kontroller yaklaşık 14 px başlar. İlk teslimde cihazdaki yazı tipleriyle çalışır.
- Botlar sunucu sırasıyla dikey listelenir. Bir bot seçilince yalnız kendi sinyalleri doğrudan altında, en yeni üstte ve her sinyal tek satır olacak şekilde açılır. Sinyale tıklamak dört grafiği ilgili coine geçirir. Mesaj ayrıntısı ayrıca açılır. Arşiv seçili coin ve botla açılır.
- İzleme listesi sembol arama, ekleme, sıralama, favoriler ve delist uyarısını aynı yerde tutar. Dar görünümde fiyat ve 24s % öncelikli, hacim geniş görünümde veya satır ayrıntısında. Klavye ile seçim ve görünür odak desteği bulunur. Kasa ve Karne mevcut ekrana bağlı kalır. `/terminal.html?s=SEMBOL` doğrudan bağlantısı çalışır.

## İş paketleri ve model seçimi

### 1. Ekran kabuğu, grafik ve izleme listesi / GPT-6.1 Terra + GPT-6.2 Sol

Onaylanan prototipi Nietzsche (GPT-6.2 Sol) uygular. İlgili HTML, CSS ve ayırıcı modülünün tek sahibidir.

- [ ] `web/public/terminal.html` içinde veri terminalini solda, izleme listesi ve `#signal-panel` yuvasını sağda sırayla kur. `web/public/workspace.css` tema ve dar görünümü tanımlar.
- [ ] `web/public/workspace.js` içinde dört ayırıcıyı ve yerel ayarları bağla. Ortak sözleşme `TerminalSignalPanel.mount({ root, api, getSymbol, onSelectSymbol }) → { setSymbol(sym) }`. Mevcut `select(sym)` sembol değişiminde tek giriş noktasıdır.
- [ ] Canvas öğelerini ve gösterge oturumlarını koru. Zaman dilimi, yakınlaştırma, tarih etiketleri ve odak modu çalışmaya devam etmeli. Boyut değişimi için yeni piyasa isteği başlatma.

### 2. Canlı veri durumu ve 90 günlük sorgu / GPT-6.2 Astra

Lovelace (GPT-6.2 Astra) sunucu sözleşmesini ve PostgreSQL sorgusunu sahiplenir.

- [ ] `web/server.cjs` içinde mevcut mesaj uçlarını koru. `/api/messages` yanıtına `epoch`, `lastPollOkAt` ve `state` (`warming`, `fresh`, `stale`) alanlarını ekle. Sağlığı son başarılı DB okumasına göre hesapla. Yeni mesaj gelmeyen başarılı okumalar sağlıklıdır. Son başarılı okumadan 15 saniye sonra akışı gecikmeli göster. Bot motorunun durumu `/api/status` üzerinden ayrı gösterilir. İlk sürüm mevcut yerel yoklama yaklaşımını kullanır.
- [ ] Yeni ekran için `mode=delta&after=` yanıtında `nextAfter`, `hasMore` ve `reset` ekle. Anlık liste ve sıra numarasını aynı sunucu isteğinde döndür. Eşleşen kartları sıra numarasına göre küçükten büyüğe sayfala. Bir sonraki sayfa varsa yalnız dönen son sıra numarasına ilerle. Bellekten çıkarılan en yüksek sıra numarasını sunucuda takip et. İstemcinin sırası bunun altındaysa veya oturum değişmişse yeniden anlık liste al ve “Akış yeniden eşitlendi” durumunu göster. Canlı kart belleği sınırlıdır. Eski istemci aynı API alanlarıyla çalışmaya devam eder.
- [ ] `web/signal-archive.cjs` üzerinden `GET /api/t/signal-archive?symbol=ARCUSDT&days=90&limit=50` ekle. Kesin sembol zorunlu, bot/yön isteğe bağlı, gün 1–90 ve sayfa boyutu 1–100. Yanıt `{items,nextCursor,from,to}`; sıralama `t DESC,src_file DESC,src_line DESC`. UTC tarih penceresi `[from,to)` ilk sayfadan sonraki sorgularda sabitlenir. Sayfa belirtecinde PostgreSQL zaman damgasının tam hassasiyetini koru. Orijinal mesaj metni saklı olduğu biçimde döner. Canlı kartların gruplanmış tekrar sayıları ile arşivdeki ham kayıtlar ekranda ayrı adlandırılır.
- [ ] Parametreli sorgu, üst sınır ve uygun dizin kullanımını doğrula. İlk geliştirme sahte DB ve sentetik kayıtlarla yapılır. Bu sorgu kendi botlarımızın `signals` kayıtlarını gösterir. `db/eski-yukle.cjs` ile belgelenen `vv_messages` referans arşivi ayrı kaynaktır ve sonuçlara karıştırılmaz. Canlı kapsama ait en eski/en yeni tarih erişim olduğunda salt okunur ölçülür. Kesinti için 503, geçersiz sorgu ve sayfa belirteci için 400; arşivden otomatik veri silme eklenmez.

### 3. Sağ panelde bot listesi ve sinyaller / GPT-6.2 Sol

Gibbs (GPT-6.2 Sol), `web/public/signal-panel.js` ve `web/public/signal-panel.css` dosyalarının sahibi. Ortak HTML'i Nietzsche bağlar.

- [ ] Dokuz botu sunucu sırasıyla göster. Etkin botun altında sinyalleri yeni tarih önce, tek satır olarak listele. Canlı ve Arşiv görünümü, mesaj ayrıntısı ve arşiv sayfalama bu paneldedir.
- [ ] Yinelenen kartı aynı kimlikle güncelle. Son yanıtın seçili filtreye ve istek nesline ait olduğunu doğrula. Yeni kayıtlar okumayı bölmez. Gizli sekmede yoklamayı durdur; hatada son veriyi “Gecikmeli” olarak işaretle, boş listeyi ayrı göster. Telegram gönderimi ve sinyal algoritmaları bu akışın dışında kalır.

### 4. Regresyon ve kabul / GPT-6.2 Sol + GPT-6.1 Terra

Ana ajan saha senaryolarını ve sahte veri sunucusunu hazırlar, sonuçları birleştirir. Yayın öncesi bağımsız inceleme yapılır.

- [ ] `node db/test-terminal.cjs` ve `node db/test-fr-kurulum.cjs` taban kontrollerini çalıştır. Yeni arşiv testlerini `node --test db/test-signal-archive.cjs` ile çalıştır. 90 gün sınırı, eşit ve milisaniye altı zaman damgası, tekrar eden satırlar, filtre, bozuk belirteç ve 503 kapsanır. Akış kontrolünde 501 kartlık birikme, arada kart silinmesi, sunucu yeniden başlatma, tekrar kartının güncellenmesi ve sessiz akış ile kesinti farkı kapsanır.
- [ ] `db/terminal-deneme.cjs` örnek akış, dokuz bot ve sayfalı arşivle çalışır. Masaüstü ve dar ekranlarda taşma, ayırıcıların klavye/fare kullanımı, yenilemede ölçüler ve botların doğru konumu doğrulanır.
- [ ] Sinyal ve izleme ile coin değiştir. Dört grafik, özet ve seçili satır aynı coini göstermeli. Geciken yanıtla A → B geçişini, canlı akış durması ve toparlanmasını, yoğun akışta okuma konumunu, yenileme sonrası deep link'i ve ayraç hareketi sırasında ağ isteği çıkmadığını doğrula. Açık sekmede normal grafikleri her 5 saniyelik çevrimde en çok dört mum isteğiyle güncelle, gizli sekmede duraklat ve döndüğünde tek zamanlayıcıyla toparla. Canlı motor, PostgreSQL veya Telegram yerine bu senaryolarda test verisi kullan.
- [ ] `/` üzerinde Kasa/Karne, sinyal ayrıntısı ve filtreleri; `/terminal.html` üzerinde favori ekleme/çıkarma, delist, OI/hacim ve grafik etkileşimini tekrar çalıştır. Piyasa isteği sıklığı ve hız sınırı davranışı korunur. Entegrasyon ajanı bulguları kapatır ve `terminal/Takip.md` dosyasına sonuçları ekler.

## Sıra ve teslim

Kullanıcı dört dik grafik ve sağ panelde izleme listesi altında botlar taslağını onayladı. Üç iş paketi `codex/terminal-v2-workspace` dalında birleştirildi ve V1.10.0 olarak doğrulandı. Yerel örnek verili Chromium kabulü ve 42 otomatik test geçti. Gerçek PostgreSQL arşiv kapsamı ve canlı Kasa/Karne verileri bu kopyada ölçülmedi.
