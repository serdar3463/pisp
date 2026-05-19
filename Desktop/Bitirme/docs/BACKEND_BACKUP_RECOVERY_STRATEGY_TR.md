# PISP Backend, Yedekleme ve Kurtarma Stratejisi

PISP'in temel prensibi ham kişisel veriyi sunucuda okumamaktır. Backend gerekiyorsa veri sahibi kullanıcı kalmalı, sunucu yalnızca şifreli blob, public key, iptal kaydı ve kanıt metaverisi taşımalıdır.

## Hedef Mimari

- Mobil cihaz yerel kasanın ana sahibidir.
- Ham kişisel veri cihazda şifrelenir.
- Yedek alınacaksa veri önce cihazda uçtan uca şifrelenir.
- Sunucu şifre çözme anahtarını görmez.
- Cihaz DID public key'i, imza doğrulama için tutulabilir.
- Paylaşım kanıtları hash ve politika metaverisi seviyesinde tutulur.

## Backend Bileşenleri

| Bileşen | Görev | Ham Veri Görür mü? |
|---|---|---|
| Auth service | Kullanıcı oturumu ve cihaz eşleştirme | Hayır |
| Encrypted backup store | Şifreli kasa yedeği saklama | Hayır |
| Device registry | Kullanıcı cihaz public key listesi | Hayır |
| Revocation registry | İptal edilen izin/paket kayıtları | Hayır |
| Proof API | Hash ve policy proof doğrulama | Hayır |
| Support API | Destek ve veri silme talepleri | Hayır |

## Cihaz Değişimi

1. Eski cihaz kasayı kullanıcı parolası veya recovery secret ile şifreler.
2. Şifreli yedek backend'e yüklenir.
3. Yeni cihaz kullanıcı hesabıyla giriş yapar.
4. Kullanıcı recovery secret ile yedeği çözer.
5. Yeni cihaz kendi DID anahtarını üretir.
6. Eski cihaz iptal edilebilir.

## Mevcut Mobil MVP Davranışı

Uygulama içinde Güvenlik > Hesap bölümünde parola ile şifrelenmiş taşınabilir yedek oluşturma ve geri yükleme akışı vardır.

- Yedek paketi `pisp.backup.v1` protokolüyle üretilir.
- Paket AES ile kullanıcının verdiği yedek parolası üzerinden şifrelenir.
- Bütünlük kontrolü SHA-256 checksum ile yapılır.
- Sunucu veya PISP ekibi yedek parolasını görmez.
- Parola kaybolursa yedek geri açılamaz.

## Anahtar Kurtarma

v1 için önerilen model:

- Kullanıcıya 12 veya 24 kelimelik recovery phrase gösterilir.
- Recovery phrase cihaz dışında saklanır.
- Sunucu recovery phrase'i görmez.
- Recovery phrase kaybolursa PISP kasayı geri açamaz.

Alternatif v2:

- Social recovery
- Hardware-backed passkey
- Shamir secret sharing
- Enterprise escrow, sadece kurumsal müşteriler için

## Saklanabilecek Veriler

- Kullanıcı ID
- Cihaz public key
- Şifreli kasa blob'u
- Şifreli yedek versiyonu
- Revocation hash
- Policy hash
- Support ticket metadata

## Saklanmaması Gereken Veriler

- Ad soyad gibi ham kişisel alanlar
- Sağlık/finans/kimlik değerleri
- QR disclosure payload içindeki ham değerler
- Recovery phrase
- Yerel kasa encryption key

## Go / No-Go

Backend canlıya alınmadan önce dış güvenlik incelemesi, yedek geri yükleme testi ve veri silme süreci tamamlanmalıdır.
