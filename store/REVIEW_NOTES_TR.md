# Mağaza İnceleme Notları

## Test Hesabı

Bu sürüm local-first çalışır ve hesap gerektirmez.

## Test Akışı

1. Uygulamayı aç.
2. Aydınlatma onayını ver.
3. Cihaz kilidi veya biyometri ile kasayı aç.
4. `Kasa` modülünde örnek bilgileri incele.
5. `Politika` modülünde paylaşım paketini seç ve teknik detayları aç.
6. `Aktarım` modülünde QR isteğini görüntüle.
7. Aynı ekrandaki `Test et` düğmesiyle QR isteğini simüle et.
8. Açılacak bilgileri incele ve QR yanıtını onayla.
9. `Kanıt` modülünde hash kayıt zincirini kontrol et.
10. `Güvenlik` modülünde şifreli yedekleme ve veri silme kontrollerini incele.

## Kamera Kullanımı

Kamera yalnızca PISP formatındaki QR isteklerini okumak için kullanılır.

## Biyometri Kullanımı

Biyometri veya cihaz kilidi, yerel kasayı açmak için kullanılır. Biyometri bilgisi uygulama tarafından okunmaz veya saklanmaz.

## Veri Saklama

Ham kişisel veriler local-first yaklaşımla cihazda tutulur. Hash kanıt zinciri kişisel değer içermez.

## İnceleme Notu

Gerçek public launch öncesinde privacy/support/delete-data URL'leri production domain ile değiştirilmelidir.
