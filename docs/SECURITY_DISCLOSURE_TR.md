# PISP Güvenlik Bildirimi Süreci

## Amaç

Güvenlik araştırmacıları veya kullanıcılar tarafından bildirilen açıkların güvenli şekilde alınması ve kapatılması.

## Bildirim Kanalı

Public launch öncesi gerçek bir güvenlik iletişim adresi yayınlanmalıdır.

Önerilen format:

```text
security@your-domain.com
```

## Bildirimde İstenebilecek Bilgiler

- Uygulama sürümü
- Cihaz modeli ve işletim sistemi
- Sorunun tekrar üretim adımları
- Ekran görüntüsü veya hata mesajı

Kullanıcıdan ham kişisel veri, yedek parolası, QR payload içeriği veya özel nitelikli veri istenmemelidir.

## Kapsam İçi Konular

- Yerel kasa erişim kontrolü
- QR imza doğrulama
- Açık onay atlatma
- Hash zinciri bütünlüğü
- Şifreli yedekleme
- Yerel veri silme

## Kapsam Dışı Konular

- Sosyal mühendislik
- Fiziksel cihaz ele geçirme sonrası işletim sistemi kırılması
- Üçüncü taraf mağaza veya işletim sistemi açıkları

## Yanıt Hedefleri

- İlk yanıt: 3 iş günü
- Ön değerlendirme: 7 iş günü
- Kritik açık düzeltme hedefi: 30 gün

Bu hedefler public launch öncesi şirket politikasıyla netleştirilmelidir.
