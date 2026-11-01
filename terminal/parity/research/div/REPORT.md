# DIV botu — çözüm raporu (25.10.2026)

Ölçüm: 770 sembol, 3–25 Ekim, her saat simüle edildi (tekrar kuralları dahil). Visivero sinyal vermediği zamanlarda tarama anı fiyatı için 15 dk mum kapanışı kullanıldı.

## Tarama zamanı
- DIV saatte bir, :00–:13 arasında sembolleri alfabetik sırayla tarar (canlı 1s mum 0–13 dk yaşında).
- 4H stratejileri yalnız 4 saatlik sınırlarda (00/04/08/12/16/20 UTC) görülür; aynı taramada 1H DIVERGENCE ile birlikte hiç çıkmadı (0/44).
- Sembol başına en fazla 14 DIV mesajı var; 100 mesaj saklama sınırı etkilemiyor.

## Mesaj alanları
- Previous Price = son kapanmış 1s kapanışı (80/80).
- Boost = 1s'te 5 mumluk itki, 4 kapanmış + canlı (78/80).
- RSI canlı fiyatla 1s/4s/1g'de %95–99 birebir; SRSI (StochRSI K) %53–76.
- 4H stratejilerinde Boost/Previous Price için 4s mum varsayıldı (doğrulanmadı).

## 1H RSI DIVERGENCE kuralı
`i` = son kapanmış 1s mum. Çapa `j` = `i-80 … i-2` aralığında RSI'ı en düşük mum.
Yükseliş (🟢), hepsi birlikte:
- Çapada RSI ≤ 30 ve çapa ±2 mum içinde yerel RSI dibi;
- `low[i] < low[j]` ve `RSI[i] > RSI[j]`;
- çapa ile `i` arasında `i`'den daha düşük dip yok;
- canlı RSI ≤ 40.

Düşüş (🔴) aynasıdır: en yüksek RSI ≥ 70, dip yerine tepe, canlı RSI ≥ 57.
Tekrar: aynı çapadan ikinci sinyal yok; aynı yönde en az 3 saat ara.

| Dönem | Yakalama | İsabet | TP | FP | FN |
|---|---|---|---|---|---|
| Tümü | 0.903 | 0.724 | 4142 | 1577 | 443 |
| İlk yarı (holdout) | 0.906 | 0.776 | | | |
| İkinci yarı (holdout) | 0.900 | 0.674 | | | |

JS modülü yeniden oynatması (her 3. mesaj): yukarı 972/1027, aşağı 509/533 doğru tetik. Fazla sinyaller tüm piyasanın sert hareket ettiği saatlerde kümeleniyor; sebebi bulunamadı.
Elenen tanımlar: Pine RSI divergence (5/5 pivot, aralık 5–60), Trader Club 5in1 / LonesomeTheBlue (P=1..10, high/low/close, teyitli/teyitsiz, çizgi kontrolü), scipy son iki pivot, "yeni N mum uç değeri".

## 1H RSI SMA CROSSED (kısmen)
255/255 mesajda canlı RSI14 kendi SMA14'ünü canlı mumda kesiyor; son kapanmış RSI ≤ 30 (🟢) / ≥ 70 (🔴). Yakalama 0.77–0.82 ama isabet ~0.10. Modülde 24 saat bekleme ile tutuldu.

## 4H RSI DIVERGENCE / 4H RSI SMA CROSSED (çözülmedi)
Aynı kural 4s'te gerçek sinyalleri buluyor (yakalama ~0.88; JS yukarı 12/13, aşağı 1/2, SMA 9/9) ama isabet 0.02–0.03 (44 gerçeğe karşı ~1500 tespit). Visivero ek bir seçim kuralı uyguluyor. 4sniper/1dws divergence stratejileri `anchorDivergence()` fonksiyonunu kullanabilir.

## Pivot satırı (çözülmedi)
Traditional, Fibonacci, Camarilla; 1s/4s/günlük/haftalık — 400 örnekte hiçbiri %4'ü geçmedi. Modül bu satırı basmıyor.

## Dosyalar
`rules/div.cjs` (arayüz AGENTS.md; `anchorDivergence`, `rsiSmaCross`, `impulse5`, `formatText` export), araştırma: `research/div/` (dl.cjs, fullsim.py, check_js.cjs …), veri: `data/div/k/`, `data/div/full1h.json`.

## Açık işler
1. 1H DIV'de ~%28 fazla, ~%10 eksik.
2. SMA CROSSED ve 4H stratejilerinin seçim kuralı.
3. Pivot formülü; SRSI 1–3 puan farkı.
4. Canlı gölge çalıştırma ile doğrulama.
