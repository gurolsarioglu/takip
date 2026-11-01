# FR ve V3 botları — çözülmüş kurallar (alt ajan "flow")

Modül: `rules/flow.cjs` (bots: `fr`, `v3`). Doğrulama: `research/flow/validate.cjs` (çevrimdışı; kayıtlı Binance
örnekleri + canlı Visivero akışı). Kayıt araçları: `record.cjs` (premiumIndex, her dakika :00.2), `recordv3.cjs`
(1 dk kline websocket + 24s ticker REST + `!ticker@arr`), `v3check.cjs` (geçmiş kline ile formül testi).

## Altyapı notları (diğer ajanlar için önemli)
- `wss://fstream.binance.com/stream` artık veri göndermiyor; `wss://fstream.binance.com/market/stream` kullanılmalı.
- exchangeInfo'da 225 sembol `contractType = TRADIFI_PERPETUAL` (hisse, HK/KR hisse, emtia). Visivero bunları da
  tarıyor (V3 ve FR mesajlarının önemli kısmı). Evren filtresi `PERPETUAL || TRADIFI_PERPETUAL` olmalı.
- İllikit sembollerde kline "kapandı (x=true)" olayı bir sonraki işleme kadar gecikebiliyor; dakika sonunda son
  güncelleme kullanılmalı.

## FR (Funding Rate)
Kaynak: `premiumIndex.lastFundingRate` (= `!markPrice@arr` 'r'), ham kesir; `nextFundingTime`. Visivero her dakika
başında (createdAt ≈ :00.4–:00.8) tüm sembolleri bir kez örnekliyor; "önceki" = bir önceki dakikanın örneği.
Gösterim `Funding Rate = (rate·100).toFixed(4)`.

| Mesaj | Koşul (cur = bu dakika, prev = önceki dakika, yüzde puan) |
|---|---|
| `🟢` + `⚠️ Funding changed from + to -` | önceki ham oran TAM 0 ve `cur.toFixed(4) < 0` (≤ −0.0001) |
| `🟢` (Previous/Difference) | `cur < 0` ve `prev − cur ≥ 0.009` |
| `🔴` (Previous/Difference) | `cur < 0` ve `cur − prev ≥ 0.009` |
| `#SYM` (ikonsuz tarama) | global tarama dakikasında `cur ≤ −0.20` |

- `Difference = (prev − cur).toFixed(6)`, `Previous Funding` 4 basamak.
- Küçük pozitiften negatife geçiş mesaj üretmiyor (canlıda 38 geçiş, Visivero 0 mesaj); "−0.0000"a düşüş de üretmiyor
  (2 vaka). "− to +" hiç görülmedi.
- `Time Remaining`: `ms = nextFundingTime − now`; h/m/s = `floor`, `x<10 ? '0'+x : x`; fonlama anında Visivero
  `0-1:0-1:0-1` basıyor, formül aynısını üretir.
- İkonsuz tarama GLOBAL: dakika tikinde "son taramadan ≥ 600 000 ms" ise çalışır; ardışık taramalar 600 s veya 660 s.
- Ek tür `<b>SE</b> #SYM\n28.76%` (20 günde 17 kez, 5 dk döngü, değer ≥ 25.00): OI/long-short/taker/basis/spot
  hacim/fiyat metrikleriyle eşleşmedi → AÇIK.

### Ölçümler
- Canlı paralel kayıt 239 dakika, tarama fazı Visivero'ya kilitli: **TP 86 / FP 0 / FN 0, metin 86/86 birebir**
  (flip 3/3, 🔴 8/8, ikonsuz 75/75; bu pencerede 🟢-derinleşme oluşmadı).
- Serbest fazda: değişim mesajları yine 11/11; ikonsuz tarama içeriği aynı ama dakika fazı tutmuyor (11/75).
- Geçmiş tutarlılık (9 834 mesaj): `Previous(t) == Funding(t−1)` 1251/1251; tüm 🟢/🔴 değişimlerde
  `|Difference| ≥ 0.009003`; "+ to −" mesajlarının 1686/1686'sında Previous = 0.0000; ikonsuzların 5970/5970'i ≤ −0.2000.

## V3 (V3-A Hacim)
- Her dakikanın :00'ında. `Hacim % = V1m / (V24 − V1m) · 100`, `V1m` = yeni kapanan 1 dk mumun base hacmi,
  `V24` = 24s base hacim (mesajda yazan). Tetik `≥ 8.00` (en küçük gözlenen 8.00). Cooldown yok, sembol filtresi yok.
- Metin: `#SYM\nHacim: +${Number(p.toFixed(2))}%\n24s Hacim: ${V24.toLocaleString('tr-TR')} ${BASE}`.
- Formül doğrulaması (mesajdaki V24 ile): son 250 mesaj **250/250**, hold-out (5 Ekim) **250/250**.
- Canlı paralel (151 dk, ~118 000 sembol-dakika, REST ticker :00.2): **TP 26 / FP 7 / FN 1** (precision 0.79,
  recall 0.96); yüzde birebir yalnız 2/26 — Visivero'nun V24 değeri bizim ticker okumamızdan farklı (bazı
  sembollerde tam olarak "önceki dakika ticker + V1m", bazılarında %4–40 düşük; özellikle TradFi/illikit). Alternatif
  "V1m / önceki dakika ticker" TP 26 / FP 8 / FN 1, yüzde birebir 8/26.

## Açık konular
1. V3'te Visivero'nun 24s hacim kaynağı (FP'lerin ve yüzde farkının nedeni).
2. FR ikonsuz taramanın dakika fazı Visivero'ya bağımsız olarak kilitlenemiyor (içerik aynı).
3. `SE` mesajlarının metriği.
4. Canlı motor (me-016-live) karşılaştırması: compare.cjs 17:23–20:04 için fr FN 7 / v3 FN 30, TP 0 — motor
   status.json'da `ticks 0, evals 0`; motor sinyal üretmiyor (motor tarafı sorunu, kural değil).
