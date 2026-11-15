# Botlar V1 — AI Ajan Geliştirme Rehberi

> Bu dosya, projeyi hiç görmemiş bir AI kodlama ajanının (Claude Code, Cursor, Codex vb.) okuyup
> doğrudan geliştirmeye başlayabilmesi için yazıldı. **Kod yazmadan önce tamamını oku.**
> Durum tarihi: **10.11.2026**, sürüm **1.6.0**. Burada yazan her sayı o tarihte ölçülmüştür.
>
> İlgili dosyalar: `..\Takip.md` (tarihli proje günlüğü, karar ve bulguların ham kaydı),
> `README.md` (kullanıcıya yönelik kısa tanıtım, kısmen eski), `..\parity\AGENTS.md` (eski laboratuvarın protokolü).
> Bu dosya ile kod çelişirse **kod doğrudur**; farkı bu dosyada düzelt.

---

## 1. Proje bir bakışta

**Ne:** Binance USDⓈ-M vadeli işlemlerdeki ~794 coini canlı izleyen, 8 sinyal botu çalıştıran,
sinyalleri yerel bir web sitesinde gösteren ve sonuçlarını ölçen kişisel bir sistem.
**Emir vermez**, borsaya API anahtarıyla bağlanmaz; yalnızca herkese açık piyasa verisini okur.

**Geçmiş:** Proje, ücretli bir sinyal servisinin (Visivero, terminal.visivero.com) botlarını
birebir kopyalamak için başladı (25.10.2026). Kurallar Visivero mesaj arşivinden tersine mühendislikle
çıkarıldı. 30.10.2026'da Visivero takibi durduruldu; sistem artık tamamen bağımsız. Kod yorumlarında
"Visivero" geçen her yer bu kökene atıftır, **çalışma anında Visivero'ya hiçbir bağlantı yoktur**.

**Nerede çalışır:** Kullanıcının tek Windows bilgisayarı. Her şey yereldir (127.0.0.1).
Site: **http://localhost:3200**

**Botlar:** M1, M1 Premium, 4S, 4S Sniper, 1DWS, DIV, FR, V3, Hammer (kendi sürümümüz, 10.11.2026).

**Şu anki odak:** web uygulaması ve "hangi sinyal gerçekten işe yarıyor" ölçümü (Karne).
Telegram gönderici yazıldı ama kullanıcı tarafından durduruldu; şimdilik konu değil.

---

## 2. Kesin kurallar (ihlal etme)

1. **Sırlar.** `telegram\ayarlar.json` (Telegram bot tokeni) ve `db\baglanti.json` (veritabanı şifresi)
   dosyalarının içeriğini sohbete, loga, koda ya da git'e yazma. Kod bu dosyaları çalışma anında okur;
   senin içeriği görmene gerek yok. Kullanıcı sohbete token yapıştırırsa kullanma, iptal etmesini söyle.
   İkisi de `.gitignore`'dadır; `..\parity\tools\push-takip.cjs` bunlar görünürse göndermeyi durdurur.
2. **Emir/işlem yok.** Borsaya emir gönderen, API anahtarı isteyen ya da para hareketi yapan kod yazma.
   Kullanıcı açıkça istemedikçe bu kapsam dışıdır. Yatırım tavsiyesi verme; ölçüm sonucunu sayılarla anlat.
3. **Yalnızca yerel.** Sunucular `127.0.0.1`'e bağlanır. Dışarı açma (tünel, 0.0.0.0, port yönlendirme) yok.
   Kullanıcı bunu bilerek istedi.
