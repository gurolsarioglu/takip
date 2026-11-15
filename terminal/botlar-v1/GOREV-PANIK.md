# GÖREV: "Panik Dibi" botunu yaz (`panik`)

> Hazırlanma: 12.11.2026 · Proje sürümü: 1.6.0 → hedef 1.7.0
> Strateji, ölçüm ve kullanım: `KILAVUZ-PANIK.md` (önce onu oku). Proje kuralları: `AGENTS.md` (§2 kesin kurallar, §6.2 modül arayüzü, §6.3 yeni bot adımları).
> Bu görev yalnız **sinyal üretir**. Emir, API anahtarı, işlem kodu yok (AGENTS.md §2).

## 1. Ne yapılacak

Yeni kural modülü `rules\panik.cjs`. Piyasa topluca çökerken (aşağıdaki üç koşul) düşmüş coinleri "Panik Dibi" sinyali olarak yayınlar; ayrıca piyasa durumunu tek mesajla bildirir. Eşikleri değiştirme: hepsi 24 aylık veride ölçüldü ve donduruldu.

## 2. Tanımlar (hepsi **kapanmış** 5 dk mumlardan)

Bir "dilim" = az önce kapanan 5 dk mum (açılış zamanı `T`, 5 dakikanın katı).

Coin başına (son kapanmış mumun kapanışı `c0`):

- `r1` = (`c0` / 12 mum önceki kapanış − 1) × 100
- `r24` = (`c0` / 288 mum önceki kapanış − 1) × 100
- `q24` = 24 saatlik USDT hacmi, milyon $ (`ctx.ticker24h.quoteVolume / 1e6`; yoksa son 288 mumun `quoteVolume` toplamı)
- Coin dilime ancak son 289 kapanmış 5 dk mumu **boşluksuz** ise katılır (yeni listelenenler dışarıda).

Piyasa (dilime katılan bütün coinler üzerinden, sayı `n`):

- `sd10` = `r24 ≤ −10` olan coinlerin yüzdesi
- `s1` = `r1 ≤ −2` olan coinlerin yüzdesi
- `b1` = BTCUSDT'nin `r1` değeri
- `n < 200` ise karar verme (veri eksik).

## 3. Kural

```js
const K = { sd10Yarim: 10, sd10: 20, sd10Guc3: 35, s1: 20, b1: -1,          // piyasa
            r1: -3, r24max: -8, r24min: -25, q24: 5,                         // coin
            mumBasi: 5, sogumaMs: 6 * 3600e3, bolumSessizMs: 6 * 3600e3 };
```

- **Panik** (dilim için): `sd10 ≥ 20` ve `s1 ≥ 20` ve `b1 ≤ −1`. Güç = `sd10 ≥ 35 ? 3 : 2`.
- **Yarım panik:** `10 ≤ sd10 < 20` ve `s1 ≥ 20` ve `b1 ≤ −1`. Coin sinyali YOK, yalnız piyasa uyarısı.
- **Aday coin:** `r1 ≤ −3` ve `−25 ≤ r24 ≤ −8` ve `q24 ≥ 5`.
- **Yayın:** panik olan dilimde, soğumada olmayan adaylar `r24` küçükten büyüğe (en çok düşen önce; eşitlikte sembol adına göre) sıralanır, ilk **5** tanesi sinyal olur. Sinyal verilen coin 6 saat soğumaya girer.
- **Bölüm:** ilk panik dilimiyle başlar; 6 saat boyunca panik dilimi gelmezse biter.

## 4. Motorla bağlantı (öneri; `rules\flow.cjs` örnek alınabilir)

Karar bütün coinlere bakmayı gerektirir; `evaluate` ise coin coin çağrılır. `flow.cjs` içindeki `GAIN` haritası gibi **modül düzeyinde** durum tut:

```js
module.exports = { family: 'panik', bots: ['panik'], needs: { '5m': 300 }, extras: ['ticker24h'], minuteSweep: true, cadenceMs: 60e3, evaluate };
```

