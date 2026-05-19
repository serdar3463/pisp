# İki Cihaz QR Test Planı

Bu test PISP'in kişiden kişiye bilgi isteme ve paylaşma akışını gerçek cihazlarda doğrular.

## Gerekenler

- Cihaz A: bilgi isteyen kullanıcı
- Cihaz B: bilgi sahibi kullanıcı
- Her iki cihazda PISP/Expo build çalışır
- Her iki cihaz aynı ağda veya Expo bağlantısına erişebilir

## Test Akışı

1. Cihaz B'de Kasa ekranına gir.
2. En az Kimlik, İletişim ve Kariyer alanlarına değer gir.
3. Paylaş ekranında bir paylaşım paketi seç.
4. Özel nitelikli alanların kapalı olduğunu doğrula.
5. Cihaz A'da QR ekranından istek QR'ı oluştur.
6. Cihaz B'de QR ekranından Cihaz A'nın QR'ını okut.
7. Cihaz B'de istek amacı, isteyen DID, açılacak bilgiler ve engellenen alanları kontrol et.
8. Onay ver ve yanıt QR'ını üret.
9. Cihaz A yanıt QR'ını okuttuğunda yalnızca izin verilen alanların geldiğini doğrula.
10. Cihaz B'de Güvenlik > Kanıt bölümünde kayıt oluştuğunu kontrol et.
11. Aynı paylaşım paketini kullanım limiti kadar paylaş ve limit dolduğunda yeni paylaşımın reddedildiğini doğrula.

## Kabul Kriterleri

- İstek QR'ı doğrulanmadan yanıt üretilemez.
- Kullanıcı onayı olmadan yanıt QR'ı oluşmaz.
- Kapalı alanlar yanıt payload'ına girmez.
- Özel nitelikli alanlar varsayılan olarak kapalıdır.
- Kayıt zincirinde ham kişisel veri değeri yoktur.
- Kullanım limiti dolduğunda paylaşım yeniden üretilemez.

## Negatif Testler

- QR içeriğini elle boz ve imza doğrulamasının reddettiğini kontrol et.
- Süresi geçmiş QR payload'ı dene.
- Tüm izinleri kapat ve paylaşımın boş/engelli geldiğini kontrol et.
- Kamera izni reddedildiğinde uygulama anlaşılır hata mesajı göstermeli.
- Hatalı tarih/e-posta/telefon/sayı gir ve Kasa ekranında doğrulama uyarısı çıktığını kontrol et.
