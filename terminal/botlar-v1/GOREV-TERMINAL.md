# GÖREV: Veri terminali (izleme listesi + 4 grafik + OI/hacim)

> Hazırlanma: 15.11.2026 · Proje sürümü: 1.6.0 → hedef 1.7.0
> Proje kuralları: `AGENTS.md` (özellikle §2 kesin kurallar, web bölümü ve Binance sınırları). Önce onu oku.
> Bu görev yalnız **veri gösterir**. Emir, API anahtarı, işlem kodu yok. Sunucu `127.0.0.1`'de kalır.

## 1. Amaç

Kullanıcı sinyal botlarını "nereye bakacağını söyleyen" araç olarak kullanıyor; kararı kendisi grafik, OI ve hacme bakarak veriyor.
Bunun için aynı uygulamanın içinde ikinci bir sayfa: **Terminal**. Tek ekranda izleme listesi, seçilen coinin 4 zaman dilimli
grafiği ve OI + hacim paneli.

## 2. Ekran

```
┌ başlık: Botlar · Terminal · [← Sinyaller] · seçili coin özeti (fiyat, 24s %, 24s hacim, OI $, funding, sonraki ödeme) ┐
├──────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ İZLEME       │  [Kısa: 5dk·15dk·1s·4s]  [Uzun: 4s·1g·1h·1ay]                                   [Sinyal işaretleri ☑] │
│ [coin ekle ▾]│  ┌ grafik 1 (5dk ▾) ───────────┐ ┌ grafik 2 (15dk ▾) ──────────┐                                      │
│ BTC  …  +1.2%│  │ mumlar + altta hacim        │ │                             │                                      │
│ AKE  …  −4.0%│  └─────────────────────────────┘ └─────────────────────────────┘                                      │
│ …            │  ┌ grafik 3 (1s ▾) ────────────┐ ┌ grafik 4 (4s ▾) ────────────┐                                      │
│              │  └─────────────────────────────┘ └─────────────────────────────┘                                      │
│              │  ┌ OI ve hacim (dönem: 5dk ▾ 15dk 1s 4s 1g) ───────────────────────────────────────────────────────┐  │
│              │  │ üstte OI çizgisi ($), altta hacim çubukları ($) · OI değişimi 1s / 4s / 24s                      │  │
│              │  └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **İzleme listesi (sol, ~260 px):** satır = sembol (USDT'siz kısa ad), son fiyat, 24 saatlik değişim % (yeşil/kırmızı), 24 saatlik hacim (M$).
  Satıra tıklayınca coin seçilir: 4 grafik + OI/hacim paneli + başlık özeti o coine geçer. Satırdaki ✕ listeden çıkarır.
  Üstte "coin ekle" kutusu: yazdıkça Binance vadeli USDT sembollerinden öneri (en çok 8), Enter ya da tıklama ekler.
  Liste boşsa ilk açılışta BTCUSDT ve ETHUSDT eklenir. Sıra: eklenme sırası; sütun başlığına tıklayınca ada/değişime/hacme göre sıralanır (yalnız görünüm).
- **Grafikler (2×2):** her grafiğin kendi zaman dilimi seçicisi var: `5m 15m 1h 4h 1d 1w 1M` (etiketler: 5dk, 15dk, 1s, 4s, 1g, 1h, 1ay).
  İki hazır düzen düğmesi: **Kısa** = 5dk, 15dk, 1s, 4s (varsayılan) · **Uzun** = 4s, 1g, 1h, 1ay.
  Mum grafiği + alt %20'de hacim çubukları (USDT hacmi, mum rengiyle). Sağda fiyat ekseni, altta zaman ekseni (Türkiye saati, UTC+3).
  Son fiyat çizgisi ve etiketi. Fare: tekerlek = yakınlaştır/uzaklaştır (imleç çevresinde), sürükle = kaydır, çift tıklama = sıfırla.
  Artı imleci: üstünde durulan mumun tarih-saat, A/Y/D/K, değişim % ve hacmi grafik başlığında yazar; aynı an diğer 3 grafikte dikey çizgiyle gösterilir.
  Sola kaydırınca daha eski mumlar istenir (bkz. §4 `end`). Grafik başlığına çift tıklama o grafiği tam alana büyütür / geri alır.
- **Sinyal işaretleri:** seçili coinin son 48 saatteki bot sinyalleri (mevcut `/api/messages?bot=all&sym=…&limit=500`) grafiklerde küçük üçgen
  (yukarı yeşil, aşağı kırmızı, yönsüz sarı) + üstüne gelince bot adı ve saat. `m1` ve `m1-premium` varsayılan olarak **gösterilmez**
  (çok sık); onay kutusunun yanında "M1 dahil" seçeneği. İşaretler yalnız mumu grafikte görünen sinyaller için çizilir.
- **OI ve hacim paneli:** dönem seçici `5m 15m 1h 4h 1d`. Üstte OI çizgisi (USD), altta hacim çubukları (aynı dönem, USDT). Sağ üstte:
  şimdiki OI ($ ve adet), OI değişimi 1s / 4s / 24s (%). Binance OI geçmişini yalnız son 30 gün verir; panelde bunu küçük notla belirt.
- **Görünüm:** `index.html` ile aynı renk değişkenleri ve yazı tipi (`:root` değişkenlerini aynen kullan). Koyu tema. 1366×768'de taşmadan sığmalı;
  pencere küçülünce grafikler küçülür (canvas yeniden boyutlanır, `devicePixelRatio` hesaba katılır). Telefon düzeni gerekmiyor.
- **Kalıcılık:** izleme listesi veritabanında (§5). Seçili coin, grafiklerin zaman dilimleri, OI dönemi, işaret seçenekleri `localStorage`'da
  (`v1.t.*` anahtarları; okuma/yazma try/catch içinde).
- **Bağlantılar:** `index.html` başlığına `📈 Terminal` düğmesi (`/terminal.html`). Mevcut coin panelindeki (cRender) TradingView bağlantısının yanına
  `Terminalde aç` (`/terminal.html?s=SEMBOL`). `terminal.html?s=…` ile açılırsa o coin seçilir (listede yoksa eklenmeden gösterilir, yanında "+ listeye ekle").

## 3. Dosyalar

| Dosya | İş |
|---|---|
| `web\terminal.cjs` (yeni) | Terminalin bütün sunucu tarafı: Binance istek kuyruğu, önbellek, `/api/t/*` uçları. `module.exports = { handle, _test }`. |
| `web\public\terminal.html` (yeni) | Tek dosya: HTML + CSS + JS. **Dış betik, dış stil, CDN yok.** Grafikler kendi `<canvas>` kodunla. |
| `web\server.cjs` | Yalnız iki ekleme: `require('./terminal.cjs')` ve yönlendirme satırı (`/api/t/` ile başlayan yol → `terminal.handle`). Başka yere dokunma. |
| `web\public\index.html` | Yalnız §2'deki iki bağlantı. |
| `db\test-terminal.cjs` (yeni) | Ağsız, veritabanısız testler (§7). |
| `VERSION`, `package.json` | `1.7.0` |
| `AGENTS.md` | Web bölümüne "Terminal" alt bölümü (uçlar, sınır kuralları, tablo), klasör haritasına yeni dosyalar. |

Yeni bağımlılık yok (yalnız `node:` modülleri, mevcut `pg`, yerleşik `fetch`).

## 4. Sunucu uçları (`web\terminal.cjs`)

`handle(req, res, u, deps)` — `deps = { q, send, readBody, log, fetch? }` (`q` = server.cjs'deki sorgu fonksiyonu; `fetch` verilmezse `globalThis.fetch`).
Böylece test sahte `fetch` ve sahte `q` verebilir. Yol eşleşmezse `false` döner.

Sembol her yerde: büyük harf, `[A-Z0-9]` dışı atılır, 2–30 karakter; geçersizse 400.

| Uç | Binance kaynağı | Dönen | Önbellek |
|---|---|---|---|
| `GET /api/t/klines?symbol&interval&limit&end` | `/fapi/v1/klines` (`end` varsa `endTime=end`) | `[[t,o,h,l,c,qv], …]` (qv = USDT hacmi, kline dizisinin 8. alanı) | `end` yoksa 4 sn; `end` varsa 5 dk |
| `GET /api/t/oi?symbol&period&limit` | `/futures/data/openInterestHist` | `[[t, adet, usd], …]` eskiden yeniye | 60 sn |
| `GET /api/t/coin?symbol` | `/fapi/v1/openInterest`, `/fapi/v1/premiumIndex` | `{ oi, oiUsd, mark, funding (yüzde), nextFunding (ms) }` | 10 sn |
| `GET /api/t/tickers` | `/fapi/v1/ticker/24hr` (sembolsüz, hepsi) | `{ at, rows: { SEMBOL: [last, chgPct, quoteVol] } }` yalnız `USDT` ile bitenler | 20 sn |
| `GET /api/t/izleme` | — | `["BTCUSDT", …]` sırayla | — |
| `POST /api/t/izleme` | — | gövde `{ action: 'ekle' | 'sil', symbol }` → güncel liste | — |

- `interval`: `5m 15m 1h 4h 1d 1w 1M` dışı → 400. `limit`: 1–1000, varsayılan 500. `period`: `5m 15m 1h 4h 1d`; `limit` 1–500.
- `ekle` yalnız `tickers` önbelleğinde görülen bir sembolü kabul eder (önbellek boşsa önce doldur). Liste en çok 100 sembol.
- Hata biçimi: `{ error: 'Türkçe açıklama' }`; Binance hatası 502, sınır beklemesi 503 (`retryAfter` saniye ile).

### Binance sınırları — bu bölüm pazarlık konusu değil

Aynı IP'yi motor, mum toplayıcı ve türev toplayıcı da kullanıyor. Terminal onları 429/418'e sokmamalı.

1. **Tek kuyruk.** `terminal.cjs` içindeki bütün Binance istekleri tek bir sıralı kuyruktan geçer. İki istek arası en az **150 ms**;
   `/futures/data/*` istekleri arasında en az **700 ms** (bu uçların ayrı sınırı var: 1.000 istek / 5 dk, IP başına, motorla ortak).
2. **Aynı anahtar tek istek.** Önbellekte yoksa ve aynı anahtar için uçuşta istek varsa ona bağlan; ikinci istek atma.
3. **Ağırlık izleme.** Yanıttaki `x-mbx-used-weight-1m` başlığını oku. **1.500**'ü geçince kuyruğu o dakikanın sonuna kadar beklet
   (sınır 2.400; pay motorundur).
4. **429:** `retry-after` (yoksa 30 sn) + 5 sn boyunca hiç istek atma; bekleyenlere 503 dön. **418:** `retry-after` süresince hiç istek atma,
   log'a yaz, 503 dön. İkisinde de **yeniden deneme yok** (istemci zaten yeniden soracak).
5. **Kuyruk taşması:** bekleyen 40'ı geçerse yeni isteğe 503 dön (sekme arka planda birikmesin).
6. Zaman aşımı 10 sn (`AbortController`). Önbellek en çok 400 kayıt; dolunca en eski silinir.
7. Tarayıcı Binance'e **doğrudan bağlanmaz** (ne REST ne WebSocket); her şey bu uçlardan geçer.

### İstemcinin istek bütçesi

- Coin seçilince: 4 × `klines` (limit 500) + 1 × `oi` + 1 × `coin` + sinyaller.
- Canlı güncelleme: her grafik için `klines?limit=3` **5 sn**'de bir; dönen mumlar `t`'ye göre mevcut diziyle birleştirilir (son mum güncellenir, yenisi eklenir).
  `coin` 10 sn, `tickers` 20 sn, `oi` 60 sn'de bir. `document.hidden` iken **hiçbir** yoklama yapılmaz; sekme geri gelince bir kez tazelenir.
- Bir istek 503 `retryAfter` dönerse o süre boyunca yoklama durur ve başlıkta küçük sarı uyarı görünür ("Binance sınırı: N sn bekleniyor").
- Coin hızlı değiştirilirse eski coinin geç gelen yanıtı çizilmez (istek sırasına sayaç koy).

## 5. Veritabanı

Tek yeni tablo; `terminal.cjs` ilk kullanımda oluşturur:

```sql
CREATE TABLE IF NOT EXISTS izleme (symbol text PRIMARY KEY, sira serial, eklendi timestamptz NOT NULL DEFAULT now());
```

Başka tabloya yazma yok. `DROP`, `TRUNCATE`, toplu `DELETE` yok (`sil` tek satır siler: `DELETE FROM izleme WHERE symbol = $1`).
Veritabanına ulaşılamazsa izleme uçları 503 döner; sayfa grafikleri yine gösterir (liste yerine uyarı + yalnız `?s=` ya da son seçili coin).

## 6. Grafik bileşeni (istemci)

Tek bir `Chart` sınıfı (canvas 2D), dört grafik ve OI paneli aynı çizim yardımcılarını kullanır. Beklenenler:

- Görünür aralık `[i0, i1)` mum indeksleriyle tutulur; fiyat ekseni yalnız görünür mumların en düşük/en yükseğine göre (üst-alt %6 boşluk).
- Fiyat etiketleri coin fiyatına göre anlamlı basamakla (0.00001234 gibi küçük fiyatlar bozulmamalı; `toPrecision` + gereksiz sıfır kırpma).
- Zaman etiketleri: gün içi dilimlerde `SS:DD`, gün değişiminde `GG.AA`; `1d/1w` için `GG.AA`, `1M` için `AA.YYYY`. Hepsi Türkiye saati.
- Çizim `requestAnimationFrame` ile birleştirilir (fare hareketinde her olayda yeniden çizme). 1.000 mumda akıcı olmalı.
- Veri yokken ya da hata varken grafiğin ortasında açıklama yazar ("Yükleniyor…", "Bu coin için veri yok", hata metni).
- Yeni listelenmiş coinlerde `1w`/`1M` birkaç mumdan ibaret olabilir; bu hata değil, olduğu gibi çizilir.

## 7. Test ve kabul

**`db\test-terminal.cjs`** (`node db/test-terminal.cjs` → "hepsi TAMAM"; ağ ve veritabanı yok, sahte `fetch`/`q`, sahte saat kullanılabilir):

- Sembol/interval/limit doğrulaması (geçersizler 400, sınırlar kırpılır).
- `klines` dönüşümü: Binance dizisi → `[t,o,h,l,c,qv]`, sayılar `Number`.
- Önbellek: aynı istek süre içinde ikinci kez Binance'e gitmez; uçuşta aynı anahtar tek istek.
- Kuyruk: art arda 5 istek arasında ≥ 150 ms; `/futures/data/` arasında ≥ 700 ms.
- 429 → `retry-after` boyunca istek atılmaz, 503 + `retryAfter`; 418 aynı; ağırlık başlığı 1.500 üstü → dakika sonuna kadar bekleme.
- Kuyruk taşması 503.
- İzleme: ekle/sil/tekrar ekleme/100 sınırı/tanınmayan sembol reddi (sahte `q` ile).

**Elle kabul** (denetçi kullanıcının bilgisayarında yapacak; sen bulutta ağ ve veritabanı olmadan çalışıyorsun):

- `node --check` bütün değişen `.cjs` dosyalarında temiz. `terminal.html` içindeki betik sözdizimi de denetlenmiş olmalı
  (betiği ayıklayıp `node --check` ile ya da `new Function` ile).
- Sahte veriyle çalışan küçük bir deneme sunucusu (`db\terminal-deneme.cjs`: `terminal.handle`'ı sahte `fetch` ve bellek içi `q` ile ayağa kaldırır,
  `web\public`'i sunar, rastgele yürüyüşle mum/OI üretir) ekle; denetçi bununla sayfayı Binance'e dokunmadan açabilsin. Port 3299, yalnız `127.0.0.1`.

## 8. Yapma

- Motor, kurallar, `db\` toplayıcıları, servis dosyaları: dokunma. Motoru yeniden başlatmayı gerektiren hiçbir değişiklik yok.
- `server.cjs` ve `index.html`'de §3'te sayılanlar dışında değişiklik yok.
- Gösterge (RSI, MACD…), çizim araçları, alarm, emir: bu görevin dışında. İstenmedi.
- Sır dosyalarını (`telegram\ayarlar.json`, `db\baglanti.json`) okuma, yazdırma.
- Bu ortamda ağ yok: Binance'e, npm'e, kullanıcının bilgisayarına ya da veritabanına bağlanmayı deneme. Binance alan adlarını ve yanıt biçimlerini
  depodaki mevcut kullanımlardan doğrula (`engine\live.cjs`, `engine\market.cjs`, `lib\net.cjs`, `db\turev.cjs`).

## 9. Teslim

Değişen ve eklenen dosyaların listesi, test çıktısı, emin olmadığın ya da doğrulayamadığın her nokta (özellikle Binance yanıt alanları) ve
görevden bilerek sapma yaptıysan nedeni.