1. Her dakika taramasında her coin için: son kapanmış 5 dk mumunu bul (`bars['5m']` dizisinin son elemanı canlı mumdur; ondan önceki kapanmıştır). `SON.set(symbol, { T, r1, r24, q24, price })`.
2. **Karar taraması** = dakika sayısı 5'e bölününce 1 kalan tarama (xx:01, xx:06, …). O anda bütün coinlerin `SON` kaydı bir önceki taramada (xx:00, xx:05) güncellenmiştir. Dilimin kararı tarama başına **bir kez** hesaplanıp modül düzeyinde saklanır (`KARAR = { T, panik, guc, sd10, s1, b1, n, secilen: Set }`); yalnız `T` değeri bu dilime eşit olan `SON` kayıtları sayılır.
3. `evaluate(ctx)` o coin `KARAR.secilen` içindeyse sinyali döndürür. Piyasa mesajını `BTCUSDT` değerlendirmesi taşır.
4. 1 dakikalık gecikme sorun değil: ölçümde 5 ve 15 dakika geç giriş sonucu değiştirmedi.
5. Soğuma haritası modül düzeyinde (`Map symbol → t`). Yeniden yüklemede sıfırlanır; ayrıca `ctx.state.sonSinyal` içine de yaz ve varsa oradan oku ki motor yeniden başlayınca aynı coin hemen tekrar gelmesin.
6. `ctx.event === 'warmup'` ise sinyal üretme. Modül yeni yüklendiyse ilk karar taramasından önce en az bir tam tarama geçmiş olsun.
7. Ağ çağrısı yok; `evaluate` hızlı kalmalı (karar hesabı ~800 coin üzerinde tek geçiş).

Saf fonksiyonları dışa aç (test ve ölçüm bunları kullanacak):

```js
piyasa(kayitlar)            // [{symbol, r1, r24}] → { n, sd10, s1, b1 }   (b1 = BTCUSDT'nin r1'i; yoksa null)
durum(p)                    // { panik: bool, yarim: bool, guc: 0|2|3 }
sec(kayitlar, soguma, t)    // adayları süz, sırala, ilk 5'i döndür (soğuma haritasına dokunmadan)
```

## 5. Mesajlar

Sayılar mevcut botlarla aynı biçimde: ondalık nokta, eksi işareti `−` (U+2212), yüzde işareti sonda.

**Coin sinyali** — `botId: 'panik'`, `direction: 'up'`, `strategy: 'Panik Dibi'`:

```
🧲 #XYZUSDT — Panik Dibi (Güç 3)
Coin: 1sa −5.2% · 24sa −14.8%
Piyasa: %42'si 24sa'te −%10 altında · %71'i 1sa'te −%2 altında · BTC 1sa −2.3%
Plan: 24 saat tut · kaldıraç en çok 3–5x · dar stop yok
```

`fields`: `{ guc, r1, r24, q24, sd10, s1, b1, n, bolumT }` (`bolumT` = bölümün başladığı an, ms).

**Piyasa mesajı** — `symbol: 'BTCUSDT'`, `direction: null`:

| Durum | `strategy` | Ne zaman | Metin başlığı |
|---|---|---|---|
| Yarım panik | `'Panik Uyarı'` | yarım paniğe ilk girişte; 6 saatte en çok bir kez; bölüm sürerken verilmez | `⚠️ Piyasa geriliyor — henüz giriş yok` |
| Panik başladı | `'Panik Alarm'` | bölümün ilk panik diliminde | `🚨 PİYASA PANİĞİ (Güç 2)` |
| Güç arttı | `'Panik Alarm'` | bölüm içinde güç 2 → 3 olduğunda (bir kez) | `🚨 PİYASA PANİĞİ (Güç 3)` |

Her piyasa mesajının gövdesi: `Piyasa: …` satırı (yukarıdaki gibi) ve `Coin sayısı: n`.

