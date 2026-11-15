# GÖREV: FR botuna açık pozisyon (OI) ve long/short bağlamı + "FR Kurulum" sinyali

> Bu dosya, işi kodlayacak AI ajan için yazıldı. **Önce `AGENTS.md`'yi baştan sona oku** (kesin kurallar, mimari, kural modülü
> arayüzü, yeniden başlatma bedeli orada). Bu dosya yalnızca bu görevi anlatır.
> Hazırlanma tarihi: 11.11.2026 · Proje sürümü: 1.5.0 · Dayanak ölçüm: `db\fr-oi.cjs` (aşağıda özetlendi).
>
> **DURUM: UYGULANDI (11.11.2026, V1.6.0).** Kabul denetimi geçti (B: n=76, hedef %57, tasfiye %13 — birebir). Farklar: sayılar nokta ondalıkla
> yazılıyor (mevcut bağlam satırlarıyla aynı); oran döngüsü 600 ms'ye yavaşlatıldı; `db\turev.cjs` 1.500 ms aralıkla çalışıyor.
> Ayrıntı `AGENTS.md` §7.6 ve `..\Takip.md`.

---

## 1. Amaç

FR botu bugün "funding eksiye döndü / daha da eksiye gitti" mesajı atıyor. Ölçümler gösterdi ki bu mesaj **nerede** hareket
olacağını iyi, **girilir mi** sorusunu kötü cevaplıyor: sinyal anında mekanik giriş başa baş, 10x stopsuzda tasfiye oranı yüksek.

Bu görev FR mesajına, sinyal anındaki **bağlamı** ekler (OI değişimi, fiyatın son saatlerdeki yönü, kalabalığın long oranı,
hacim) ve bu bağlamdan iki özet üretir:

1. **Kurulum puanı (0–6):** ölçümde iyi sonuçla birlikte görülen 6 koşuldan kaçı sağlanıyor.
2. **Kaçın işaretleri (0–4):** ölçümde kötü sonuçla birlikte görülen 4 koşuldan kaçı var.

Puan yüksekse ayrıca yeni bir sinyal atılır: **`⭐ FR Kurulum`**.

Kullanıcı sinyali emir olarak değil "şuna bak" uyarısı olarak kullanır; yönü ve giriş yerini kendisi seçer. Bu yüzden hedef
"otomatik al-sat" değil, **mesajı okuyanın 3 saniyede durumu anlaması**dır.

### Kapsam dışı (yapma)

- Emir gönderme, API anahtarı, hesap verisi: hiçbiri yok (AGENTS.md §2).
- **"OI zirveden düştü → çık" sinyali yazma.** Ölçüldü: fiyatın zirveden %5 düşmesini beklemekten iyi değil ve çıkışların
  %62'sinde fiyat 4 saat sonra daha yukarıdaydı (erken çıkarıyor). İstenirse yalnız bilgi satırı olarak eklenebilir, sinyal olarak değil.
- **"OI ve fiyat birlikte artınca gir" tetiği yazma.** Ölçüldü: sinyal anında girmekten daha kötü (tasfiye %25–34, ort. −%5…−%11).
- Visivero uyumlu mevcut satırların (Funding Rate / Previous Funding / Difference / Time Remaining) sırasını ve hangi mesajın
  geldiğini değiştirme. Yalnız altına satır eklenir.

---

## 2. Ölçüm dayanağı (özet)

