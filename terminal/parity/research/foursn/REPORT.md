# 4S / 4S Sniper / 1DWS — kural çözümü (alt ajan foursn)

Modül: rules/four-s.cjs (aile four-s; botlar 4s, 4sniper, 1dws). Kanıt: data/foursn/validate-4h.json, validate-12h.json.

## Zamanlama
- 4S ve 4S Sniper aynı taramada: her 4s mum açılışı (UTC 00/04/08/12/16/20) sonrası ~0-15 dk, semboller alfabetik sırayla. 1DWS: UTC 00:00 ve 12:00.
- Sembol başına döngüde bir değerlendirme; cooldown yok (koşul sürdükçe her döngüde tekrar). Aynı döngüde birden fazla strateji olabilir.

## Kurallar (canlı mum = kapanmış mumlar + anlık fiyat close)
- 4s: canlı 4s mumda WaveTrend(10,21,4) kesişimi ve WT1 <= -55 (yeşil) / >= +55 (kırmızı). (eşik 53..56 arası; 55 seçildi)
- 4sniper NW UP/DOWN: Nadaraya-Watson (h=8, mult=3, repaint), son 500 değer (499 kapanmış 4s + canlı fiyat). Fiyat < alt bant -> NW UP, > üst bant -> NW DOWN. RSI filtresi yok.
- 4sniper 4H RSI SMA CROSSED: canlı 4s mumda RSI14 / SMA14(RSI) kesişimi ve son kapanmış mumun RSI <=30 (yeşil) / >=70 (kırmızı).
- 1dws NW: aynı NW, 1g mumda, son 200 değer (199 kapanmış + canlı). 1D RSI SMA CROSSED: 4s ile aynı mantık, 1g.
- 4H/1D RSI DIVERGENCE: çözülmedi, modülde kapalı (params.divergence.enabled=false).

## Mesaj alanları
- Boost: strateji mumunda (4s/4sniper 4s, 1dws 1g) son 5 mum (4 kapanmış + canlı) maks (open-low)/low (yeşil) / (high-open)/open (kırmızı). 4s/4sniper 90/90, 1dws 143/157 (yaklaşık canlı gün H/L nedeniyle).
- Previous Price: 4s/4sniper = son kapanmış 1s close (90/90); 1dws = son kapanmış 1g close (157/157).
- RSI/SRSI satırı 4s/4sniper "1h | 4h | 1d", 1dws "1h | 1d | 1d". Ünlem yön bağımlı: yeşilde yalnız düşük (RSI<=30, SRSI<=10; SRSI 1h düşükte yok), kırmızıda yalnız yüksek (RSI>=70, SRSI>=90); ham değere göre, yazılan değer yuvarlanmış.
- Trader Positioning = /futures/data/topLongShortAccountRatio; Market Exposure = /futures/data/globalLongShortAccountRatio. Baskın taraf yüzdesi (>=50) + renk (long yeşil, short kırmızı). Taraf 30/30; 2 ondalık birebir ~%40 (5m periyot, son veya bir önceki satır) -> Visivero birkaç dk önbellekli. 4s ve 4sniper'da var, 1dws'de yok. "Market: FUTURES" satırı yalnız 4s'te.

## Ölçüm (validate.cjs; referansla aynı t ve fiyat)
3 tam 4s döngüsü (25.10 04/08/12 UTC, ~560 sembol, FP sayımı ~1680 sembol-döngü) + 20 eski döngü (yalnız pozitif). 1dws: 2 tam döngü (~1120 sembol-döngü) + 12 eski.
| bot/strateji | isabet | FP |
|---|---|---|
| 4s yeşil | 120/125 (%96) | 0 |
| 4s kırmızı | 64/69 (%93) | 0 |
| 4sniper NW UP | 454/457 (%99) | 1 |
| 4sniper NW DOWN | 371/387 (%96) | 1 |
| 4sniper 4H RSI SMA CROSSED | 19/22 | 1 |
| 4sniper 4H RSI DIVERGENCE | 0/78 (kapalı) | 0 |
| 1dws NW UP | 287/298 (%96) | 2 |
| 1dws NW DOWN | 179/181 (%99) | 1 |
| 1dws 1D RSI SMA CROSSED | 39/41 | 2 |
| 1dws 1D RSI DIVERGENCE | 0/65 (kapalı) | 0 |
Hold-out (25.10 04-12 UTC): 4s 28/28, NW UP 35/35, NW DOWN 23/23, toplam FP 3. Uyarı: eşiklerin bir kısmı bu döngülerle seçildi; gerçek ileri test compare.cjs ile canlı yapılmalı.
Metin birebir (Positioning hariç) ~%30-47; farklar 1 puanlık RSI/SRSI ve 1g canlı H/L yaklaşığı.

## Açık sorunlar
1. Divergence: Pine RSI pivot 5/5, LonesomeTheBlue 5in1, fiyat/RSI pivot varyantları tutmadı (en iyi aday 6/10 isabet, 62 FP). Desen: son kapanmış mumun low'u ~5 mum önceki pivottan düşük, RSI daha yüksek, RSI<=35. DIV botu (1H) ile ortak algoritma olabilir.
2. Kısa geçmişli semboller (4s<500, 1g<200 mum): NW kaçırmalarının çoğu; fiyat bandın hemen içinde.
3. SRSI 1-3 puan sapma (ortak).
4. compare.cjs ile canlı doğrulama henüz yapılmadı (sonraki 4s döngüsü).

Dosyalar: research/foursn/features.cjs, nwvar.cjs, divvar.cjs, lbdiv.cjs, divpy*.py, ratios.cjs, validate.cjs, an.py, dbgnw.cjs.