4. **Veri kaybı yok. Asıl kayıt PostgreSQL'dir** (kullanıcı kararı, 11.11.2026: "tek kayıt, hep PostgreSQL").
   Sinyaller `signals` tablosunda, Kasa `kasa_periods` / `kasa_trades` tablolarında yaşar; web ikisini de veritabanından okur.
   `data\live\signals-*.jsonl` artık yalnızca motorun **tamponudur**: yazıcı satırları veritabanına aktarır, tamamı aktarılmış eski
   günlerin dosyasını (yalnız `data\ayar.json` → `{"jsonlGun": N}` varsa) siler. Veritabanında `DROP`/`TRUNCATE`/toplu `DELETE`
   için kullanıcıdan açık onay al. Gece yedeği: `data\yedek\`.
5. **Sistem ayarı değiştirme.** Windows güç/uyku, güvenlik duvarı, servis hesabı gibi ayarları kendin
   değiştirme; kullanıcıya adımı tarif et. Yönetici izni isteyen tek betik `servis\servis-kur.bat`'tır ve
   onu **kullanıcı** çalıştırır.
6. **Binance hız sınırı.** Canlı motor aynı IP'den çalışıyor. Toplu veri çeken her betik istekler arasına
   **en az 650 ms** koymalı, HTTP 429/418'de `retry-after` kadar beklemeli. Sınır aşılırsa Binance IP'yi
   engeller ve canlı botlar da durur. (07.11'de 80 ms ve 350 ms ile sınır aşıldı; 650 ms sorunsuz.)
7. **Visivero'dan veri çekme.** Arşiv yeterli. Siteden toplu çekme denemesi daha önce engellendi; tekrar deneme.
8. **YouTube/harici kaynak.** Kendi başına video ya da kaynak tarama. Yalnızca kullanıcının verdiği
   bağlantıyı incele; videodan çıkan bilgiyle sistemi kendiliğinden değiştirme, önce birlikte karar verilir.
9. **Yanlışını söyle.** Bir iddian yanlış çıkarsa açıkça düzelt (bkz. Takip.md'deki "DÜZELTME" kayıtları).
   Ölçmediğin şeyi ölçmüş gibi yazma; örnek sayısını ve dönemi her zaman belirt.

---

## 3. Kullanıcı ve çalışma biçimi

- **Dil:** Türkçe. Sade anlatım, sonuçlar sayılarla. Kod yorumları ve arayüz metinleri Türkçe
  (eski laboratuvardan gelen `engine/`, `rules/`, `lib/` dosyalarında yorumlar İngilizce; öyle kalabilir).
- **Eleştiri:** Kullanıcı yanıldığında açık ve net söylenmesini istiyor; nezaket için sulandırma.
- **Teknik seçimler** ajana bırakılmış ("ne gerekiyorsa yap"), ama görünür değişiklikler (arayüz düzeni,
  yeni bot, veri silme) önce kısaca anlatılır. Büyük arayüz işlerinde önce taslak/görsel, onaydan sonra kod.
- **Sayfalar kendiliğinden yenilenir.** Kullanıcı elle yenilemek istemiyor (`/api/version` mekanizması, bkz. §9).
- **Takip.md güncel tutulur.** Her anlamlı değişiklik ve bulgu tarihli olarak oraya eklenir.

### Kullanıcının işlem tarzı (analizleri buna göre yap)

Bu bilgiler karne ve test tasarımını belirler:

- Kaldıraç **5x ya da 10x**, genelde **stop kullanmıyor**.
- M1 / M1 Premium sinyallerinde **scalp**: işlem 2–30 dakika sürer, hedef **+%3–8 kâr** (kaldıraçlı, ROE).
  5m/15m/1h/4h/FR tarafında destekleyen bir durum görürse tutar ve **+%20–40** arasında kapatır.
- Sinyali olduğu gibi takip etmez, **yorulmayı oynar**: 🔴 sinyal geldiğinde "short açanlar yoruldu mu"
  diye bakar ve **long** açar; 🟢 sinyalde tersini yapar. Baktıkları: uyumsuzluk (Divergence satırı),
  WaveTrend kesişimi (WT Cross satırı), RSI seviyeleri.
- OI, long/short oranı ve anlık FR'yi kendisi ekrandan takip eder; **M1 analizlerine bunları ekleme** (açıkça istedi).

---

## 4. Mimari

> **11.11.2026 mimari değişikliği (V1.5.0):** aşağıdaki şemada "ASIL KAYIT" olarak görünen JSONL dosyaları artık tampondur;
> asıl kayıt PostgreSQL'dir. Web akışı dosyadan değil `signals` tablosundan okur (saniyede bir, `(src_file, src_line)` sırasıyla;
> gecikme ~2 sn). Veritabanı durursa site akışı durur, motor tampon dosyaya yazmayı sürdürür, veritabanı dönünce yazıcı aradaki
> satırları aktarır (kayıp olmaz). Kasa için `data\kasa.json` kullanılmıyor (arşiv: `data\kasa-arsiv-2026-11-11.json`).

```
                    Binance USDⓈ-M (herkese açık)
          REST fapi.binance.com     WS fstream.binance.com/market/stream
                         │                     │
                         ▼                     ▼
        ┌─────────────────────────────────────────────────┐
        │ MOTOR  engine/live.cjs + engine/market.cjs      │  ~800 MB RAM
        │  • 794 coin, 1 dk mumlar WS'ten, üst dilimler   │
        │    1 dk'dan üretilir                            │
        │  • rules/*.cjs modüllerini her tikte çalıştırır │
        └───────────────┬─────────────────────────────────┘
                        │ ekleme (append)
                        ▼
        data/live/signals-YYYY-MM-DD.jsonl   ← ASIL KAYIT (UTC güne göre dosya)
              │                    │
              │ 1 sn'de bir okur   │ canlı izler
              ▼                    ▼
   ┌────────────────────┐   ┌──────────────────────┐
   │ WEB web/server.cjs │   │ YAZICI db/yazici.cjs │
   │ 127.0.0.1:3200     │   └──────────┬───────────┘
   │ akış: dosyadan     │              ▼
   │ karne/geçmiş: DB   │◄──── PostgreSQL 18.6  127.0.0.1:5433  (db: botlar)
   └────────────────────┘        ▲             ▲
                                 │             │
                  db/mumlar.cjs (5 dk mum)   db/karne.cjs (15 dk'da bir sonuç ölçümü)
```

### Süreçler ve kim başlatır

| Parça | Komut (cwd = `botlar-v1`) | Kim çalıştırır | Not |
|---|---|---|---|
| PostgreSQL | Windows servisi **BotlarPostgres** | Windows (otomatik, NetworkService) | veri `data\pg` |
| Denetçi | `node servis\denetci.cjs` | Görev Zamanlayıcı **"Botlar V1 Denetci"** (açılışta, SYSTEM) | alttaki parçaları başlatır, çökerse yeniden başlatır |
| motor | `node --max-old-space-size=4096 engine/live.cjs` | Denetçi | açılışta ~10–13 dk veri yükler |
| web | `node web/server.cjs` | Denetçi | |
| yazici | `node db/yazici.cjs` | Denetçi | |
| mumlar | `node db/mumlar.cjs` | Denetçi (bkz. uyarı) | 5 dk'lık mumlar |
| karne | `node db/karne.cjs` | Denetçi (bkz. uyarı) | |
| turev | `node db/turev.cjs` | Denetçi (bkz. uyarı) | OI + long/short geçmişi → `oi_5m`, `ls_15m`, `lsp_15m`; 6 saatte bir (Binance yalnız 30 gün tutuyor) |
| telegram | `node telegram/sender.cjs` | **kapalı** | Denetçi listesinde yok |

> **UYARI — geçici durum (10.11.2026):** `mumlar` ve `karne`, `servis\denetci.cjs` içindeki `PARTS` listesinde var ama çalışan
> denetçi 07.11'deki eski listeyle bellekte. Bu iki parça şu an çalıştırıcıdan (`..\parity\runner.cjs`, işler `mm4` ve `kr5`)
> başlatılmış halde çalışıyor. Bilgisayar yeniden başlarsa yeni denetçi hepsini kendisi başlatır. Kalıcı çözüm: kullanıcı
> `servis\servis-kur.bat`'ı bir kez daha çalıştırır. Denetçi SYSTEM hesabında olduğu için kullanıcı düzeyindeki süreç onu kapatamaz.
> Dikkat: çalıştırıcı süreci kapatılırsa başlattığı işler de ölür (10.11'de görüldü).

### Denetçiyi kullanma

- Bir parçayı yeniden başlat: `data\kontrol\<motor|web|yazici|mumlar|karne>.yeniden` adında boş dosya oluştur.
  Denetçi 5 sn içinde dosyayı siler ve parçayı yeniden başlatır.
- Durum: `data\denetci.json` (pid, başlama zamanı, yeniden başlama sayısı).
- Kayıtlar: `data\log\{denetci,motor,web,yazici}.log` (50 MB'ı geçince `.1` olarak döner).
- Gece **03:30 (TR)** `pg_dump -Fc` → `data\yedek\botlar-YYYY-MM-DD.dump`, son 7 gün tutulur.
- `schtasks /query` kullanıcı hesabından "Erişim engellendi" verir; bu beklenen davranıştır.

### Yeniden başlatmanın bedeli

- **Motor:** ~13 dakika sinyal gelmez (794 coin × 7 zaman dilimi REST ile yüklenir). Gereksiz yere yapma.
  **Kural dosyası (`rules\*.cjs`) değişikliği yeniden başlatma gerektirmez**: motor 15 sn'de bir dosya
  değişim zamanına bakıp modülü yeniden yükler (o modülün durumu sıfırlanır, varsa ısınması tekrar koşar).
  `engine\*.cjs` ya da `lib\net.cjs` değişirse yeniden başlatma şarttır.
- **Web:** 1–2 sn. Açık sayfalar kendiliğinden yenilenir.
- **Yazıcı / mumlar / karne:** kaldığı yerden devam eder, çift kayıt oluşmaz.

---

## 5. Klasör haritası

Kök: `C:\projeler\newbot\terminal\` (bu klasör aynı zamanda eski bir projeyi de içerir).

```
terminal\
├─ botlar-v1\                 ← ÜRÜN. Bu rehberin konusu. Geliştirme burada yapılır.
│  ├─ AGENTS.md               bu dosya
│  ├─ VERSION                 tek satır, örn. 1.3.1  (web bunu okur ve başlıkta gösterir)
│  ├─ package.json            tek bağımlılık: pg   (version alanı 1.2.0'da kalmış, VERSION asıl)
│  ├─ start-v1.bat            servis kuruluysa yalnızca siteyi açar; değilse motor + web'i elle başlatır
│  ├─ Yuzde30.xlsx            kullanıcının Kasa şablonu (Kasa ekranı bunun eşdeğeri)
│  ├─ engine\
│  │  ├─ live.cjs             motor ana döngüsü, kural yükleme, sinyal yazma
│  │  └─ market.cjs           Binance verisi: REST ön yükleme + WebSocket, mum serileri
│  ├─ rules\                  bot kuralları (her dosya bir "aile")
│  │  ├─ m1.cjs               m1, m1-premium
│  │  ├─ four-s.cjs           4s, 4sniper, 1dws
│  │  ├─ div.cjs              div
│  │  └─ flow.cjs             fr, v3
│  ├─ lib\
│  │  ├─ ind.cjs              göstergeler (bkz. §7)
│  │  ├─ net.cjs              Binance REST (aralıklı, yeniden denemeli), ROOT = data\
│  │  ├─ pivot.cjs            haftalık Fibonacci pivot
│  │  ├─ schedule.cjs         coin başına tarama gecikmesi
│  │  └─ scan-schedule.json   ölçülmüş gecikme tablosu (50 KB, elle düzenleme)
│  ├─ web\
│  │  ├─ server.cjs           HTTP sunucu + API (çatı yok, yalnızca node:http)
│  │  ├─ terminal.cjs         Terminal sayfasının sunucu tarafı: /api/t/*, tek Binance kuyruğu, önbellek, izleme tablosu (V1.7.0)
│  │  └─ public\index.html    tek dosyalık arayüz (HTML + CSS + JS bir arada, derleme yok)
│  │     public\terminal.html Terminal: izleme listesi + 4 dik canvas mum grafiği (RSI/SRSI/WT) + OI/hacim (tek dosya, dış betik yok)
│  ├─ db\
│  │  ├─ sema.sql             signals, ingest_state, kasa_* tabloları
│  │  ├─ baglanti.json        GİZLİ — {host,port,user,password,database}
│  │  ├─ yazici.cjs           JSONL → signals (sürekli)
│  │  ├─ mumlar.cjs           Binance 5 dk mum → klines_5m (sürekli)
│  │  ├─ mumlar1m.cjs         Binance 1 dk mum → klines_1m (elle, --bir-kez; yavaş)
│  │  ├─ karne.cjs            sinyal sonuç ölçümü → karne_signals (sürekli)
│  │  ├─ scalp.cjs            M1 Premium scalp testi (elle; rapor data\rapor\scalp.json)
│  │  ├─ dogrula.cjs          dosya ↔ tablo satır sayısı karşılaştırması
│  │  ├─ eski-yukle.cjs       eski arşivi yükledi (vv_messages, parity_signals) — bir kez çalıştı
│  │  ├─ hacim-ara.cjs, hacim-agg.cjs   "Volume" satırı araştırması (tamamlandı, referans)
│  │  ├─ sorgu.cjs            salt-okunur SQL çalıştırıcı: node db\sorgu.cjs dosya.sql
│  │  ├─ test-terminal.cjs    web\terminal.cjs testleri (ağsız, veritabanısız): node db\test-terminal.cjs → "hepsi TAMAM"
│  │  ├─ terminal-deneme.cjs  sahte veriyle terminal deneme sunucusu, 127.0.0.1:3299 (Binance'e/veritabanına dokunmaz)
│  │  └─ q1..q6.sql           örnek/eski sorgular
│  ├─ servis\
│  │  ├─ denetci.cjs          süreç denetçisi + gece yedeği
│  │  └─ servis-kur.bat/.ps1  Windows servis/görev kurulumu (yönetici, kullanıcı çalıştırır)
│  ├─ telegram\
│  │  ├─ sender.cjs           M1 Premium ⭐ sinyallerini gönderir (KAPALI)
│  │  └─ ayarlar.json         GİZLİ
│  └─ data\                   git'e girmez
│     ├─ live\                signals-YYYY-MM-DD.jsonl, status.json, state.json
│     ├─ pg\                  PostgreSQL veri klasörü (~3,1 GB)
│     ├─ yedek\               gece dökümleri (~270 MB × 7)
│     ├─ log\, kontrol\, denetci.json
│     ├─ kasa.json (+ .yedek) kullanıcının işlem kaydı
│     ├─ rapor\scalp.json
│     ├─ cache\               net.cjs disk önbelleği
│     └─ arastirma\agg\       indirilmiş aggTrades CSV'leri (~1,5 GB, silinebilir)
│
├─ parity\                    ESKİ LABORATUVAR (Visivero karşılaştırma dönemi). Arşiv + araçlar.
│  ├─ runner.cjs              iş çalıştırıcı (bkz. §12)
│  ├─ tools\                  yardımcı betikler (v1-db, v1-run, push-takip, kill-cmd, video-*…)
│  ├─ rules\hammer.cjs        Hammer denemesi (başarısız, V1'e alınmadı)
│  ├─ research\{m1,div,flow,foursn,hammer,tc}\   araştırma betikleri ve REPORT.md'ler
│  ├─ pine\                   TradingView Pine betikleri (bkz. §11)
│  └─ data\ref\<bot>.jsonl    Visivero orijinal mesaj arşivi (veritabanında da var: vv_messages)
├─ Takip.md                   proje günlüğü
├─ raporlar\                  27–30.10 günlük uyum raporları
├─ video\                     5 eğitim videosunun dökümü + analiz.md (yalnızca bilgi)
└─ (terminal-server.js, public\, bots\, services\ …)   kullanıcının ESKİ terminali, port 3000. Dokunma.
```

Araçlar proje dışında: `C:\projeler\newbot\araclar\` (`pgsql\` PostgreSQL zip kurulumu, `yt-dlp.exe`, whisper.cpp).

Depo: `https://github.com/gurolsarioglu/takip` (dal `master`). Gönderim `..\parity\tools\push-takip.cjs` ile yapılır;
`botlar-v1`, `parity`, `Takip.md`, `raporlar`, `video` kopyalanır, `data`, `node_modules`, ses/video dosyaları ve
sır dosyaları atlanır. Son bilinen gönderim 07.11 öğleden önce; **PostgreSQL, servis, karne ve 1.3.x
değişiklikleri büyük olasılıkla henüz gönderilmedi** — göndermeden önce `git status` ile doğrula ve
kullanıcıya sor.

---

## 6. Motor ayrıntıları

### 6.1 Piyasa verisi (`engine\market.cjs`)

- **Evren:** `exchangeInfo`'dan `status=TRADING`, quote `USDT` ya da `USDC`, `PERPETUAL` olan semboller (~794).
- **Ön yükleme:** her coin için her zaman diliminde REST `klines`. Yüklenen mum sayıları:
  `1m 405 · 5m 405 · 15m 300 · 1h 495 · 4h 650 · 1d 495 · 1w 200` (modül `needs` değeri daha büyükse o, en çok 1000).
  8 eşzamanlı işçi (`BOOT_CONCURRENCY`).
- **Canlı akış:** `wss://fstream.binance.com/market/stream?streams=` — **eski `/stream` ve `/ws` yolları veri
  göndermiyor**, yalnızca `/market/stream` çalışıyor. 200 coinlik gruplar halinde `<sym>@kline_1m`,
  ayrıca `!markPrice@arr@1s` (funding) ve `!ticker@arr` (24 saatlik hacim).
- **Üst zaman dilimleri 1 dk mumlardan üretilir** (`Series.pushMinute`). Ayrı WS aboneliği yoktur.
- **Kopma bekçisi:** bir soket 45 sn mesaj almazsa zorla kapatılır; yeniden açılınca kaçan 1 dk mumlar
  REST ile doldurulur (`gapfill`). Logda sık görülen `ws closed, reconnecting … code 1006` olağandır.
- **Canlı mum kuralı:** `market.bars(st, tf)` her zaman *kapanmış mumlar + sonda canlı mum* döndürür;
  canlı mumun `close` değeri o anki fiyattır ve `isLive: true` taşır. 1 dk mum kapandığı anda bir sonraki
  dakika için sentetik bir canlı mum oluşturulur, yani "son eleman = canlı mum" her zaman doğrudur.

Mum nesnesi: `{ openTime, open, high, low, close, volume, quoteVolume, closeTime, takerBuyBase?, trades?, isLive? }`
(`volume` coin adedi, `quoteVolume` USDT). Zamanlar milisaniye, UTC.

### 6.2 Kural modülü arayüzü (yeni bot böyle yazılır)

`rules\<aile>.cjs`:

```js
module.exports = {
  family: 'ornek',                 // benzersiz aile adı (durum anahtarı: family|symbol)
  bots: ['ornek-bot'],             // ürettiği botId'ler
  needs: { '1m': 400, '1h': 300 }, // zaman dilimi → gereken mum sayısı
  extras: [],                      // 'funding' | 'ticker24h' | 'ratios' | 'oi'
  cadenceMs: 1000,                 // aynı coin için iki değerlendirme arası en az süre (tik olayında)
  // minuteSweep: true,            // her dakika başı +1,5 sn'de TÜM coinler için çağrılır (işlem olmasa da)
  // warmup: { stepMs, steps, offsetMs },  // açılışta geçmiş taramaları sinyalsiz yeniden oynat
  // ratiosPeriod: '5m',
  evaluate(ctx) { return []; }     // saf ve hızlı olmalı; ağ çağrısı YAPMAZ
};
```

`ctx` alanları:

| Alan | İçerik |
|---|---|
| `symbol`, `t` | coin; değerlendirme anı (ms, duvar saati) |
| `event`, `eventTime` | `'tick'` \| `'close'` (1 dk mum kapandı) \| `'warmup'`; Binance olay zamanı |
| `price`, `priceStr` | son fiyat (sayı ve Binance'in gönderdiği metin) |
| `bars[tf]` | tembel erişim; kapanmış mumlar + canlı mum (son eleman). `'1m','5m','15m','1h','4h','1d','1w'` |
| `funding` | `{ rate, nextFundingTime, markPrice, indexPrice, t, intervalHours }` ya da `null` (`rate` kesir, % için ×100) |
| `ticker24h` | `{ volume, quoteVolume, changePct, last, t }` ya da `null` |
| `ratios` | `{ topLongAccount, globalLongAccount, t }` ya da `null` (yalnız `extras` içinde `'ratios'` varsa doldurulur) |
| `oi`, `oiSeries` | `{ oi, t, chg1h, chg4h, chg24h }` (yüzde değişim; yoksa alan `null`) ve `[{t, oi}]` — yalnız `extras` içinde `'oi'` varsa. Motor OI'yi her zaman toplar: açılışta 25 sa geri doldurma (`openInterestHist`, 700 ms aralık, ~10 dk), sonra 5 dk'da bir tam tur (`/fapi/v1/openInterest`). Durum: `status.json` → `oi` |
| `info` | `exchangeInfo` sembol kaydı |
| `btc` | `{ price, bars }` — BTCUSDT için aynı yapı |
| `state` | bu aile + coin için kalıcı nesne; soğuma, "bu döngüde verdim" gibi bilgiler burada tutulur |

`evaluate` dönüşü, sinyal nesneleri dizisi:

```js
{ botId, symbol, direction: 'up'|'down'|null, strategy: string|null,
  boostPct, price, prevPrice, rsi: {tf: n}, srsi: {tf: n}, fields: {...}, text: 'çok satırlı mesaj' }
```

Motor her sinyale `seenAt` (ISO), `t` (ms), `eventTime`, `module` (aile) ekleyip günün JSONL dosyasına yazar.
`text` Telegram HTML biçimindedir (`<b>…</b>` içerebilir); arayüz bunu `fmtText` ile işler.

Motor davranışları:

- **Durum:** `state` 5 dakikada bir `data\live\state.json`'a yazılır; yeniden başlatmada 12 saatten yeniyse ve
  modülün `warmup`'ı yoksa geri yüklenir. `warmup`'ı olan modülde durum yeniden oynatmayla kurulur
  (örnek: DIV son 96 saatlik taramayı sinyalsiz oynatır; böylece açılışta sinyal patlaması olmaz).
- **Hata:** `evaluate` içindeki istisna yutulur, `status.json`'daki `errors` artar, ilk 20 hata loga yazılır.
  10.11 itibarıyla `errors: 0`.
- **Durum dosyası:** `data\live\status.json` 10 sn'de bir yazılır (`at`, `readyAt`, `symbols`, `ticks`, `evals`,
  `errors`, bot başına sinyal sayısı, bellek). Web "motor çalışıyor" bilgisini buradan okur (`at` 60 sn'den yeniyse).
- **Oranlar:** `ratios` isteyen modül varsa motor bütün coinleri sırayla dolaşıp iki REST çağrısı yapar
  (`topLongShortAccountRatio`, `globalLongShortAccountRatio`); coinler arası 600 ms, tam tur ~13 dk (değer o kadar bayat olabilir).
  `/futures/data/*` uçlarının IP sınırı (1.000 istek / 5 dk) oran döngüsü, OI geri doldurma ve `db\turev.cjs` arasında ortaktır.

### 6.3 Yeni bot ekleme adımları

1. `rules\yeni.cjs` yaz (yukarıdaki arayüz). Dosyayı kaydettiğin anda motor 15 sn içinde yükler; logda
   `module yeni.cjs …` satırını gör.
2. `web\server.cjs` içindeki `BOTS` dizisine `{ id, gap, name, desc }` ekle (`gap` = aynı coin/yön/strateji
   tekrarlarının tek kartta birleşeceği süre). **Bu yapılmazsa sinyal dosyaya yazılır ama sitede görünmez.**
3. `db\karne.cjs` içindeki `GAP` ifadesine tekrar ayıklama süresini ekle (varsayılan 15 dk).
4. Web'i yeniden başlat (`data\kontrol\web.yeniden`). Yazıcıya dokunmaya gerek yok, yeni `botId` kendiliğinden girer.
5. `VERSION`'ı artır, `Takip.md`'ye not düş.

---

## 7. Botların kuralları

Ortak ilkeler: göstergeler **kapanmış mumlar + o anki fiyattaki canlı mum** üzerinde hesaplanır. Normal mum
(Heikin Ashi denendi, uymadı). RSI = Wilder RSI(14). "SRSI" = Stoch RSI K = SMA3(stoch(RSI14, 14)).
Yazdırılan değerler `Math.round` ile tam sayıya yuvarlanır.

Uyum oranları Visivero ile son karşılaştırmadandır (30.10): yakalama = onların sinyalinden bizde de olan,
isabet = bizim sinyalimizden onlarda da olan.

### 7.1 M1 (`m1`) ve M1 Premium (`m1-premium`) — `rules\m1.cjs`

- **Tetik:** `|fiyat / canlı 1 dk mumun açılışı − 1| > %1,00`. Yön: artış `up` 🟢, düşüş `down` 🔴.
- **Tekrar:** M1 koşul sürdükçe coin başına ≥1 sn arayla, Premium ≥10 sn arayla yeniden yazar.
  Bu yüzden ham kayıt çok büyüktür (M1 günde ~100 bin satır); "sinyal sayısı" için her zaman tekrarsız say.
- **Previous Price:** son kapanmış 1 dk mumun kapanışı. **Boost/Drop Value:** tetikteki yüzde.
- **Volume (M1):** `işaret × canlı 1 dk mumun o ana kadarki hacmi / önceki 60 kapanmış 1 dk mumun toplam hacmi × 100`.
  İşaret sinyal yönünden gelir. Anlamı: "bu dakikada, son 1 saatin hacminin yüzde kaçı işlem gördü"
  (%1,7 civarı sıradan bir dakika). 28.754 mesajda doğrulandı: korelasyon 0,96, ±0,5 puan içinde %90.
- **M1 satırları:** RSI (1m; ≤30 ya da ≥70 ise ⚠️), Stochastic (K/D) = Stoch RSI K/D (ikisi de ≤20 ya da ≥80 ise ⚠️),
  `BTC Status: Normal | Volatilite ⚡️` (`lib\btc.cjs`: BTCUSDT'nin son 10 adet 1 dk mumunda, canlı dahil, aralık ≥ %0,5 → Volatilite;
  Visivero etiketinin %99'unu yakalar, yanlış alarm %3,4).
- **Premium satırları:** RSI ve SRSI 1m | 5m | 1h (RSI uçta ❗️: ≤30/≥70; SRSI: ≤10/≥90).
  - **⭐:** canlı 1 dk mumun sinyal yönündeki uzaması (açılış→en yüksek/en düşük) ≥ %1,7.
  - **`Divergence: 1m✅ 5m✅ 1h✅`:** sinyalin **tersi** yönde RSI uyumsuzluğu (🟢 sinyalde tepe uyumsuzluğu).
    Yani bir onay değil, **yorulma uyarısıdır**. Çapa dedektörü (§7.5) ile: 1m N=80 high/low, canlı mumda;
    5m N=30 kapanış, canlı ya da son kapanan mumda; 1h N=50 high/low.
  - **`WT Cross: 1m🟢 5m🔴 1h🔴`:** sinyalin **tersi** yönde, aşırı bölgede yakın zamanlı WaveTrend kesişimi;
    renk kesişimin yönüdür. 1m WT(10,21,4) kapanan mumlar, son 2 mum, |wt2| ≥ 53 · 5m WT(10,21,4) canlı dahil,
    son 4 mum, ≥ 60 · 1h WT(9,12,3) kapanan, son 5 mum, ≥ 53.
  - `FR: x ⚠️` (tahmini funding ≤ −%0,20 ise), `Coin Status: New ⚠️` (1h mumu 16'dan azsa).
- **Uyum:** yakalama %96, isabet %77–97 (aşağıdaki patlama saatine göre).
- **Bilinen fark:** 03:00 TR civarında bizim motor Visivero'nun ~2 katı sinyal üretiyor (2.640'a karşı 1.183).

### 7.2 4S (`4s`) — `rules\four-s.cjs`

- 4 saatlik döngü başına (UTC 00/04/08/12/16/20) coin başına **bir kez**, döngünün ilk 30 dakikasında,
  coinler alfabetik sırayla ve `lib\scan-schedule.json`'daki gecikmeyle değerlendirilir.
- **Kural:** canlı 4h WaveTrend(10,21,4) kesişimi **ve** WT1 ±55 ötesinde (yukarı kesişim & WT1 ≤ −55 → 🟢;
  aşağı kesişim & WT1 ≥ 55 → 🔴). Soğuma yok; koşul sürerse sonraki döngüde yine verir.
- Mesaj: Boost (4h'te son 5 mumun en büyük itkisi), Previous Price (son kapanan **1h** kapanışı),
  RSI/SRSI 1h|4h|1d, Trader Positioning, Market Exposure (oranlardan).
- **Uyum:** %95 / %97.

### 7.3 4S Sniper (`4sniper`) — aynı dosya, aynı döngü

Stratejiler (`strategy` alanı):

- **`NW UP` / `NW DOWN`:** Nadaraya-Watson zarfı (h=8, çarpan 3, son 500 değer, yeniden boyanan sürüm);
  fiyat alt bandın altında → 🟢, üst bandın üstünde → 🔴.
- **`4H RSI SMA CROSSED`:** canlı mumda RSI(14), SMA14(RSI)'yi keser; önceki kapanan mumun RSI'si ≤30 (🟢) / ≥70 (🔴).
- **`4H RSI DIVERGENCE`:** çapa dedektörü N=80, pivR=5; ek kapılar: çapa RSI ≤22, uzaklık ≤20 mum,
  kapanan mum RSI ≤40, canlı RSI ≤40 (🔴 için: çapa ≥78, kapanan ≥60, canlı ≥57). Çapa başına tek sinyal.
- **Uyum:** %91 / %96.

### 7.4 1DWS (`1dws`) — aynı dosya

- 12 saatlik döngü (UTC 00/12), coin başına bir kez. `NW UP/DOWN` (1d, son 200 değer) ve `1D RSI SMA CROSSED`.
- `1D RSI DIVERGENCE` **kapalı** (aynı dedektör yalnız %36 yakalıyordu).
- Mesajdaki RSI/SRSI satırında `1h | 1d | 1d` yazması Visivero'nun kendi tuhaflığıdır, bilerek korunmuştur.
- **Uyum:** %75 / %95.

### 7.5 DIV (`div`) — `rules\div.cjs`

- Saat başı taraması: her saatin ilk 15 dakikasında, coin başına bir kez, alfabetik gecikmeyle.
- **Çapa uyumsuzluk dedektörü** (projede üç yerde kullanılan ortak yöntem; `anchorDivergence`):
  1. Son kapanan mum `i`. `[i−N, i−minDist]` aralığında RSI'si en düşük (🟢) / en yüksek (🔴) mum = **çapa** `j`.
  2. Çapa RSI ≤ 30 (🔴 için ≥ 70) ve ±pivR mumda yerel uç olmalı.
  3. Fiyat çapayı aşmış (`low[i] < low[j]`), RSI aşmamış (`rsi[i] > rsi[j]`) olmalı.
  4. Arada `i`'den daha uç bir fiyat olmamalı.
- Parametreler: N=80, minDist=2, pivR=5, canlı RSI kapısı 🟢 ≤40 / 🔴 ≥57, 3 mum soğuma, aynı çapa tekrar etmez.
- Strateji adı `1H RSI DIVERGENCE`. Haftalık Fibonacci pivota uzaklık < %1 ise `Pivot: %x ⚠️` satırı eklenir.
- `1H/4H RSI SMA CROSSED` ve `4H` taraması kodda var ama **kapalı** (`ENABLE = { smaCross:false, tf4h:false }`):
  canlıda 29 sinyalin 0'ı eşleşmişti.
- Açılışta son 96 saat yeniden oynatılır (`warmup`). **Uyum:** %87 / %78.

### 7.6 FR (`fr`) — `rules\flow.cjs`

Her dakikanın ilk değerlendirmesinde tahmini funding örneklenir (`minuteSweep`).

- **Değişim mesajı** (funding negatifken, bir önceki dakikaya göre):
  - daha negatif, fark ≥ 0,009 puan → 🟢 `FR deeper`
  - daha az negatif, fark ≥ 0,009 puan → 🔴 `FR easing`
  - tam 0'dan negatife → 🟢 `Funding changed from + to -`
- **Dönemsel tarama** (`strategy: 'FR scan'`, `direction: null`, simgesiz): ~10 dakikada bir, funding ≤ −%0,20 olan
  her coin için bir satır. Karne bu yönsüz satırları saymaz.
- "Time Remaining" Visivero gibi :00.55 anına göre yazılır. **Uyum:** %93 / %85.
- **Bağlam satırları (11.11.2026, V1.4.2; kendi eklememiz, hangi mesajın geldiğini değiştirmez):**
  `Seri: N. 🟢 · X dk · toplam Δ` (art arda yeşiller; arada 🔴 yok, iki yeşil arası ≤ 6 dk) · `24s: ±x%` ve günün ilk 10 yükseleninde `🔝` ·
  uyarılar: funding ödemesine < 30 dk, coin 24 saatte ≤ −%10, funding ≤ −1 · 🔴 mesajında `Seri bitti`.
  Ayrı mesaj **`⏸ FR serisi durdu`** (`strategy: 'FR seri durdu'`, yönsüz): 3+ yeşillik seri 10 dk yeni yeşil almadığında.
  Dayanak: `db\fr-seri.cjs` ölçümü (`..\video\analiz.md`, Video 7): "merdiven = long" tek başına tutmuyor; bağlam belirleyici.
- **OI / long-short bağlamı ve "⭐ FR Kurulum" (11.11.2026, V1.6.0; görev `GOREV-FR-OI.md`, ölçüm `db\fr-oi.cjs`):**
  her 🟢 mesajına `OI: 4sa · 24sa`, `Fiyat: 4sa · 24sa`, `Long: kalabalık · büyükler`, `Hacim: N×` ve `Kurulum: p/b` satırları;
  🔴 ve ⏸ mesajlarına yalnız OI ve Long. Kurulum = 6 koşuldan sağlananlar (`KURULUM`: fiyat 4sa ≤ −%2,5 · OI 4sa ≤ +%3 ·
  kalabalık long ≥ %65 · hacim 1sa ≥ 3× · fiyat 24sa ≤ +%4 · funding ≥ −0,20); kaçın işaretleri (`KACIN`: OI 4sa ≥ +%3,3 ·
  fiyat 24sa ≥ +%4 · funding ≤ −0,20 · kalabalık long ≤ %55), 2+ ise `⚠️ Kaçın:` yazılır.
  **`⭐ FR Kurulum`** (`strategy: 'FR Kurulum'`, `direction: 'up'`, `fields.tetik` A/B): yakalamanın (önceki 🟢'den ≥ 12 sa sonra gelen 🟢)
  ilk yeşilinde (A) ya da yakalama içinde funding ilk kez ≤ −0,10 olduğunda (B), puan ≥ 5, ≥ 4 özellik biliniyorsa ve ≤ 1 işaret varsa.
  30 günlük ölçüm: B → n=76 (51 coin, ~2,7/gün) hedef %57 / tasfiye %13 / ort +43 ROE; A → n=155 (~5,4/gün) %25 / %12 / +23
  (long 10x stopsuz 48 sa, hedef +%10). Eşikler tüm veriye bakılarak seçildi; canlı Karne ile izlenmeli. Puan fonksiyonu dışa açık:
  `require('rules/flow.cjs').kurulumPuan(f)`; `db\fr-oi.cjs` aynı fonksiyonla kabul denetimini yapar.
  Kural yeni yüklendiğinde coin geçmişi bilinmiyorsa (≤ 12 sa) yalnız funding > −0,05 olan yeşil yeni yakalama sayılır.

### 7.7 V3 (`v3`) — aynı dosya

- Yeni kapanan 1 dk mumun hacmi / (24 saatlik hacim − o mum) ≥ **%8** → sinyal. `direction: null` (yönsüz), `strategy: 'V3-A'`.
- Karne yönsüz olduğu için "long" varsayar; sonucu bu gözle oku.

### 7.8 Hammer (`hammer`) — `rules\hammer.cjs` (10.11.2026, V1.4.0)

Kendi sürümümüz; Visivero Hammer Pro'nun `#W1` stratejisi üzerine kurulu. **Yön tahmini değil, hareket uyarısıdır.**

- Yeni kapanan 1 dk mumda WaveTrend(10,21,4) kesişimi; yukarı kesişim ve wt2 ≤ −57 → 🟢, aşağı kesişim ve wt2 ≥ 57 → 🔴.
- Son 5 kapanmış mumda itki (Boost) ≥ %1 ve bu mumlardan birinin ucundaki RSI(14) ≤ 26,5 (🔴 için ≥ 73,5).
- Son 24 saatin aralığı ≤ %15, haftalık Fibonacci pivota uzaklık ≤ %9.
- Aynı coinde son sinyal aynı yöndeyse 24 saat tekrar etmez. Yıldız: Boost ≥2 ⭐, ≥3 ⭐⭐, ≥5 ⭐⭐⭐.
- Test (`db\hammer-w1.cjs`, `db\hammer-w1-izgara.cjs`; 20–30.10.2026, 746 coin, ayar/sınama ayrımıyla): Visivero `#W1` olaylarının
  %73'ünü ±3 dk içinde yakalar, ~265 sinyal/gün; sinyalden sonraki 1 saatte lehte ≥%1 hareket %66–70, 1 sa kazanan %56–60.
- Visivero ile sinyal *sayısı* eşleştirilemez: onların sayısı gizli iç durumla (yön nöbeti, yeniden başlatma seli) belirleniyor.
- Orijinal Hammer ailesinin 6 haftalık değeri (`db\karne-vv.cjs`, 33 bin sinyal): güçlü hareket uyarısı, zayıf yön sinyali.
  `#S1`'in çoğu (yıldızsız) değersiz; `#S1/#R1` kuralı çözülemedi (deneme kodu `..\parity\rules\hammer.cjs`,
  bilinenler `Takip.md` §6, §9, §15). **Reddedilenleri tekrar deneme.** DIV'in orijinali de ölçülebilir değer göstermedi.

### 7.9 Göstergeler — `lib\ind.cjs`

`sma, ema(src,n,seed='sma'|'first'), rma, rsi(closes,14), stochRsi(closes,14,14,3,3) → {rsi,k,d,raw},
stoch, waveTrend(bars,n1,n2,sig,seed) → {wt1,wt2}, crossAt(a,b,i) → 1|-1|0, nwRepaint(values,h,mult,win) → {upper,lower,…},
traditionalPivots, fibPivots, weeklyFibPivotDistPct, nearestPivotDistPct, pivotLows, pivotHighs, isNum, round`.
Hepsi diziyle çalışır, eksik değer `NaN`'dır. Pine Script davranışıyla eşleşecek şekilde doğrulanmıştır;
**başlangıç tohumu (seed) ve yuvarlama ayrıntılarını değiştirme**, uyum bozulur.

---

## 8. Veritabanı

PostgreSQL **18.6**, `127.0.0.1:5433`, veritabanı ve kullanıcı `botlar`. Node tarafında `pg` paketi; bağlantı:

```js
const { Pool } = require('pg');
const pool = new Pool({ ...JSON.parse(fs.readFileSync(path.join(__dirname, 'baglanti.json'), 'utf8')), max: 2 });
```

Komut satırı araçları: `C:\projeler\newbot\araclar\pgsql\bin\{psql,pg_dump,pg_restore}.exe`.
Hızlı sorgu: SQL'i bir dosyaya yaz, `node db\sorgu.cjs dosya.sql` (salt-okunur oturum, sonuç tablo olarak basılır).

### Tablolar (10.11.2026)

| Tablo | Satır | Boyut | Kim yazar | Anahtar |
|---|---|---|---|---|
| `signals` | 1.430.350 | 820 MB | yazici | `(src_file, src_line)` |
| `klines_1m` | 8.051.342 | 973 MB | mumlar1m (elle) | `(symbol, t)` |
| `klines_5m` | 4.086.463 | 513 MB | mumlar | `(symbol, t)` |
| `parity_signals` | 705.124 | 387 MB | arşiv (sabit) | `(src_file, src_line)` |
| `vv_messages` | 656.882 | 291 MB | arşiv (sabit) | `id` |
| `karne_signals` | 47.393 | 13 MB | karne | `(bot, symbol, t)` |
| `karne_state`, `ingest_state` | — | — | karne, yazici | |
| `kasa_periods`, `kasa_trades` | 1 / 0 | — | web (yansıma) | `id` |

Toplam **3,0 GB**. Büyüme: `signals` günde ~110 bin satır (çoğu M1 tekrarı).

```sql
signals (src_file text, src_line int, t timestamptz, bot text, symbol text, dir text /*up|down|null*/,
         strategy text, price float8, prev_price float8, boost_pct float8, module text,
         rsi jsonb, srsi jsonb, fields jsonb, text text, event_time timestamptz, seen_at timestamptz)
  -- dizinler: (bot,t) (symbol,t) (t)

