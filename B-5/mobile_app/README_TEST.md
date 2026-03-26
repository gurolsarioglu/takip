# B-5 Mobile App - Test ve Kurulum Kılavuzu 🚀

Mobil uygulama kodları `y:\takip\B-5\mobile_app` dizininde hazırlandı. Uygulamayı test etmek için aşağıdaki adımları izleyebilirsiniz.

## 1. Firebase Kurulumu (Kritik)
Firebase bağlantısının çalışması için Firebase Console üzerinden projenize Android/iOS uygulamalarını ekleyip ilgili dosyaları yerleştirmeniz gerekmektedir:
- **Android:** `android/app/google-services.json`
- **iOS:** `ios/Runner/GoogleService-Info.plist`

## 2. Uygulamayı Çalıştırma
Bilgisayarınızda Flutter yüklü olduğu için (`C:\flutter\bin`), terminalden şu komutlarla uygulamayı başlatabilirsiniz:

```bash
cd y:\takip\B-5\mobile_app
flutter run
```

## 3. Özellikler
- **Giriş:** Firebase'deki kullanıcı bilgilerinizle giriş yapın.
- **Sinyaller:** Ana ekranda botlardan gelen tüm sinyalleri anlık görün.
- **İzleme Listesi:** Sinyal detayından veya listeden coinleri favoriye ekleyin.
- **Kasa:** Bakiyenizi ve işlem geçmişinizi takip edin.

## 4. Bildirimler (Push)
Bildirimlerin telefonunuza düşmesi için uygulamanın Firebase Cloud Messaging (FCM) ayarlarının yapılmış olması gerekir. Kod seviyesinde altyapı hazırlanmıştır.

---
**Not:** Eğer sanal bir Android cihazınız (Emulator) veya USB ile bağlı bir telefonunuz varsa `flutter run` otomatik olarak o cihazda başlatacaktır.
