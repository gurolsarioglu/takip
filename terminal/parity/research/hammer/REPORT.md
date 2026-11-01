# Hammer ailesi (hammer, hammer-pro, hammer-pro-plus, 1d-hammer-pro) — kural çözümü

Teslim: `rules/hammer.cjs` (AGENTS.md arayüzü, mesaj metni dahil). Sayılar bu çalışmadaki koşulardan alınmıştır.

## Veri
- Referans: hammer-pro 6 017 mesaj (08.10→25.10), hammer 6 005 (30.08→), hammer-pro-plus 1 703, 1d-hammer-pro 600.
  Hiçbir sembol 100-mesaj sınırına ulaşmadı → geçmiş eksiksiz.
- Özellikler (`feat.cjs`): 561 USDT/USDC vadeli sembol, 1m/5m/1h. Eğitim günü 24.10 16:00→25.10 16:00 UTC,
  hold-out günü 20.10 16:00→21.10 16:00 UTC.
- Betikler: `solve.cjs, resample.cjs, srcs.cjs, feat.cjs, ctx24.cjs, validate.cjs, *.py`.

## 1. Basılan RSI neden ~%55 tutuyor?
- Kaynak değil: last/mark/index/spot denendi (60 mesaj): en iyi yine Binance last (1m %60, 1h %70); mark %15, index %7, spot %11.
- Geçmiş uzunluğu / 1m'den yeniden örnekleme değil (200…1500 bar aynı sonuç).
- Zamanlama: #W1 mesajları dakikanın 1–4. saniyesinde (%85) → 1m mum kapanışında değerlendiriliyor; #W1 1m RSI'sı kapanmış
  seriyle: tam %59, ±1 %80. #S1 mum içinde (sn 0–59).
- Fiyat çözümü: her dilim için basılan RSI'yı veren fiyat aralığı mesaj fiyatına ±%0,2–0,5 yakın ama 1m/5m/1h aralıkları
  çoğu zaman kesişmiyor (%24 kesişim) → Visivero her dilimi farklı anlık durumla hesaplıyor. ±1–3 puan gürültü kalıyor.
  Kesin çözülmedi.
- SRSI = Pine Stoch RSI K (SMA3(stoch(RSI14,14))), canlı bar dahil.

