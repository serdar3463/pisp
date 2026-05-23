# PISP Incident Response Planı

## Amaç

Kişisel bilgi güvenliğiyle ilgili olaylarda hızlı, izlenebilir ve kullanıcıyı koruyan bir müdahale süreci tanımlamak.

## Olay Türleri

- Kasa verisinin beklenmedik şekilde görünmesi
- QR doğrulama hatası
- Yanlış alıcıya paylaşım riski
- Yedek geri yükleme hatası
- Veri silme talebi sorunu
- Mağaza build veya signing problemi
- Hukuki metin veya privacy label uyumsuzluğu

## İlk Müdahale

1. Olay zamanı, cihaz modeli ve uygulama sürümü kaydedilir.
2. Kullanıcıdan ham kişisel veri istenmez.
3. QR payload veya yedek paket gibi hassas içerikler destek kanalına gönderilmez.
4. Gerekirse kullanıcıya yerel kasayı kilitleme ve izinleri kapatma adımları verilir.
5. Olay P0/P1/P2 olarak sınıflandırılır.

## Öncelik Seviyeleri

- P0: Kişisel veri sızıntısı veya kasaya yetkisiz erişim şüphesi.
- P1: QR, yedekleme veya veri silme akışında güvenlik etkili hata.
- P2: Kullanılabilirlik, metin, mağaza veya destek problemi.

## İletişim

Public launch öncesi gerçek destek e-postası ve güvenlik bildirimi adresi belirlenmelidir.

## Kapanış Kriteri

- Kök neden yazıldı.
- Kullanıcı etkisi değerlendirildi.
- Gerekli düzeltme yayınlandı.
- Hukuki bildirim gerekip gerekmediği değerlendirildi.
- Release checklist güncellendi.
