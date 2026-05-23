# PISP Kapalı Beta Test Planı

## Amaç

PISP'i public launch öncesinde kontrollü kullanıcılarla doğrulamak.

## Kapsam

- İlk açılış ve kasa kilidi
- 14 alanlı kasa deneyimi
- Alan ve öznitelik izinleri
- Politika ve minimum açıklama
- QR istek/yanıt akışı
- Hash kanıt zinciri
- Şifreli yedekleme ve geri yükleme
- Yerel veri silme

## Katılımcı Profili

- 10-20 teknik kullanıcı
- 5-10 hukuk/uyumluluk geri bildirimi verebilecek kullanıcı
- 5-10 normal son kullanıcı

## Zorunlu Test Senaryoları

1. Uygulama ilk kez açılır ve aydınlatma onayı verilir.
2. Kasa cihaz kilidiyle açılır.
3. Kasa içindeki en az üç alan düzenlenir.
4. Özel nitelikli bir alan açıkken uyarı görülür.
5. Politika modülünde paylaşım paketi oluşturulur.
6. QR isteği iki cihaz arasında denenir.
7. Sahte veya bozuk QR isteği reddedilir.
8. QR yanıtı açık onay olmadan üretilemez.
9. Kanıt zinciri ham veri göstermeden kayıt üretir.
10. Şifreli yedek oluşturulur ve geri yüklenir.
11. Yerel kasa silinir.

## Başarı Ölçütleri

- Kritik veri kaybı hatası yok.
- QR paylaşım akışı kullanıcı tarafından anlaşılır.
- Özel nitelikli veri uyarısı fark edilir.
- Kullanıcı, hangi bilgiyi paylaştığını açıkça görebilir.
- Public launch öncesi tüm P0/P1 geri bildirimleri kapanır.