## 6. Diğer dosyalar

1. `web\server.cjs` → `BOTS` dizisine `{ id: 'panik', gap: 21600e3, name: 'Panik Dibi', desc: 'Piyasa topluca çökerken düşmüş coinler. Ayda 2–3 gün. 24 saat tutulur; küçük hedefle çalışmaz.' }`.
2. `db\karne.cjs` → `GAP` ifadesine `WHEN 'panik' THEN interval '6 hours'`. Karne `dir IS NOT NULL` olanları sayar; piyasa mesajları (`direction: null`) kendiliğinden dışarıda kalır.
3. `web\public\index.html` → `m.strategy === 'Panik Alarm'` kartına belirgin stil (FR Kurulum'daki `.card.kurulum` gibi, kırmızı kenar).
4. `VERSION` ve `package.json` → `1.7.0`. `AGENTS.md` §7'ye "Panik" bölümü, §5 klasör haritasına yeni dosyalar. `..\Takip.md`'ye tarihli kayıt.

## 7. Test ve kabul

**Birim testi** `db\test-panik.cjs` (ağsız, veritabanısız, `node db/test-panik.cjs` → "hepsi TAMAM"):

- `piyasa`: 300 kayıtlık yapay listede `sd10`, `s1`, `b1` doğru; BTC yoksa `b1 = null` ve `durum` panik vermez.
- `durum`: (sd10 25, s1 30, b1 −1.2) → panik, güç 2 · (40, 30, −1.2) → güç 3 · (15, 30, −1.2) → yarım · (25, 30, −0.8) → hiçbiri · (25, 15, −1.2) → hiçbiri.
- `sec`: 8 adaydan en çok düşen 5'i; `r24 = −30` olan dışarıda; `q24 = 3` olan dışarıda; soğumadaki dışarıda; eşit `r24`'te sembol sırası.

**Geçmiş veriyle kabul** `db\panik-kabul.cjs`: modülün `durum` ve `sec` fonksiyonlarını `data\arastirma\arsiv-olay-b*.jsonl` satırlarına uygular (satırdaki `f.sd10`, `f.s1`, `f.b1`, `f.r1`, `f.r24`, `f.q24` hazır; `d === 1`, `g` içinde `'A'`, `n === 576` olan satırlar; aynı `t` = aynı dilim). Çıkan sinyal listesi `db\panik-olcum.cjs` ile **aynı sayıyı** vermeli:

| Küme / aralık | Sinyal | Panik günü |
|---|---|---|
| `b` (2024-11 → 2025-10) | 2.488 | 45 |
| `a`, 2025-11-01 → 2026-07-01 | 912 | 15 |
| `c`, 2026-10-01 → | 135 | 3 |

**Canlı kabul** (motor yeni modülü 15 sn içinde yükler; yeniden başlatma gerekmez):

- `data\log\motor.log` içinde `module panik.cjs` satırı; `status.json` → `errors: 0`.
- Panik yokken hiç sinyal yok. Karar taramasının süresini bir kez ölç ve logla; 50 ms'yi geçmemeli.
- Doğrulama için geçici bir log satırı: her karar taramasında `panik T=… n=… sd10=… s1=… b1=…` (ilk 24 saat açık kalsın, sonra kaldır). `n` ≈ evren büyüklüğü (≈ 790) olmalı.

## 8. Yapma

- Eşikleri "iyileştirme". Değişiklik önerin varsa `db\panik-olcum.cjs` ile üç kümede de ölç, sonucu kullanıcıya göster; kendiliğinden değiştirme.
- OI, long/short ya da funding koşulu ekleme: 30 günlük veriyle kanıtlanamıyor.
- Coin sinyaline hedef fiyat ya da stop fiyatı yazma: ölçüm küçük hedefin ve dar stopun bu stratejiyi bozduğunu gösterdi (KILAVUZ-PANIK.md §5).
- `data\arastirma` içindekileri silme (kullanıcı onayı gerekir).