## 2. Kurallar
### Ortak
- Boost = son 5 1m mumun (4 kapanmış + canlı) max (open−low)/low (↑) / (high−open)/open (↓) — %98–99.
- Previous Price = son kapanmış 1m kapanışı (%97–98).
- Yıldız: <2 yok, [2,3) ⭐️, [3,5) ⭐️⭐️, ≥5 ⭐️⭐️⭐️ (5 017 mesajın 5 015'i).
- ❗️: RSI ≤30/≥70; SRSI ≤10/≥90.
- Tekrar engeli: aynı (sembol, strateji, yön) için ~1 gün+ tekrar yok. Referans geçmişi bot yeniden başlatmalarıyla bozuk
  (12.10 21:00, 13.10 00:00, 15.10 02:00, 17.10 21:00, 23.10 22:00, 24.10 14:00 gibi 160–530 mesajlık patlamalar).
  Simülasyonda en iyi uyum 32 saat (26 sa: kesinlik 0,72; 30 sa 0,80; 32–33 sa 0,84–0,85; 36 sa geri çağırma 0,81'e düşer).

### hammer-pro #W1
Kapanan 1m mumda WaveTrend(10,21,4) kesişimi (Pine 'first' EMA tohumu; kapanmış seri 71/73 doğru, canlı 0/73) ve:
- bölge: ↑ wt2 ≤ −53, ↓ wt2 ≥ 53 (135/135 pozitif),
- Boost (5 kapanmış mum) ≥ %1,0 (128/135; negatiflerin %96'sını eler),
- son 5 kapanmış mumun mum-içi uç RSI'sı (↑ low'da, ↓ high'da) en az biri ≤26,5 / ≥73,5,
- 32 sa tekrar engeli.
RSI/SRSI (1m/5m/1h), 24s değişim/hacim, mum şekli ek ayrım sağlamadı.
Eğitim günü (135 referans #W1), tekrar engeli referansla tohumlanmış: TP 117, FP 22, FN 18 → kesinlik 0,84, geri çağırma 0,87.
JS modülü Python ile aynı 256 adayı üretiyor. JS yeniden oynatma (tohumsuz, yalnız gün-içi engel): W1↓ P 0,62 R 0,92;
W1↑ P 0,33 R 0,88; zaman farkı medyanı +1 s.

### hammer-pro #S1 — KISMİ
44/44 pozitifte zorunlu: önceki kapanışta RSI14 < SMA14(RSI) (↑), mum içinde RSI SMA'yı keser, kesişimde SMA ≤29,3 (↑),
RSI1m <30 (↓ >70), 5m RSI ≤45, 5m SRSI ≤30, Boost ≥ %0,4. Hâlâ pozitif başına ~50 aday; tekrar engeli referanstan önce
tetiklenip doğru olanı bastırıyor. JS eğitim günü: S1↑ P 0,12 R 0,68; S1↓ P 0,04 R 0,35. Tetik anı/ek filtre çözülmedi.

### hammer-pro #R1 — ÇÖZÜLMEDİ
Yalnız ↓; 17 günde 20 mesaj. Basılan aralık: RSI1m 71–82, RSI5m ≥72, RSI1h ≥68, Boost ≥1,9. Modülde yer tutucu (JS: 22 aday, 1 TP).

### hammer-pro-plus
= Pro sinyali VE (Boost ≥ %2,00 VEYA altılı aşırılık: RSI1m ≤22, RSI5m ≤23, RSI1h ≤27, üç SRSI ≤10; ↓ simetrik).
Pro mesajları üzerinde TP 1 077, FP 11, FN 0 (kesinlik %99, geri çağırma %100). Pro+ 1 082 mesajın 1 074'ü ≤2 s içinde Pro'da.

### hammer (düz)
= Pro #S1 + #R1, Strategy/WT/Pivot satırı yok (yalnız BTC Status, FR). Pencerede 2 052/2 079 (%98,7) eşleşme.

### 1d-hammer-pro — DENEYSEL
Aynı motor 1h|4h|1d düzeninde, ana dilim 1d: #W1 günlük kapanışta (00:00:16 UTC partisi; 05:00 partileri yeniden başlatma),
#S1/#R1 gün içinde. Previous Price = son kapanmış 1d (%97), Boost = 1d 5-mum itkisi (%92). Eşikler kopyalandı, doğrulanmadı
(`ctx.enable1d = true`).

## 3. Ek satırlar
- `WT:` 1m 5m 1h yuvaları boşlukla birleştirilir (`1m🟢  `, `  1h🔴`); 5m/1h etiket koşulu varsayım.
- `Divergence: 1m✅ 5m✅ 1h✅` aynı yuva biçimi; algoritma doğrulanmadı.
- `Pivot: %x ⚠️` günlük klasik pivota <%1; `4H.E200: %x ⚠️` 4s EMA200'e <%1; `FR: -x ⚠️` fonlama ≤ −%0,20.
- `BTC Status: Volatilite ⚡️` çözülmedi (Pro %25, 1d %100); yer tutucu |BTC 1s değişimi| ≥%0,5.
- `Coin Status: New ⚠️` ctx.coinNew ile (kural çözülmedi).

## 4. Hold-out (20.10 16:00 → 21.10 16:00 UTC, tohumlanmış tekrar engeli, JS modülü)
| bot / strateji | TP | FP | FN | kesinlik | geri çağırma | Δt medyan |
|---|---|---|---|---|---|---|
| hammer-pro #W1↓ | 46 | 80 | 7 | 0,37 | 0,87 | +3 s |
| hammer-pro #W1↑ | 12 | 50 | 5 | 0,19 | 0,71 | +2 s |
| hammer-pro #S1↓ | 6 | 154 | 8 | 0,04 | 0,43 | |
| hammer-pro #S1↑ | 4 | 62 | 3 | 0,06 | 0,57 | |
| hammer-pro #R1↓ | 0 | 37 | 3 | 0 | 0 | |
| hammer-pro-plus #W1 (↓/↑) | 4/2 | 22/8 | 0/0 | 0,15/0,20 | 1,0/1,0 | |
| hammer (S1+R1) | 11 | 252 | 13 | 0,04 | 0,46 | |

Sonuç: #W1 tetik koşulu hold-out'ta da yakalıyor (geri çağırma 0,83), ama eğitimdeki 0,84 kesinlik hold-out'ta **0,31**'e
düştü — 32 sa tekrar engeli eğitim gününe aşırı uymuş; fazla sinyallerin kaynağı (sembol/zamanlama filtresi veya farklı
tekrar kuralı) çözülmedi. #S1/#R1 kullanılabilir değil. Pro+ türetme kuralı (Pro → Pro+) bağımsız olarak %99/%100 doğru;
Pro+ hatası Pro'dan miras.

## 5. Açık sorunlar
1. Basılan RSI/SRSI gürültüsünün kaynağı (dilim başına farklı anlık durum).
2. #S1 tetik anı ve eksik filtresi; #R1 kuralı.
3. Tekrar engelinin kesin biçimi (32 sa kayan pencere en iyi uyum; takvim günü + yeniden başlatmada sıfırlanma da olası).
4. BTC Status, Coin Status, Divergence, ek WT etiketleri, 1d-hammer-pro eşikleri.
