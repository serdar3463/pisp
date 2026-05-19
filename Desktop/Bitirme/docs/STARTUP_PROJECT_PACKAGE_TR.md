# PISP Startup Proje Paketi

Bu doküman PISP'i bitirme projesi demosu değil, kapalı beta aşamasına yaklaşan bir startup ürünü olarak anlatmak için hazırlanmıştır.

## 1. Kısa Tanım

PISP, kullanıcıların kişisel bilgilerini telefonlarında tutmasını, hangi bilginin kimle paylaşılacağını görmesini ve QR üzerinden açık onayla paylaşım yapmasını sağlayan mobil kişisel bilgi kasasıdır.

## 2. Problem

Kişisel bilgiler farklı platformlarda dağınık, kontrolsüz ve çoğu zaman kullanıcıdan kopuk şekilde tutulur. Kullanıcı bir kuruma veya kişiye bilgi verdiğinde hangi alanların açıldığını, ne amaçla istendiğini ve geçmişte ne paylaştığını takip etmekte zorlanır.

## 3. Çözüm

PISP kullanıcıya üç temel kontrol verir:

- Bilgilerim: Kullanıcı bilgilerini cihazındaki yerel kasada tutar ve alan bazında açıp kapatır.
- Paylaş: Kullanıcı paylaşım tipini, alıcıyı, amacı ve açılacak bilgileri görür; açık onay vermeden paylaşım oluşmaz.
- Ayarlar: Kullanıcı paylaşım geçmişini, cihaz kilidini, şifreli yedeği ve veri silme sürecini yönetir.

## 4. Ürün Değeri

- Kullanıcı verisi varsayılan olarak telefonda kalır.
- Boş alanlar paylaşım paketine dahil edilmez.
- Hassas bilgiler ayrı risk etiketiyle gösterilir.
- QR isteği kontrol edilir ve şüpheli istekler reddedilir.
- Paylaşım geçmişi ham kişisel bilgi göstermeden kayıt altına alınır.
- Şifreli taşınabilir yedek ile telefon değişimi senaryosuna temel hazırlanır.

## 5. Hedef Kullanıcılar

### Bireysel Kullanıcı

Kimlik, iletişim, kariyer, sağlık, finans ve eğitim bilgilerini kontrollü şekilde yönetmek ister.

### Profesyonel Kullanıcı

İşe alım, portfolyo, referans veya uygunluk bilgilerini hızlı ve kontrollü paylaşmak ister.

### Kurum / Doğrulayıcı

Kullanıcıdan sadece gerekli bilgileri istemek ve izinli paylaşım almak ister.

## 6. Farklılaşma

PISP klasik form doldurma veya profil uygulaması değildir. Ürünün farkı, kullanıcıya kişisel bilgi egemenliği sağlamasıdır:

- Local-first mimari
- Açık onay kapısı
- Veri minimizasyonu
- QR tabanlı kişiden kişiye aktarım
- Hash tabanlı paylaşım kanıtı
- KVKK/GDPR uyumuna hazırlanan şeffaflık merkezi

## 7. MVP Kapsamı

Bu sürümün MVP kapsamı:

- 14 kişisel bilgi alanı grubu
- Alan ve grup bazlı paylaşım izni
- Boş alanları paylaşım dışında bırakma
- Süresiz ve limitsiz paylaşım politikası
- QR ile bilgi isteme ve yanıt üretme
- İmzalı QR isteği kontrolü
- Paylaşım geçmişi
- Cihaz kilidi
- Şifreli yerel saklama
- Şifreli taşınabilir yedek
- Yerel kasa silme
- Hukuki bilgilendirme merkezi

## 8. Gelir Modeli

İlk aşamada B2C freemium ve B2B doğrulayıcı modeli birlikte değerlendirilebilir.

### B2C

- Ücretsiz kişisel kasa
- Premium yedekleme, gelişmiş paylaşım geçmişi, belge ekleri ve çoklu cihaz senkronizasyonu

### B2B

- Kurumlara doğrulanabilir bilgi talep ekranı
- İnsan kaynakları, klinik ön kabul, finansal uygunluk ve eğitim doğrulama paketleri
- Kurum paneli ve API erişimi

## 9. Go-To-Market Planı

### Aşama 1: Kapalı Beta

10-30 kullanıcıyla gerçek cihaz testi yapılır. Ana metrikler:

- Kasa tamamlama oranı
- İlk paylaşımı tamamlama oranı
- QR akış başarı oranı
- Kullanıcının akışı anlama süresi
- Destek ihtiyacı oluşturan ekranlar

### Aşama 2: Pilot Kurum

Bir okul, kulüp, küçük şirket veya klinik senaryosunda kontrollü pilot yapılır.

### Aşama 3: Public Launch

Gerçek hukuk metinleri, destek URL'leri, store metadata ve güvenlik testleri tamamlandıktan sonra public launch yapılır.

## 10. Başarı Metrikleri

- İlk oturumda en az 3 bilgi alanı doldurma
- Paylaşım öncesi açılacak bilgileri inceleme oranı
- Başarılı QR paylaşımı
- Kullanıcının yerel kasa silme/yedekleme süreçlerini anlaması
- Hassas bilgi paylaşımında açık onay oranı

## 11. Riskler ve Önlemler

| Risk | Önlem |
| --- | --- |
| Kullanıcı akışı karmaşık bulabilir | Sıradaki en iyi adım kartı, boş durumlar ve sade üç sekmeli mimari |
| Hukuki sorumluluk oluşabilir | Açık onay, veri silme süreci, hukukçu onayı gereksinimi |
| Telefon kaybında veri kaybı | Şifreli taşınabilir yedek |
| QR phishing riski | İmzalı istek kontrolü, risk bulguları, kullanıcı onayı |
| Blockchain'e veri yazma riski | Ham veri yerine hash tabanlı kanıt yaklaşımı |

## 12. Hocaya Anlatım

PISP'i şu cümleyle anlat:

"Bu uygulama kişisel veriyi merkezde toplamıyor; kullanıcının telefonunda tutuyor. Kullanıcı her bilgi grubunu kendisi yönetiyor, paylaşmadan önce hangi alanların açılacağını görüyor ve QR üzerinden açık onay veriyor. Blockchain yaklaşımı da ham veriyi zincire yazmak için değil, paylaşımın değiştirilemez kanıtını kişisel veri açmadan tutmak için kullanılıyor."

## 13. Canlıya Çıkmadan Önce Kapanması Gerekenler

- Gerçek gizlilik politikası, kullanım şartları, destek ve veri silme URL'leri
- Hukukçu KVKK/GDPR incelemesi
- İki fiziksel cihazla QR testleri
- iOS ve Android fiziksel cihaz regression testi
- Bağımsız mobil güvenlik incelemesi
- App Store / Google Play görselleri
- Kurum pilotu için doğrulayıcı paneli veya basit web alıcı ekranı
