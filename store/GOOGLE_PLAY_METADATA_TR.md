# PISP Google Play Metadata

## Uygulama Adı

PISP

## Kısa Açıklama

Kişisel bilgilerini cihazında yönet, izin ver, QR ile minimum bilgi paylaş.

## Uzun Açıklama

PISP, kullanıcıların kişisel bilgilerini kendi cihazlarında yönetmesi için tasarlanmış bir kişisel bilgi kasasıdır. Uygulama, paylaşım öncesinde hangi bilginin hangi amaçla ve kiminle paylaşılacağını açıkça gösterir.

Kullanıcı verisi local-first yaklaşımla cihazda tutulur. QR ile gelen bilgi istekleri cihazda doğrulanır; kullanıcı onay vermeden yanıt oluşturulmaz. Paylaşım geçmişi, ham kişisel veri içermeyen hash kayıtlarıyla izlenebilir hale getirilir.

PISP'in amacı, kişisel bilgi yönetimini sadeleştirmek ve kullanıcının veri üzerinde karar sahibi olmasını sağlamaktır.

## Özellikler

- 14 kişisel bilgi alanı
- Alan ve öznitelik bazlı izin yönetimi
- Amaç ve alıcı kontrollü paylaşım
- QR tabanlı istek ve yanıt akışı
- Açık onay ekranı
- Veri minimizasyonu
- Yerel hash kanıt zinciri
- Şifreli yedekleme
- Hukuk ve veri silme hazırlık merkezi

## Veri Güvenliği Beyanı

Uygulama ham kişisel bilgileri kendi sunucusuna göndermek zorunda değildir. Kullanıcının girdiği bilgiler cihazdaki yerel kasada saklanır. QR paylaşımı kullanıcı onayıyla ve minimum bilgi prensibiyle yapılır.

## Test Notları

QR aktarımı için kamera izni gerekir. Uygulama içindeki örnek profil ve "Test et" düğmesi mağaza incelemesi sırasında temel akışları doğrulamak için kullanılabilir.
