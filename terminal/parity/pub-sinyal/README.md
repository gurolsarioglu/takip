# Visivero Botları

Visivero'nun (terminal.visivero.com) bot sinyallerini, Visivero'daki gibi bir ekranda gösteren küçük bir yerel web sitesi.

- Solda 12 bot: M1-A, M1 Premium, FR, V3, Hammer, Hammer Pro, Hammer Pro+, 1D Hammer Pro, 4S, 4S Sniper, 1DWS, DIV
- Sağda seçili botun mesajları canlı akar (en yeni en üstte)
- Coin araması; mesajdaki coin adına tıklayınca o coine göre süzülür
- Her butonda son 24 saatteki mesaj sayısı

Mesajlar Visivero'nun herkese açık `api/bot-messages` adresinden yaklaşık 8 saniyede bir çekilir; üyelik gerekmez.
Bu kaynak kapanırsa site yeni mesaj gösteremez.

## Çalıştırma (Windows)

1. [Node.js](https://nodejs.org) 18 veya üstü kurulu olmalı.
2. `start.bat` dosyasına çift tıklayın (ya da klasörde `node server.js`).
3. Tarayıcıda **http://localhost:3101** adresini açın.

Ek paket gerekmez (`npm install` yok).

## Ayarlar (isteğe bağlı ortam değişkenleri)

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `PORT` (veya `--port`) | 3101 | Site portu |
| `HOST` | 127.0.0.1 | Yalnızca bu bilgisayardan erişim |
| `POLL_MS` | 8000 | Visivero'yu kaç ms'de bir yoklasın |

## Notlar

- Mesajlar `data/` klasöründe saklanır (son 26 saat); program yeniden açıldığında kaldığı yerden devam eder.
- İlk açılışta geçmiş, bot başına en fazla 30 sayfa (3000 mesaj) çekilir. M1 gibi çok sık mesaj atan botlarda
  24 saatlik sayaç, program 24 saat çalıştıktan sonra tam doğru olur.
- Site yalnızca kendi bilgisayarınızdan açılır (localhost); dışarıya kapalıdır.
