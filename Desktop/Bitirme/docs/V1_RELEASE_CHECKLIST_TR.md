# PISP v1.0 Yayın Kontrol Listesi

Bu liste uygulamayı bitirme projesi demosundan gerçek kapalı beta ürününe taşımak için kullanılmalıdır.

## Ürün ve UX

- [ ] İlk açılış akışı fiziksel cihazda test edildi.
- [ ] Kasa, Politika, Aktarım, Kanıt ve Güvenlik modülleri kullanıcı testiyle doğrulandı.
- [ ] Boş durumlar, hata durumları ve izin reddi durumları anlaşılır metinlerle gösteriliyor.
- [ ] Tarih, sayı, e-posta ve telefon alanları hatalı girişlerde uyarı gösteriyor.
- [ ] Hassas veri paylaşımında açık onay metni okunabilir ve kullanıcıya net.
- [ ] Teknik JSON/ODRL çıktıları normal kullanıcıdan gizli, isteğe bağlı açılıyor.
- [ ] Kullanım limiti dolan paylaşım paketi tekrar paylaşılamıyor.
- [ ] Şifreli yedek oluşturma ve geri yükleme fiziksel cihazda test edildi.
- [ ] Uygulama dili tamamen Türkçe ve tutarlı.

## Güvenlik

- [ ] Uygulama kilidi iOS ve Android fiziksel cihazda test edildi.
- [ ] Arka plana alınca otomatik kilitlenme doğrulandı.
- [ ] Yerel kasa silme akışı doğrulandı.
- [ ] QR isteği imza doğrulaması iki cihazla test edildi.
- [ ] Süresi geçmiş veya sahte QR isteği reddediliyor.
- [ ] QR phishing senaryoları tehdit modeline işlendi.
- [ ] Cihaz kaybı ve anahtar kurtarma stratejisi belirlendi.
- [ ] Yedek parolası kaybolduğunda kasanın kurtarılamayacağı kullanıcıya açıkça anlatılıyor.

## Hukuk ve Uyumluluk

- [ ] KVKK aydınlatma metni hukukçu tarafından onaylandı.
- [ ] GDPR açık rıza dili hukukçu tarafından onaylandı.
- [ ] Gizlilik politikası gerçek public URL olarak yayında.
- [ ] Kullanım şartları gerçek public URL olarak yayında.
- [ ] Veri silme talebi süreci gerçek operasyonla çalışıyor.
- [ ] App Store / Google Play gizlilik etiketleri hazır.

## Mağaza ve Dağıtım

- [ ] App icon ve splash screen final.
- [ ] `app.json` içindeki placeholder URL'ler değiştirildi.
- [ ] Android preview APK fiziksel cihazda kuruldu.
- [ ] iOS TestFlight veya development build fiziksel cihazda test edildi.
- [ ] Crash/error reporting kararı verildi.
- [ ] `npm run check` temiz.
- [ ] EAS production build alındı ve arşivlendi.

## Go / No-Go

Kapalı beta için güvenlik, hukuk ve iki cihaz QR testindeki tüm kritik maddeler kapanmadan dış kullanıcıya açılmamalıdır.
