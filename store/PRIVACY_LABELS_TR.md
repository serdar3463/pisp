# PISP Privacy Labels Taslağı

Bu dosya App Store ve Google Play veri güvenliği formları için hazırlık notudur. Public launch öncesinde hukukçu ve mağaza hesabı sahibi tarafından doğrulanmalıdır.

## Toplanan Veri

PISP mevcut local-first sürümde ham kişisel veriyi uygulama geliştiricisinin sunucusuna göndermez.

## Cihazda İşlenen Veri

- Kimlik ve temel kişisel bilgiler
- İletişim bilgileri
- Kariyer, eğitim, finans, sağlık ve diğer PISP alanları
- Paylaşım izinleri
- QR istek ve yanıt payload'ları
- Yerel hash kanıt kayıtları
- Şifreli yedek paketi

## Geliştiriciye Gönderilmeyen Veri

- Ham kasa değerleri
- Özel nitelikli veri değerleri
- Şifreli yedek parolası
- Cihaz kilidi veya biyometri bilgisi

## İzinler

- Kamera: QR isteği okumak için.
- Biyometri / cihaz kilidi: yerel kasayı açmak için.

## Üçüncü Taraf Paylaşımı

Mevcut sürümde ham kişisel veriler üçüncü taraf analiz, reklam veya takip servisleriyle paylaşılmamalıdır.

## Public Launch Öncesi Karar

Crash reporting, analytics veya destek sistemi eklenecekse privacy label yeniden güncellenmelidir.
