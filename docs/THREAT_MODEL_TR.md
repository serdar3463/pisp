# PISP Tehdit Modeli

Bu belge PISP'in kişisel bilgi yönetimi, izin politikası ve QR aktarım akışındaki temel riskleri listeler.

## Korunacak Varlıklar

- Kullanıcının ham kişisel bilgileri
- Yerel kasa şifreleme anahtarı
- Cihaz DID anahtarı
- İzin politikası
- QR istek ve yanıt payload'ları
- Kanıt zinciri hash kayıtları

## Güven Sınırları

- Kullanıcı cihazı güvenilir alan kabul edilir, ancak cihaz kaybı ve kötü amaçlı uygulamalar risk olarak kalır.
- QR isteyen karşı taraf güvenilir kabul edilmez; imza, süre ve amaç kontrolü gerekir.
- Kanıt zinciri ham kişisel veri içermemelidir.
- Hukuki metinler ve destek URL'leri gerçek şirket altyapısı ile tamamlanmalıdır.

## Ana Riskler

| Risk | Etki | Önlem |
|---|---|---|
| Sahte QR isteği | Kullanıcı yanlış alıcıya veri açabilir | İmza doğrulama, DID gösterimi, amaç/alıcı inceleme |
| QR phishing | Kullanıcı meşru görünen isteğe onay verebilir | Açık onay ekranı, alıcı adı, istek süresi ve alan listesi |
| Cihaz kaybı | Yerel kasa erişimi riske girer | Biyometri/parola, arka planda kilit, yerel silme |
| Anahtar kaybı | Kullanıcı kanıt kimliğini kaybedebilir | v1 sonrası recovery stratejisi |
| Fazla veri paylaşımı | KVKK/GDPR riski | Minimum disclosure, field-level toggle, özel veri varsayılan kapalı |
| Zincire veri yazılması | Geri alınamaz mahremiyet ihlali | Sadece hash ve politika metaverisi |
| Hukuki metin eksikliği | Yayın ve sorumluluk riski | Hukukçu onaylı KVKK/GDPR metinleri |

## v1.0 Öncesi Zorunlu Testler

- Sahte QR payload testi
- Süresi geçmiş QR isteği testi
- İzin kapalıyken paylaşım reddi testi
- Özel nitelikli veri açık onay testi
- Arka plana alınca kilit testi
- Yerel kasa silme testi
- İki fiziksel cihazla QR request-response testi