Kaynak betik: `db\fr-oi.cjs` (salt okunur; yeniden çalıştırılabilir: `node db\fr-oi.cjs`).
Veri: 13.10–10.11.2026, 409 coin. FR 🟢 olayları = Visivero FR arşivi (`vv_messages`, 30.10'a kadar) + kendi botumuz (`signals`, sonrası).
Fiyat `klines_5m`, OI `oi_5m`, long/short `ls_15m`.

**Tanımlar**

- *Yakalama:* bir coinde, önceki 🟢'den en az 12 saat sonra gelen ilk 🟢.
- *Tetik A — "ilk yeşil":* yakalama anı (1.971 olay).
- *Tetik B — "FR ≤ −0,10":* yakalama başladıktan sonra funding'in ilk kez −%0,10 ya da altını gösterdiği mesaj (391 olay, 164 coin).
- *Sonuç ölçüsü (kullanıcının tarzı):* long, 10x, stop yok, 48 saat. "Hedef" = fiyat −%9,5 görmeden +%10 gördü. "Tasfiye" = önce −%9,5.
  Giriş fiyatı = olayın düştüğü 5 dk mumunun kapanışı. Komisyon gidiş-dönüş %0,1 × kaldıraç.

**Tek tek özellikler (Tetik B, üçte birlik dilimler; hedef% / tasfiye% / işlem başı ort. ROE)**

| Özellik | Kötü dilim | İyi dilim |
|---|---|---|
| OI son 4 saat | ≥ +%3,3 → 19 / 42 / −23,5 | ≤ −%0,3 → 30 / 23 / +5,7 |
| OI son 24 saat | ≥ +%9,8 → 18 / 46 / −31,5 | −%1,3…+%9,8 → 37 / 20 / +16 |
| Fiyat son 4 saat | ≥ +%1,1 → 25 / 38 / −15,8 | ≤ −%2,7 → 41 / 26 / +12,6 |
| Fiyat son 24 saat | ≥ +%4 → 25 / 51 / −27,6 | ≤ −%3,5 → 30 / 21 / +8,7 |
| Kalabalık long oranı | ≤ %55,5 → 18 / 32 / −13,9 | ≥ %66,5 → 39 / 27 / +11,9 |
| Büyük hesap long oranı | ≤ %58,6 → 18 / 34 / −17,2 | ≥ %69,3 → 38 / 21 / +18,2 |
| Hacim (son 1 sa / 24 sa saatlik ort.) | ≤ 1,3× → 15 / 28 / −13,9 | ≥ 5× → 41 / 29 / +11 |
| Funding (tetik anı) | ≤ −0,20 → 18 / 38 / −21,9 | −0,10…−0,14 → 41 / 22 / +18 |
| Alıcı payı (taker), kalabalık long 4 sa değişimi | ayırt etmiyor | — |

**Okuması:** FR sinyali ortalamada bir **"silkeleme sonrası toparlanma"** sinyali olarak çalışıyor (fiyat düşmüş, OI şişmemiş,
kalabalık hâlâ long, hacim gelmiş, funding henüz sığ). **"Kovalama"** olarak çalışmıyor (fiyat ve OI zaten yükselmiş, kalabalık
short, funding derin). İkinci durum kullanıcının INIT örneğine benzer; öyle hareketler var ama sinyal anında 10x girişte çoğu
önce tasfiye ediyor.

**Birleşik puan — iki ayrı dönemde aynı yön (Tetik B)**

| Grup | 13.10–30.10 | 30.10–10.11 | Tümü |
|---|---|---|---|
| Puan 5–6 | n=47: 64 / 2 / **+60,7** | n=29: 45 / 31 / **+14,4** | n=76 (51 coin): **57 / 13 / +43,1** |
| Puan 4 | n=25: 20 / 24 / −10,3 | n=26: 27 / 23 / +1,5 | n=51: 24 / 24 / −4,3 |
| Puan 3 | n=47: 19 / 40 / −28,9 | n=40: 28 / 25 / −3,2 | n=87: 23 / 33 / −17,1 |
| Puan 0–2 | n=106: 14 / 40 / −25,9 | n=71: 18 / 32 / −10,1 | n=177: 16 / 37 / −19,6 |
| Kaçın işareti yok | n=49: 59 / 8 / +51,6 | n=30: 33 / 30 / +3,7 | n=79: 49 / 16 / +33,4 |
| Kaçın işareti 2+ | n=102: 17 / 47 / −30,1 | n=73: 23 / 38 / −14,7 | n=175: 19 / 43 / −23,6 |

Tetik A'da (ilk yeşil) aynı sıra: puan 5–6 → n=155 (97 coin), 25 / 12 / +23,3; puan 0–2 → 14 / 25 / −13,1; iki dönemde de aynı yön.

**Dürüstlük notları (kullanıcıya da aynen söylendi)**

- Eşikler bütün veriye bakılarak seçildi; dönem ayrımı yalnızca tutarlılık denetimidir, gerçek "görülmemiş veri" sınaması değildir.
- 30 gün tek piyasa dönemi. İkinci dönemde puan 5–6'nın tasfiye oranı %31 (ilkinde %2): kenar var ama oynak.
- Olaylar zaman içinde kümelenir (piyasa çapında düşüş günleri); bağımsız örnek sayısı tablodakinden azdır.
- Büyük hesapların **pozisyon** oranı (`topLongShortPositionRatio`) henüz ölçülmedi; veri `lsp_15m` tablosuna iniyor (`db\turev-poz.cjs`).

---

## 3. Yapılacaklar

Dört parça. Sırayla yap; her parçadan sonra §5'teki doğrulamayı çalıştır.

### Parça 1 — Motorda OI verisi (`engine\live.cjs`, gerekirse `engine\market.cjs`)

Kural modülleri ağ ya da veritabanı çağrısı yapamaz (`evaluate` saf ve senkron). OI'yi motor toplar ve `ctx` ile verir.

- Yeni `extras` değeri: **`'oi'`**. Bir modül isterse motor bir OI döngüsü başlatır.
- Döngü: bütün evren için `GET /fapi/v1/openInterest?symbol=X` (istek ağırlığı 1). **Tam tur 5 dakikada bir** (794 coin → 5 dk'da ~800 ağırlık;
  sınır 2.400/dk). İstekler arasında en az 150 ms; 429/418'de `retry-after` kadar bekle (`lib\net.cjs` `getJson` zaten yapıyor).
- Coin başına halka tampon: son 26 saat, 5 dakikalık adımlarla `{ t, oi }` (en çok 320 kayıt). `t` = `floor(yanıt zamanı / 5 dk) × 5 dk`.
- **Açılışta geri doldurma:** `GET /futures/data/openInterestHist?symbol=X&period=5m&limit=300` (coin başına 1 istek).
  Bu uçların ayrı sınırı var (IP başına 1.000 istek / 5 dk) ve motorun oran döngüsü de aynı uçları kullanıyor: geri doldurmayı
  **istekler arası ≥ 700 ms** ile yap (794 coin ≈ 9–10 dk) ve sinyalleri bekletme; tampon dolana kadar OI alanları `null` döner.
- Kurala verilen nesne: `ctx.oi = { oi, t, chg1h, chg4h, chg24h }`. `oi` son değer (coin adedi), `t` onun zamanı,
  `chgXh = (oi / oi(t − X) − 1) × 100`; X saat önceki kayıt yoksa o alan `null`. Henüz hiç veri yoksa `ctx.oi = null`.
  Tamponun kendisini de ver (`ctx.oiSeries`), ileride lazım olur.
- `status.json`'a `oi: { symbols: N, lastCycleMs, errors }` ekle (izlenebilirlik).
- Bu parça **motor yeniden başlatması** gerektirir (~10 dk sinyal yok). Kullanıcıya önceden söyle, bir kez yap.

### Parça 2 — FR kuralında bağlam, puan ve işaretler (`rules\flow.cjs`)

`module.exports.extras` → `['funding', 'ticker24h', 'ratios', 'oi']`, `needs` → `{ '1m': 2, '5m': 300 }`.
(`ratios` zaten motorda var: `ctx.ratios = { topLongAccount, globalLongAccount, t }`, kesir olarak; 4S botu kullanıyor.)

**2.1 Özellikler** — hepsi sinyal anında, `ctx`'ten:

| Ad | Hesap | Yoksa |
|---|---|---|
| `px4h`, `px24h` | `(ctx.price / close(5 dk mumu, açılışı b0 − X) − 1) × 100`, `b0 = floor(ctx.t / 5 dk) × 5 dk`. `ctx.bars['5m']` içinde açılış zamanı eşleşen mumu bul. | `null` |
| `oi4h`, `oi24h` | `ctx.oi.chg4h`, `ctx.oi.chg24h` | `null` |
| `crowdLong` | `ctx.ratios.globalLongAccount × 100` (veri 20 dakikadan eskiyse `null`) | `null` |
| `topLong` | `ctx.ratios.topLongAccount × 100` (yalnız mesaj satırı için; puana girmez) | `null` |
| `vol1h` | son 12 kapanmış 5 dk mumunun `quoteVolume` toplamı ÷ (son 288 mumun toplamı ÷ 24) | `null` |
| `fr` | tahmini funding, % (mevcut `cur`) | — |

**2.2 Puan ve işaretler** — eşikler ölçümden; **sabit olarak dosyanın başında, tek yerde** tanımla:

```js
const KURULUM = {                       // sağlanan her koşul +1 (0–6)
  px4h:      v => v <= -2.5,            // fiyat son 4 saatte en az %2,5 düşmüş
  oi4h:      v => v <= 3,               // OI son 4 saatte %3'ten fazla artmamış
  crowdLong: v => v >= 65,              // hesapların en az %65'i long
  vol1h:     v => v >= 3,               // son 1 saat hacmi 24 saatlik saatlik ortalamanın 3 katı
  px24h:     v => v <= 4,               // fiyat son 24 saatte %4'ten fazla yükselmemiş
  fr:        v => v >= -0.20,           // funding −0,20'den derin değil
};
const KACIN = {                         // var olan her koşul bir işaret (0–4)
  oi4h:      v => v >= 3.3,
  px24h:     v => v >= 4,
  fr:        v => v <= -0.20,
  crowdLong: v => v <= 55,
};
```

Değeri `null` olan özellik **sağlanmamış** sayılır (puana eklenmez, kaçın işareti de üretmez) ve mesajda `?` ile gösterilir.
Puanı `n / kaç özellik biliniyor` olarak yaz (örnek `4/5`); 6 özellikten 4'ten azı biliniyorsa "Kurulum" satırını ve sinyalini üretme.

**2.3 Mesaj satırları** — her 🟢 mesajına, mevcut `Seri:` ve `24s:` satırlarından sonra, uyarılardan önce:

```
OI: 4sa −1,2% · 24sa +3,0%
Fiyat: 4sa −4,1%
Long: kalabalık %71 · büyükler %74
Hacim: 6,2×
Kurulum: 5/6 ✅
```

- `Kurulum:` satırı: puan ≥ 5 → `✅`; kaçın işareti ≥ 2 → `Kurulum: 2/6 · ⚠️ Kaçın: OI 4sa +%12, fiyat 24sa +%35` (işaretleri adıyla ve değeriyle yaz).
  İkisi birden olamaz gibi görünür ama olursa (ör. puan 5, 2 işaret) kaçın uyarısı önce yazılır.
- Sayı biçimi: Türkçe ondalık virgül, işaret için mevcut `sgn()` yardımcı fonksiyonu. Bilinmeyen değer `?`.
- 🔴 (FR easing) ve `⏸ FR serisi durdu` mesajlarına yalnız `OI:` ve `Long:` satırları eklenir (puan yok).
- `fields`'a ekle: `px4h, px24h, oi4h, oi24h, crowdLong, topLong, vol1h, kurulum, kurulumN, kacin` (karne ve ileriki analizler bunları kullanacak).
- **Mevcut uyarılara dokunma** (ödemeye < 30 dk, 24 saatte ≤ −%10, funding ≤ −1). "24 saatte %10+ düşmüş" uyarısı yeni bulguyla
  ("fiyat düşmüşse iyi") çelişiyor gibi durur; farklı olay ve farklı eşik üzerinde ölçüldü. §6'daki açık soruya bak; bu görevde kaldırma.

**2.4 Yeni sinyal: `⭐ FR Kurulum`**

- Durum (coin başına, `ctx.state` içinde): `epi = { t0, greens, fr10Done, kurulumDone }`. Yakalama = önceki 🟢'den ≥ 12 saat sonra gelen 🟢 → `epi` yenilenir.
- Tetikler (ikisi de aynı yakalamada **en çok birer kez**):
  - **A:** yakalamanın ilk 🟢'i ve puan ≥ 5.
  - **B:** yakalama içinde funding ilk kez ≤ −0,10 (yeşil mesajda **ya da** dakikalık örneklemede; yalnız tarama anını bekleme) ve puan ≥ 5.
- Kaçın işareti ≥ 2 ise sinyal atılmaz.
- Çıktı: `botId: 'fr'`, `strategy: 'FR Kurulum'`, `direction: 'up'`, metin:

```
⭐ #XYZUSDT — FR Kurulum (B)
Funding Rate: -0.1042
Kurulum: 5/6 ✅
OI: 4sa −1,2% · 24sa +3,0%
Fiyat: 4sa −4,1% · 24sa −6,3%
Long: kalabalık %71 · büyükler %74
Hacim: 6,2×
Time Remaining: 02:14:59
```

- Beklenen sıklık (ölçümden): A ≈ 5/gün, B ≈ 2,5/gün. Canlıda bunun 3 katından fazlası geliyorsa bir hata var demektir.

### Parça 3 — Web ve karne

- `web\server.cjs` `BOTS`: FR aynı botta kalır; değişiklik gerekmez (yeni strateji kendi kartını açar). Kart birleştirme süresi FR için 30 dk.
- `web\public\index.html`: `⭐` ile başlayan FR kartına ince bir vurgu (ör. sol kenar sarı). Küçük iş; arayüz düzenini değiştirme.
- `db\karne.cjs`: değişiklik gerekmez (`strategy` kırılımı zaten var; "FR Kurulum" Karne'de ayrı satır olarak görünür).
- `VERSION` → 1.6.0, `package.json` aynı.

### Parça 4 — Türev verisinin veritabanında güncel tutulması (araştırma için)

`oi_5m`, `ls_15m`, `lsp_15m` tabloları tek seferlik indirmeyle doldu (10.11'e kadar). Binance geçmişi yalnız 30 gün verdiği için
düzenli güncellenmezse ileride yeniden ölçüm yapılamaz.

- `db\turev-gecmis.cjs` ve `db\turev-poz.cjs` kaldığı yerden devam edebiliyor. İkisini tek betikte birleştir (`db\turev.cjs`),
  **6 saatte bir** tam tur atacak sürekli moda al (`--bir-kez` bayrağını koru), istekler arası 700 ms.
- `servis\denetci.cjs` `PARTS`'a `turev: ['db/turev.cjs']` ekle. (Denetçi değişikliği bir sonraki Windows açılışında ya da
  kullanıcı `servis\servis-kur.bat`'ı çalıştırınca geçerli olur; bunu kullanıcıya söyle.)

---

## 4. Kısıtlar ve tuzaklar

- **Binance sınırları.** Ana sınır 2.400 ağırlık/dk (klines `limit≥1000` = 10 ağırlık!). `/futures/data/*` uçları ayrı: 1.000 istek / 5 dk, IP başına;
  motorun oran döngüsü bunları zaten sürekli kullanıyor. 429 görürsen yavaşlat; sınır aşımı IP engeline ve **canlı botların durmasına** yol açar.
- **Motor yeniden başlatması pahalı** (~10 dk sinyal yok). Parça 1 için bir kez. `rules\*.cjs` değişiklikleri 15 sn içinde kendiliğinden yüklenir
  (modül durumu sıfırlanır: seri sayaçları ve `epi` baştan başlar; kabul edilebilir).
- **`evaluate` her tikte çağrılır.** FR bölümü dakikada bir çalışır (`st.frMinute`), bağlam hesabını yalnız mesaj üretileceği zaman yap.
  `ctx.bars['5m']` erişimi 300 mumluk kopya çıkarır; her tikte çağırma.
- **`minuteSweep`** açık: bütün coinler dakikada bir değerlendirilir; Tetik B için "funding ilk kez ≤ −0,10" denetimini bu dakikalık örneklemede yap.
- **Hisse senedi sözleşmeleri** (SOXL, AMD, SAMSUNG… gibi) FR'de çok "eksiye döndü" mesajı üretir ve puanı sulandırır. Bu görevde ayrım yapma;
  `fields`'a `info.underlyingType` (varsa) yaz, ayrımı sonraki ölçüme bırak.
- **Saat dilimi:** hesaplar UTC ms; mesaj metninde saat yok. Türkçe metin, ondalık virgül.
- **Asıl kayıt PostgreSQL** (AGENTS.md §2/4). Yeni JSON veri dosyası üretme; rapor çıktıları `data\rapor\` altında kalabilir.

---

## 5. Doğrulama (kabul ölçütleri)

1. **Sözdizimi ve birim:** `node -c` her değişen dosyada. `KURULUM` / `KACIN` için sentetik `ctx` ile küçük bir sınama betiği
   (`db\test-fr-kurulum.cjs`): bilinen girdilerde puan, işaretler ve mesaj metni beklenenle aynı; `null` özellik davranışı doğru.
2. **Araştırmayla aynı tanım:** puan fonksiyonunu `rules\flow.cjs`'ten dışa aktar ve `db\fr-oi.cjs`'in "SORU 4" bölümünü bu fonksiyonla
   yeniden çalıştır. Tetik B, puan 5–6 için **n = 76 ± 5, hedef %57 ± 5, tasfiye %13 ± 5** çıkmalı (30 günlük aynı veri).
   Çıkmıyorsa tanım kaymıştır; canlıya alma.
3. **Canlı:** `data\live\status.json` → `errors: 0`, `oi.symbols ≈ 794`. `data\log\motor.log`'da 429/418 yok.
   İlk 🟢 FR mesajında yeni satırlar var; değerler aynı coinin Binance ekranındaki OI ve long/short ile kabaca tutuyor.
4. **Sıklık:** 24 saat sonra `SELECT count(*) FROM signals WHERE bot='fr' AND strategy='FR Kurulum' AND t > now() - interval '24 hours'` → 3–25 arası.
5. **Geriye uyum:** eski FR mesajlarının ilk dört satırı değişmemiş; FR tarama (`FR scan`) mesajları aynı.
6. **Belge:** `AGENTS.md` §7.6 ve `Takip.md` güncellendi (ne eklendi, hangi eşiklerle, hangi ölçüme dayanarak).

---

## 6. Açık sorular (kodlamadan önce kullanıcıya sor ya da varsayılanla ilerleyip not düş)

1. **Puan eşiği.** Sinyal için ≥ 5 önerildi (günde ~7 sinyal). ≥ 4 yaklaşık 3 katı sinyal verir ama ölçümde kenarı yok. Varsayılan: 5.
2. **"24 saatte %10+ düşmüş ⚠️" uyarısı** eski bir ölçümden (Visivero arşivi, serinin 3.+ yeşili) geliyor; yeni ölçümde düşmüş fiyat
   olumlu. İkisi farklı olayları ölçüyor. Öneri: bu görev bittikten sonra `db\fr-oi.cjs` ile "24 saatte ≤ −%10" dilimine ayrıca bakılsın,
   sonuca göre uyarı kaldırılsın ya da eşiği değişsin. Varsayılan: dokunma.
3. **Büyük hesapların pozisyon oranı** indikten sonra (`lsp_15m`) ölçülüp puana eklenmeli mi? Varsayılan: önce ölç, bu görevde ekleme.
4. **Kullanıcının INIT gözlemi** ("kalabalık short + büyükler long = sıkışma yakıtı") ortalamada tutmadı (kalabalık short dilimi en kötü).
   Bu, o tür hareketlerin olmadığı değil, sinyal anında 10x girişin onları taşıyamadığı anlamına geliyor. "Pump botu" ayrı bir görevdir;
   bu görevde o yönde kural ekleme.

---

## 7. İlgili dosyalar

| Dosya | Ne için |
|---|---|
| `AGENTS.md` | Projenin tamamı; kurallar |
| `rules\flow.cjs` | FR ve V3 kuralı (değişecek) |
| `engine\live.cjs`, `engine\market.cjs` | Motor; `extras` ve oran döngüsü örneği (`ratios`) |
| `lib\net.cjs` | `getJson` (aralıklı, 429'da bekleyen) |
| `db\fr-oi.cjs` | Bu görevin dayandığı ölçüm (özellik tanımlarının birebir kaynağı) |
| `db\fr-yakalama.cjs`, `db\fr-islem.cjs`, `db\fr-seri.cjs` | Önceki FR ölçümleri |
| `db\turev-gecmis.cjs`, `db\turev-poz.cjs` | OI ve long/short geçmişi indirme |
| `..\video\analiz.md` | Kullanıcının izlediği videolardan çıkarılan kurallar ve ölçümleri |
| `..\Takip.md` | Tarihli günlük (11.11.2026 kayıtları) |