klines_5m / klines_1m (symbol text, t timestamptz /*mum açılışı*/, o, h, l, c, qv /*USDT hacim*/ float8)
  -- klines_5m: sinyal görülen bütün coinler, 24.10.2026'dan beri, her 5 dk güncel
  -- klines_1m: M1 sinyali görülen 705 coin, 30.10 19:00 – 07.11 17:56 UTC. SÜREKLİ GÜNCELLENMİYOR.

karne_signals (bot, symbol, dir, strategy, t, price,
               star bool, div1 bool, div5 bool, div1h bool, wt bool, reps int,
               r15, r60, r240 float8,    -- sinyal YÖNÜNDE % getiri: ~15 dk / 1 sa / 4 sa sonra
               mfe60, mae60 float8)      -- ilk 1 saatte en iyi / en kötü nokta (%)

vv_messages (id text, bot text, symbol text, created_at timestamptz, message text, exchange, market_type, src_file)
  -- Visivero'nun orijinal mesajları, 12 bot, 09.07–30.10.2026 (M1 ailesi 14.10'dan itibaren)
parity_signals  -- signals ile aynı şema; eski motorun 25–31.10 sinyalleri (Hammer denemeleri dahil)
```

### Önemli ayrıntılar

- **JSONL asıl, veritabanı türev.** Yazıcı `(dosya, satır no)` anahtarıyla ekler; ne kadar yeniden çalışırsa
  çalışsın çift kayıt olmaz. Tablo bozulursa dosyalardan yeniden kurulabilir (`ingest_state`'i sıfırla).
- **Tekrarsız sinyal ("epizot").** Ham `signals` üzerinde sayım yapma. Aynı bot + coin + yön + strateji
  belirli bir süreden kısa aralıkla tekrar ederse ilk kayıt sayılır. İki ayrı eşik vardır:
  - Arayüz kartları (`web\server.cjs` `BOTS[].gap`): m1 ve m1-premium 60 sn · v3 2 dk · fr 30 dk · 4s, 4sniper, div 1 sa · 1dws 6 sa.
  - Karne (`db\karne.cjs` `GAP`): m1, m1-premium, v3 15 dk · fr 1 sa · div, 4s, 4sniper 4 sa · 1dws 24 sa.
- **Karne nasıl ölçer:** giriş = sinyal fiyatı; çıkış = 5 dk'lık mum kapanışı. Son 4 saat 10 dakikanın sinyalleri
  henüz ölçülmez. Komisyon ve kayma dahil değildir. `fr`'nin yönsüz satırları hariçtir; `v3` long sayılır.
  M1 Premium bayrakları (`star`, `div1`, `div5`, `div1h`, `wt`) mesaj metninden çıkarılır.
- **Saat dilimi:** veritabanı ve dosyalar UTC. Arayüz ve loglar `Europe/Istanbul` (UTC+3) gösterir.
  Sinyal dosyaları **UTC güne** göre bölünür.

---

## 9. Web uygulaması

`web\server.cjs`: yalnızca `node:http`, çatı yok. `127.0.0.1:3200` (`PORT`, `HOST` ortam değişkenleri).
`web\public\index.html`: tek dosya, derleme adımı yok; düz JS, `$ = document.querySelector`.

### Akışın kaynağı

Sunucu son 3 günün JSONL dosyalarını saniyede bir okur (kuyruktan), son **48 saati** bellekte tutar
(bot başına en çok 5.000 kart) ve tekrarları kartlarda birleştirir. Akış bilerek dosyadan okunur:
veritabanı dursa da site sinyal göstermeye devam eder. Karne ve 7 günlük geçmiş veritabanından gelir.

### API

| Yol | Açıklama |
|---|---|
| `GET /api/version` | `{version, stamp}`. `stamp` = sunucu açılış zamanı + `public\` dosyalarının en yeni değişim zamanı. Sayfa bunu yoklar, değişince kendini yeniler. |
| `GET /api/status` | motor durumu (`status.json` özeti) |
| `GET /api/bots` | bot listesi + son 24 saat / 1 saat kart sayısı |
| `GET /api/messages?bot&q&sym&dir&after&limit` | kartlar: `{maxSeq, items:[{bot,id,seq,t,first,n,symbol,dir,strategy,text,price}]}`. `after=seq` ile yalnız yeniler. |
| `GET /api/klines?symbol&interval&limit` | Binance mum vekili (1m/5m/15m/1h/4h, en çok 500), 15 sn önbellek |
| `GET /api/karne?days=1..30` | bot / bot+yön / M1 Premium bayrakları / strateji kırılımları, 60 sn önbellek |
| `GET /api/coinhist?symbol&days=1..14` | o coinin tekrarsız sinyalleri + 1 sa ve 4 sa sonuçları |
| `GET /api/kasa?period=` | Kasa görünümü (hesaplanmış satırlar, özet, raporlar) |
| `POST /api/kasa` | `{action: settings|add|update|delete|newPeriod, …}` |

Karne satırı alanları: `n` (sinyal), `o15/o60/o240` (ortalama %), `k60/k240` (kazanan %), `m60` (medyan),
`mfe/mae`, `tp1/sl1` (ilk 1 saatte +%1 / −%1'e değenlerin %'si).

### Terminal (`/terminal.html`, V1.7.0; görev `GOREV-TERMINAL.md`)

Yalnız veri gösterir. Solda izleme listesi (veritabanı), ortada **yan yana 4 dik mum grafiği** (V1.7.1; her birinin altında RSI(14)+SMA14, Stokastik RSI K/D ve WaveTrend(10,21,4) kesişim noktaları — hesap `lib\ind.cjs` ile birebir, `terminal.html` içindeki `TA`; `RSI · SRSI · WT` kutusuyla kapanır). **TC katmanları (V1.8.0, `TC göstergeleri ▾` menüsü, her biri ayrı açılır/kapanır; formüller §11):** Buy/Sell (Range Filter ohlc4, 50, çarpan 2,2), TP/SL çizgileri (son Buy/Sell; SL %1, TP %1/2/3), Mild X, uyumsuzluk ▲▼, Ribbon, Reversal Bands, S/R bölgeleri (`tc_sr_v1.pine` kuralı, grafiğin kendi diliminde). Varsayılan açık: Buy/Sell, Mild X, uyumsuzluk, S/R. Seçim `localStorage` `v1.t.tc`. **V1.9.0:** alt paneller menüsü (`Alt paneller ▾`, `v1.t.panes`): RSI, SRSI, WT + **Market Exposure** (tüm hesaplar long %, `globalLongShortAccountRatio`), **Funding Rate** (ödeme başına %, canlı mumda tahmini), **Open Interest** (USD), **Trader Positioning** (büyük hesaplar long %, `topLongShortAccountRatio`) — tanımlar `rules\four-s.cjs` ile aynı. Kaynak `GET /api/t/turev?symbol&tf&from`: geçmiş veritabanından (`ls_15m`, `lsp_15m`, `oi_5m`; kova başına son değer), veritabanının bittiği yerden bugüne Binance (3 oran ucu 15m×96 + `openInterestHist` 5m×500, 5 dk önbellek → coin başına 5 dk'da 4 `/futures/data` isteği; motor bu uçların payının çoğunu kullandığı için bilerek az) + `/fapi/v1/fundingRate` 1.000 olay (10 dk). Grafik alt panelleri mumun kapanışından önceki son değeri gösterir (ileriye bakma yok). **İzleme listesi:** `Tümü` = motorun evreni (`GET /api/t/evren` ← `exchangeInfo`, 5 dk; PERPETUAL, USDT|USDC, TRADING), `Listem` = `izleme` tablosu (☆ ile eklenir); yeni coin kendiliğinden gelir, kaldırılan düşer. **Delist:** Binance duyurudan sonra `deliveryDate`'i kapanış zamanına çeker → satırda kırmızı ad + ⚠ (ipucunda tarih), üstte `⚠ N delist` süzgeci, özet panelinde tarihli satır; listede olup artık Binance'te olmayan coin `KALKTI`; son 7 günde listelenen `YENİ`. **Piyasa özeti** (listenin altı): fiyat, funding + aralık + geri sayım, OI (1 sa değişimi), emir defteri B/S (`GET /api/t/ozet` ← `/fapi/v1/depth` 100 kademe, 15 sn), Long/short poz. (`topLongShortPositionRatio`), Trader positioning, Market exposure, 24s hacim. Piyasa değeri (market cap) gösterilmez: Binance vadeli API'sinde yok (her biri kendi dilimi: `5m 15m 1h 4h 1d 1w 1M`;
**Kısa** = 5m/15m/1h/4h, **Uzun** = 4h/1d/1w/1M), altta OI + hacim paneli (`5m 15m 1h 4h 1d`; Binance OI geçmişi yalnız 30 gün).
Grafikler kendi canvas kodumuz (`Chart` sınıfı, `terminal.html` içinde): tekerlek yakınlaştırır, sürükleme kaydırır (sola gidince eski mumlar
`end` ile istenir), çift tık sıfırlar, başlığa çift tık büyütür; artı imleci diğer grafiklerde dikey çizgiyle görünür; son 48 saatin bot
sinyalleri üçgenle (M1/M1 Premium varsayılan kapalı). Ayarlar `localStorage` `v1.t.*`. `index.html` başlığında `📈 Terminal`, coin panelinde
`Terminalde aç` (`/terminal.html?s=SEMBOL`). Sunucu tarafı `web\terminal.cjs`; `server.cjs` yalnız `/api/t/` ile başlayan yolu ona verir.

| Yol | Binance kaynağı | Dönen | Önbellek |
|---|---|---|---|
| `GET /api/t/klines?symbol&interval&limit=1..1000(500)&end` | `/fapi/v1/klines` (`end` → `endTime`) | `[[t,o,h,l,c,qv]]` | 4 sn; `end` ile 5 dk |
| `GET /api/t/oi?symbol&period&limit=1..500(500)` | `/futures/data/openInterestHist` | `[[t, adet, usd]]` eskiden yeniye | 60 sn |
| `GET /api/t/coin?symbol` | `/fapi/v1/openInterest` + `/fapi/v1/premiumIndex` | `{oi, oiUsd, mark, funding (%), nextFunding}` | 10 sn |
| `GET /api/t/tickers` | `/fapi/v1/ticker/24hr` (hepsi, ağırlık 40) | `{at, rows: {SEMBOL: [last, chgPct, quoteVol]}}` yalnız `…USDT` | 20 sn |
| `GET /api/t/izleme` · `POST /api/t/izleme {action: ekle|sil, symbol}` | — | `["BTCUSDT", …]` sırayla | — |

Kurallar (motorla aynı IP; pazarlık konusu değil): bütün Binance istekleri **tek sıralı kuyrukta**; istek başlangıçları arası ≥150 ms,
`/futures/data/*` arası ≥700 ms; aynı anahtar uçuştaysa ona bağlanılır; `x-mbx-used-weight-1m` > 1.500 → kuyruk dakika sonuna kadar bekler;
429 → `retry-after` (yoksa 30) + 5 sn, 418 → `retry-after` (yoksa 120) sn boyunca hiç istek yok, bekleyenlere ve yenilere 503 + `retryAfter`,
**yeniden deneme yok**; bekleyen 40'ı aşarsa 503; zaman aşımı 10 sn; önbellek en çok 400 kayıt. Binance hatası 502, geçersiz girdi 400.
İstemci: coin seçilince 4 × klines(500) + oi (+ aynı dönem klines, hacim için) + coin + sinyaller; sonra grafik başına `klines?limit=3` 5 sn,
`coin` 10 sn, `tickers` 20 sn, `oi` 60 sn. Sekme gizliyken yoklama yok; 503 `retryAfter` gelirse o süre Binance yoklaması durur, başlıkta sarı uyarı.
Tahmini ağırlık (tek sekme): ~185/dk, çoğu `ticker/24hr` (120/dk).

Tablo `izleme (symbol text PRIMARY KEY, sira serial, eklendi timestamptz)`: `terminal.cjs` ilk kullanımda kurar; tablo yeni kurulduysa
BTCUSDT + ETHUSDT eklenir. `ekle` yalnız ticker listesindeki USDT sembolünü kabul eder, en çok 100; `sil` tek satırlık parametreli `DELETE`.
Veritabanı yoksa izleme uçları 503, sayfa grafikleri yine gösterir. Test: `node db\test-terminal.cjs`; elle deneme: `node db\terminal-deneme.cjs`
→ `http://127.0.0.1:3299/terminal.html` (`/deneme/429?sn=10` sınır uyarısını, `DENEME_DB=yok` veritabanı yokluğunu dener).

### Arayüz özellikleri

- Solda bot listesi, ortada kart akışı; coin arama ve yön süzgeci; yeni kart sesi.
- Kart: bot rozeti, coin, tekrar sayısı (×N), zaman, mesaj metni, **"📥 İşleme girdim"** (Kasa formunu
  coin/saat/bot/yön ile hazır doldurur) ve **"TradingView ↗"** (`BINANCE:<SYMBOL>.P`).
- **Coin paneli** (coin adına tıkla): SVG mum grafiği (1m/5m/15m/1h/4h), üzerinde bütün botların sinyal
  işaretleri (▲ yeşil, ▼ kırmızı, sarı yönsüz), son 48 saatin sinyal listesi, altında son 7 günün sinyalleri ve
  sonuçları. 30 sn'de bir yenilenir.
- **📊 Karne** penceresi: 1/3/7/14 gün; dört tablo.
- **💼 Kasa** penceresi: aşağıda.

### Kasa (kullanıcının "%30" Excel şablonunun eşdeğeri)

- Dönem = 30 gün, hedef = dönem başı sermaye × 1,30.
- İşlem girişi: işlem sonrası **kasa** *ya da* **kazanç/zarar** (biri yeter; kasa girilirse kazanç ondan hesaplanır).
- Özet: toplam kazanç, güncel kasa, kazanç %, hedef, kalan, hedefe kalan %, **günlük alınacak = kalan / kalan gün**,
  **en büyük pozisyon = güncel kasa × %10**, işlem / kazanan sayısı, ilerleme çubuğu.
- "Yeni dönem": eski dönem kapanır, yenisi güncel kasayla başlar.
- Raporlar: yıllık, çeyreklik (Ç1–Ç4), aylık, bota göre.
- Excel'e aktarma: ExcelJS, **CDN'den** yüklenir (`cdn.jsdelivr.net`, internet gerekir).
- Kayıt: `data\kasa.json` asıl (her kayıttan önce `.yedek` kopyası). Her kayıtta `kasa_periods` / `kasa_trades`
  tabloları silinip yeniden yazılır (yansıma; gece yedeğine girsin diye). Okuma her zaman dosyadandır.
- 10.11 itibarıyla kullanıcı henüz işlem girmemiş (1 dönem, 0 işlem).

`kasa.json`: `{ active, nextId, periods: [{ id, start:'YYYY-AA-GG', capital, closedAt, trades: [{ id, coin, date, time, kasa|null, pnl|null, note, bot, dir }] }] }`

---

## 10. Ölçüm bulguları (karar verirken dayanak)

Hepsi **tek bir piyasa dönemine** aittir ve sinyaller çoğu zaman aynı anda onlarca coinde geldiği için gerçek
bağımsız örnek sayısı tablodakinden azdır. Komisyon ve kayma karne rakamlarına dahil değildir.

### 10.1 Karne, 30.10–07.11 (~34 bin tekrarsız sinyal)

| Grup | Sinyal | 1 sa kazanan | 4 sa ortalama |
|---|---|---|---|
| 4S 🟢 | 411 | %69 | +%0,59 |
| 4S 🔴 | 96 | %32 | −%0,64 |
| 4S Sniper "4H RSI DIVERGENCE" | 102 | %68 | +%0,49 |
| 4S Sniper NW UP / NW DOWN | 943 / 572 | %56 / %52 | +%0,42 / +%0,34 |
| DIV, V3, FR, 1DWS | — | %50–55 | ~0 |
| M1 ve M1 Premium 🟢 | ~7.000 | %43 | −%0,35 |
| M1 ve M1 Premium 🔴 | ~6.900 | %48 | +%0,15 |
| M1 Premium 🟢 + 1m✅5m✅ | 292 | %33 | −%1,10 |
| M1 Premium 🔴 + 1m✅5m✅ | 439 | %26 | −%1,53 |

Okuma: M1 ailesini sinyal yönünde takip etmek bu dönemde kaybettirdi. `1m✅5m✅` işareti sinyalin tersine çalıştı.

### 10.2 M1 Premium scalp testi (`db\scalp.cjs`, 14.042 sinyal, 1 dk mumlar, 31.10–07.11)

Kurulum: giriş sinyal fiyatı; hedef / stop / süre dolunca kapanış; kâr kaldıraçlı (ROE); komisyon gidiş-dönüş
fiyatın %0,1'i × kaldıraç; aynı mumda hedef ve stop görülürse stop sayılır; "stopsuz" = fiyat kaldıraç kadar
ters giderse −%100 (tasfiye). İki mod: **TAKİP** (sinyal yönü) ve **TERS** (kullanıcının yaptığı).

- +%3'e 30 dakikada ulaşma oranı her grupta %70–90'dır; bu oynaklığın sonucudur, tek başına bir şey kanıtlamaz.
- TAKİP hemen her grupta eksi (10x'te işlem başına −%1,5 ile −%2,5).
- Yorulma işareti yokken TERS de eksi.
- **Artıda kalan grup: 🔴 + 1m✅5m✅ + RSI 5m ≤ 20 iken long (264 sinyal).**
  5x, hedef +5, 30 dk: %87 hedefe, ortalama +%2,7 · 10x, hedef +8, 30 dk: %92, +%4,6 · 10x, hedef +40, 4 sa: %46, +%22,6.
- **Uyarı:** bu grubun ~%65'i tek günden geliyor (05.11: 267 coin aynı anda düşüp toparlandı, o gün %85 kazandı).
  Diğer günlerde oran ~%50. Yani kenar şimdilik tek bir olaya dayanıyor.
- Stopsuz risk: 4 saat içinde fiyat tüm sinyallerin ~%10'unda %10 ters gitti (10x'te tasfiye); 5x eşiği (%19) için ~%2–3.
  30 dakikalık işlemde tasfiye %0–2. Dar stop (−%10 ROE) işlemlerin %25–38'inde tetiklendi ve sonucu kötüleştirdi.
- Başka botun teyidi (aynı coinde son 4 saatte 4S/Sniper/DIV/FR aynı yönde) ters işleme katkı sağlamadı.

Bu testi yeniden çalıştırmadan önce `klines_1m`'i güncelle (`node db\mumlar1m.cjs --bir-kez`, ~1 saat sürer).

---

## 11. Trader Club göstergeleri ve Pine betikleri

Kullanıcı TradingView'de "Trader Club BUY-SELL [V.1]" ve "S/R" adlı kapalı kaynak göstergeleri kullanıyor.
Bunların klonu yazıldı; dosyalar `..\parity\pine\`:

| Dosya | İçerik |
|---|---|
| `tc_klon_v2.pine` ("TC Klon v2") | Buy/Sell, TP/SL etiketleri, Mild X, Divergence ▲▼, Ribbon, Reversal Bands, hata ayıklama çizgileri |
| `tc_sr_v1.pine` ("TC S/R v1") | Destek/direnç seviyeleri ve bölgeleri |
| `tc_klon_v1.pine`, `tc_clone_v0.pine` | eski sürümler |

Çözülen formüller:

- **Buy/Sell** = Range Filter, kaynak **ohlc4**, periyot 50, çarpan = `0,7 + 0,5 × Sensitivity` (Sensitivity 3 → 2,2).
  27/27 etiket. (Kaynak hlc3 sanılmıştı, 24/27'de kaldı; `src != src[1]` teşhisi de yanlıştı — Takip.md §15.)
- **TP/SL:** giriş = Buy/Sell mumunun kapanışı; SL %1, TP1/2/3 = %1/%2/%3.
- **Mild X** = WaveTrend(9,12,4) kesişimi, wt2 ±53 ötesinde. 17/18.
- **Divergence ▲▼** = wt2(9,12,3) üzerinde 7 mumluk fraktal uyumsuzluğu, tepe ≥ 20 / dip ≤ −40, 1 mum geriden çizilir. 8/9.
- **Ribbon** = SMA(ohlc4, 5) ve SMA(ohlc4, 8).
- **Reversal Bands:** orta = SMA(ohlc4, 30); adım ≈ 1,12 × WMA(high − low, 48); bantlar orta ± 3,4,5,6 × adım.
- **S/R:** 5 dk pivot(10) seviyeleri; bölge = seviye ± (son 300 mumun aralığı × %2).

Açık kalanlar: BULLA 5m'de bir mumda Pine "Buy" verirken orijinal ve JS vermiyor (v2'deki hata ayıklama
çizgileri bunun için); S/R'de hangi pivotların seçildiği (en iyi kural 5/6); ◇ Reversal işareti hiç yazılmadı.
Pine'da `scale=` parametresi **koyma** (ayrı ölçek açtırıp grafiği bozuyor). JS karşılıkları `..\parity\research\tc\`.

TradingView'e ajan erişimi yoktur; kullanıcı Pine'ı kendisi yapıştırır ve ekran görüntüsüyle geri bildirim verir.

---

## 12. Geliştirme ortamı ve kurallar

### Ortam

- **Node.js v25** (Windows). Dosyalar **CommonJS, `.cjs` uzantılı**, `'use strict'`. TypeScript, derleyici, paketleyici yok.
- Tek dış bağımlılık `pg`. Yeni bağımlılık eklemeden önce düşün; `fetch`, `WebSocket`, `node:http`, `node:fs`
  yerleşik olarak yetiyor. Gerçekten gerekiyorsa gerekçesini kullanıcıya söyle.
- Test çatısı ve otomatik test **yok**. Doğrulama şimdiye kadar şöyle yapıldı: `node -c dosya.cjs` (sözdizimi),
  küçük elle çağrılar, arşivle toplu karşılaştırma betikleri, canlı gözlem.
- Git: yerelde ayrı bir depo yok; gönderim `push-takip.cjs` ile geçici çalışma ağacından yapılır.

### İki çalışma biçimi

**A) Ajan doğrudan bu bilgisayarda çalışıyorsa** (yerel terminal erişimi): komutları `botlar-v1` içinde
doğrudan çalıştır (`node db\sorgu.cjs …`, `node -c …`). Aşağıdaki "çalıştırıcı" gerekmez.

**B) Ajan uzaktaysa ve bilgisayara yalnız dosya düzeyinde erişiyorsa:** ağ gerektiren her şey
`..\parity\runner.cjs` üzerinden yapılır. Çalıştırıcı kullanıcı oturumu açılınca kendiliğinden başlar.

- İş vermek: `..\parity\jobs\<ad>.job.json` = `{"script":"tools/x.cjs","args":[…]}` (yol `parity\` içine göre,
  `.cjs` ile bitmeli). Dosyayı önce `.tmp` adıyla yazıp sonra yeniden adlandır (yarım okunmasın).
- Çıktı `jobs\<ad>.log`, bitince `jobs\<ad>.done`. Durdurmak: `{"kill":"<ad>"}`.
- `botlar-v1\db\` betikleri için sarmalayıcı: `{"script":"tools/v1-db.cjs","args":["<betik adı>", …]}`
  (örnek: `["sorgu","C:\\…\\q.sql"]`, `["karne","--bir-kez"]`).
- Komut satırına göre süreç kapatma: `{"script":"tools/kill-cmd.cjs","args":["mumlar1m"]}`.
- Bağlı klasörlerde silme kapalı olabilir; geçici dosyaları `_to_delete\` altına taşı.

### Kod kuralları

- Mevcut üslup yoğundur (uzun satırlar, kısa adlar). Yeni kodda aynı kalıbı koru ama **her dosyanın başına
  ne yaptığını ve nasıl çalıştırıldığını anlatan 2–5 satırlık yorum** yaz (mevcut dosyalar böyle).
- Sürekli çalışan betikler `--bir-kez` bayrağını desteklesin ve kaldığı yerden devam edebilsin
  (durum tablosu ya da `ON CONFLICT DO NOTHING`).
- Veritabanına toplu ekleme: 1.000'lik gruplar, parametreli sorgu. Metin birleştirerek SQL kurma.
- `evaluate` içinde ağ çağrısı, dosya okuma, ağır döngü olmaz; saniyede binlerce kez çağrılır.
- Web'de kullanıcıdan gelen her değer doğrulanır (`server.cjs`'deki `clean()` ve sembol süzgeci örnek).
- Görünen bir şey değiştiyse `VERSION`'ı artır (web başlığında görünür; yama: düzeltme, küçük: özellik).
- İş bitince `Takip.md`'ye tarihli kısa not ekle: ne değişti, ne ölçüldü, kaç örnekle.

### Sık işlemler

| İş | Nasıl |
|---|---|
| Web'i yeniden başlat | `data\kontrol\web.yeniden` oluştur |
| Kural değiştir | `rules\*.cjs`'yi kaydet; 15 sn içinde yüklenir (`data\log\motor.log`'da `module …` satırı) |
| Motor sağlığı | `data\live\status.json` (`at` taze mi, `errors` kaç) |
| Dosya ↔ tablo tutarlılığı | `node db\dogrula.cjs` |
| Karneyi baştan hesapla | `karne_state`'teki `done_until` satırını sil, `node db\karne.cjs --bir-kez` |
| Yedekten dönme | `pg_restore -h 127.0.0.1 -p 5433 -U botlar -d botlar --clean data\yedek\botlar-….dump` (önce kullanıcı onayı) |
| Depoya gönder | `..\parity\tools\push-takip.cjs` (önce kullanıcıya sor) |

---

## 13. Bilinen sorunlar ve eksikler

Öncelik sırasıyla; her biri bağımsız bir iş olarak alınabilir.

**İşletme**

1. `mumlar` ve `karne` geçici olarak çalıştırıcıdan çalışıyor (bkz. §4 uyarı). Kullanıcı `servis-kur.bat`'ı yeniden çalıştırmalı.
2. Bilgisayar **uykuya** geçerse her şey durur. Güç ayarını kullanıcı değiştirmeli ("takılıyken uyku: hiçbir zaman").
3. `klines_1m` 07.11 17:56 UTC'de kaldı; sürekli güncellenmiyor. Scalp testini tekrarlamak için gerekli.
4. (Çözüldü 10.11) `package.json` ve `README.md` güncellendi.
5. `Takip.md`'nin başlığı ve ilk bölümleri (§1–§11) Visivero dönemini anlatıyor; güncel durum sondaki eklerde.
6. Disk: `data\arastirma\agg` (1,5 GB CSV) ve `..\video\*.wav|*.webm` artık gereksiz; silmek için kullanıcı onayı gerekir.
7. `signals` tablosu M1 tekrarları yüzünden hızlı büyüyor (günde ~110 bin satır). Saklama/özetleme politikası yok.

**Bot doğruluğu**

8. (Çözüldü 10.11) `BTC Status` artık gerçek: `lib\btc.cjs`. Bizim etiket Visivero'nunkinden biraz daha sık "Volatilite" yazar.
9. M1'de 03:00 TR civarı sinyal fazlalığı (Visivero'nun ~2 katı).
10. Hammer yalnızca `#W1` üzerine kurulu; `#S1/#R1` için denenen her kural ≤ %10 isabette kaldı.
11. DIV'de SMA CROSSED ve 4H, 1DWS'te 1D DIVERGENCE kapalı.
12. Mesajlardaki 1h RSI %50, 1h SRSI %20 oranında birebir tutuyordu (sinyal zamanını etkilemiyor).
13. `ratios` verisi coin başına sırayla çekildiği için 4S mesajındaki Trader Positioning / Market Exposure bayat olabilir.

**Uygulama**

14. Excel'e aktarma: dosya hatasız üretiliyor (10.11'de tarayıcıda sınandı), Excel'de açılıp formüller gözle doğrulanmadı; CDN'e bağlı (çevrimdışı çalışmaz).
15. Otomatik test yok. Kural değişikliklerini arşive karşı koşturan bir geri test düzeneği yok
    (eski karşılaştırma araçları `..\parity\compare.cjs`, `..\parity\research\` altında, Visivero dosyalarına bağlı).
16. Karnenin 15 dakikalık ölçümü 5 dk mumla yaklaşık (15–20 dk arası); kısa vadeli ölçüm için 1 dk mum gerekir.
17. Telegram gönderici kapalı. Kullanıcı botu engellediği için hiç mesaj ulaşmamıştı; yeniden açılırsa kullanıcı
    önce botuna `/start` yazmalı ve tokeni yenilemeli (eski token sohbette paylaşıldığı için güvensiz sayılır).

### 13.1 10.11.2026 kod incelemesinde bulunan ve düzeltilen hatalar (V1.4.1)

| # | Hata | Etki | Düzeltme |
|---|---|---|---|
| 1 | Haftalık mumlar perşembeye hizalanıyordu (`floor(t / hafta)`; Binance haftası pazartesi açılır) | Motor açıldıktan 1 dk sonra haftalık seri bozuluyor, "önceki hafta" olarak yarım hafta kullanılıyordu → DIV'in `Pivot:` satırı ve Hammer'ın pivot kapısı yanlış | `engine\market.cjs` `barOpen()` |
| 2 | Bağlantı kopunca yalnız son 30 dakika geri dolduruluyordu | 30 dk'dan uzun kesintide (uyku, ağ) bütün seriler kalıcı delikli kalıyor, göstergeler sessizce yanlış hesaplanıyordu | kesinti süresi kadar (en çok 1.500 dk) istenir; daha uzunsa loga uyarı |
| 3 | `db\mumlar.cjs` her 5 dk'da 815 coin × `limit=1500` istiyordu | ~8.000 istek ağırlığı / tur (sınır 2.400/dk) → sık "Binance sınırı" beklemesi, IP engeli riski (canlı motoru da durdurur) | yalnız gereken kadar mum; sembol listesi saatte bir, son zamanlar bellekte |
| 4 | `start-v1.bat` servis kontrolünü `schtasks /query` ile yapıyordu (normal kullanıcıda her zaman hata verir) | Çift tıklanınca **ikinci bir motor** başlatıp aynı dosyaya çift sinyal yazabilirdi | siteye sorulur; servis kurulu ama site kapalıysa ikinci motor başlatılmaz |
| 5 | İki `runner.cjs` aynı anda çalışıyordu | `{"kill":…}` işleri yanlış kopyaya düşüp işe yaramıyordu | tek kopya koruması; eski kopya kapatıldı |
| 6 | Web sunucusu 48 saatten eski kartları bellekten atmıyordu | Günlerce açık kalınca az sinyalli botlarda eski kartlar akışta kalıyordu | dakikada bir budama |
| 7 | `BTC Status: Normal` sabit yazıydı | Yanıltıcı bilgi | arşivden kural çıkarıldı (`db\btc-durum.cjs`), `lib\btc.cjs` |
| 8 | Kasa yansıması eşzamanlı çalışabiliyordu; denetçide `spawn` hatası yakalanmıyordu; oran döngüsü aralıksızdı | küçük | sıraya alındı; hata yakalanıyor (denetçi için bir sonraki açılışta geçerli); 150 ms aralık |

İncelenip **dokunulmayanlar** (bilinçli): yeni listelenen coinler motor yeniden başlayana kadar izlenmez (evren açılışta bir kez okunur);
1 dakika boyunca hiç işlem olmayan coinlerde o dakikanın mumu seriye girmeyebilir (doğrulanamadı, etkisi küçük);
`karne_signals.reps` alanı anlamlı değil (kullanılmıyor).

---

## 14. Yol haritası önerileri

Bunlar öneridir; hangisinin yapılacağına kullanıcı karar verir. Kullanıcının amacıyla en doğrudan ilgili olanlar üstte.

1. **"Yorulma" görünümü.** Kullanıcının gerçekten işlem yaptığı durumu (M1 Premium + ters yönde uyumsuzluk /
   WT Cross / aşırı RSI) öne çıkaran ayrı bir bot kartı ya da süzgeç; kartta "ters yön" açıkça yazsın.
   Karne'de bu grubun TERS yöndeki sonucu ayrı satır olsun.
2. **Haftalık yeniden ölçüm.** `scalp.cjs`'yi parametreli ve dönem seçilebilir yap; sonuçları tarihli sakla
   (`data\rapor\scalp-YYYY-AA-GG.json`), haftalar arası karşılaştırma tablosu üret. Asıl soru: 05.11 gibi
   olmayan günlerde de kenar var mı?
3. **Karne'ye piyasa bağlamı.** Günlük kırılım, BTC'nin o günkü yönü, "aynı dakikada kaç coinde sinyal vardı"
   (toplu olayları tekil sinyalden ayırmak için).
4. **Kasa ↔ sinyal bağlantısı.** "İşleme girdim" ile açılan işlemi kapanışta sinyalle eşleştir; kullanıcının
   kendi sonuçlarını bot ve yorulma işaretine göre raporla.
5. **`klines_1m`'i sürekli güncelle** (denetçiye ekle; hız sınırına dikkat) ve karneye 5 / 15 / 30 dk ölçümleri ekle.
6. **Geri test düzeneği.** Kural modüllerini kayıtlı mumlar üzerinde yeniden oynatan bir koşucu; kural
   değişikliğinin etkisi canlıya almadan görülsün. İlk otomatik testler `lib\ind.cjs` için yazılabilir.
7. **Veri bakımı.** M1 ham tekrarları için saklama politikası (örnek: 30 günden eski tekrarları özet tabloya indir;
   JSONL dosyalarına dokunmadan).
8. **BTC Status** kuralını arşivden çöz (`vv_messages` içinde `Normal` dışı değerleri ara).
9. **Telegram**'ı yeniden aç (kullanıcı isterse), yorulma görünümüne göre.
10. **Hammer** araştırması (en zor, getirisi belirsiz).

---

## 15. Sözlük

| Terim | Anlam |
|---|---|
| Motor | `engine\live.cjs` süreci |
| Aile (family) | bir kural dosyası; birden çok bot üretebilir |
| Canlı mum | henüz kapanmamış mum; kapanışı o anki fiyat sayılır |
| Epizot / tekrarsız sinyal | kısa aralıkla tekrar eden kayıtların ilki |
| Çapa (anchor) | uyumsuzluk dedektöründe RSI'nin en uç olduğu geçmiş mum |
| Yakalama / isabet | Visivero'ya göre duyarlılık / kesinlik |
| TAKİP / TERS | sinyal yönünde işlem / tersine işlem (yorulma) |
| ROE | kaldıraçlı kâr-zarar yüzdesi (fiyat hareketi × kaldıraç) |
| MFE / MAE | işlem süresince lehte en iyi / aleyhte en kötü nokta |
| Karne | sinyallerin sonradan ölçülen sonuç tablosu |
| Kasa | kullanıcının kişisel işlem ve sermaye kaydı (%30 hedefli 30 günlük dönemler) |
| Denetçi | `servis\denetci.cjs`; parçaları başlatan ve ayakta tutan süreç |
| Çalıştırıcı (runner) | `..\parity\runner.cjs`; dosya bırakarak iş çalıştırma aracı |
| TC | Trader Club (TradingView göstergeleri) |
| VV | Visivero |
