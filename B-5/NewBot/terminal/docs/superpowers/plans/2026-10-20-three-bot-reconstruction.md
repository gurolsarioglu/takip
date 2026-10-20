# Divergence, 4S Sniper ve Hammer Pro+ araştırma planı

Kullanıcının 20.10.2026 talebiyle kapsam bu üç bottur. Amaç Visivero olmadan Binance halka açık verisinden bağımsız sinyal üretimi. Önceki onaylı parity tasarımının devamıdır; üretim eşikleri kanıtsız değiştirilmeyecek.

Yaklaşım: rastgele eşik uydurma yerine istemcide taşınan gösterge kaynaklarını REA ile incele, her bottan sınırlı geçmiş örneği sakla, Binance mumlarını yalnız olay anına kadar kullanarak aday formülleri test et. Gösterge kaynak kodu bulunması bot sunucusunun aynı kodu kullandığını tek başına kanıtlamaz.

- [x] REA ile yeni gösterge demetini incele; inert stringleri çalıştırmadan çıkart ve SHA256/byte aralıklarını kaydet.
- [x] Bilinen salt okunur API'den her bottan 100 geçmiş mesajı credentials olmadan araştırma klasörüne kaydet. Şema, piyasa ve bot kimliği doğrulansın.
- [x] Strateji adları, yön, zaman dilimi ve zaman kümelerini çıkar. Snapshot fiyatından RSI yeniden hesaplandı; bütün sembol/fiyat eşleşmelerinin garantisi değildir.
- [x] Örnek olaylar için Binance geçmiş mumlarını kaydet. Sonradan tamamlanmış mumun olay anındaki canlı mum gibi kullanılmasını engelle; intrabar karşılaştırmasını belirsiz bırak.
- [x] Nadaraya ve divergence adaylarını izole testlerle değerlendir; eğitim örneklerine uydurma eşik ekleme. Pozitif örnek uyumu precision veya tam parity olarak sunulmasın.
- [x] Sonuçları her bot için kanıtlandı/hipotez/çelişki olarak raporla. İleri dönem test ve negatif örnekler olmadan 'çözüldü' deme.

İlk araştırma adımı tamamlandı. Sonuç: NW91/91, W1 55/55 pozitif koşul uyumu; yeni NW kimliklerinde Binance bağımsız fiyatıyla19/19,1 puanlanamayan. DIV divergence ve S1/R1 çözülmedi. Sniper daily/week alt kanalı ayrıca saklandı. Tam bağımsız botlar ve eşzamanlı eşleşme hâlâ açık; ayrıntı `review/three-bot-findings-2026-10-20.md`.

Dosyalar `review/` altında; canlı arşiv, Telegram ve üretim strateji değişikliği bu araştırma adımına dahil değildir.
