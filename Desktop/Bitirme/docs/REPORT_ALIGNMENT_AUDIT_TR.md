# PISP Rapor Uygunluk Analizi

Bu doküman, mobil uygulama mimarisinin proje raporundaki amaç, yöntem ve teknoloji başlıklarıyla nasıl eşleştiğini gösterir. Amaç, backlog veya ekranların ezberden değil, rapordaki PISP modelinden üretildiğini izlenebilir hale getirmektir.

## Yönetici Özeti

Uygulama mimarisi beş ana ürün alanına ayrıldı:

- `Kasa`: kullanıcının kişisel bilgilerini 14 PISP alanına göre cihazında yönetmesi.
- `Politika`: erişimin amaç, alıcı, süre, kullanım limiti ve veri minimizasyonu ile sınırlandırılması.
- `Aktarım`: iki kişi arasında QR üzerinden imzalı bilgi isteği ve kontrollü yanıt oluşturulması.
- `Kanıt`: kişisel veri yazmadan hash tabanlı kayıt ve politika izi tutulması.
- `Güvenlik`: cihaz kilidi, yedekleme, veri silme, hukuk ve canlıya alma hazırlığı.

Bu ayrım, rapordaki kişisel bilgi egemenliği, privacy-by-design, SSI/VC, ODRL/DPV ve blockchain kanıt katmanlarını ana navigasyona taşır.

## Fit Analizi

| Rapor ihtiyacı | Uygulamadaki karşılık | Durum |
| --- | --- | --- |
| 14 alanlı kişisel veri taksonomisi | `src/data/pisp.ts` içindeki `pispDomains` ve `Kasa` ekranı | Uyumlu |
| Beş katmanlı erişim kontrolü | Alan, kategori, kayıt, öznitelik ve bağlam kontrolleri; `src/data/informationArchitecture.ts` | Uyumlu |
| Amaç/alıcı/süre/kullanım limiti | `PolicyContext`, paylaşım öncesi risk ve kullanım limiti kontrolü | Uyumlu |
| Veri minimizasyonu | Şablon ve izin kesişimiyle sadece gerekli alanların açıklanması | Uyumlu |
| ODRL/DPV politika gösterimi | `createOdrlPolicy` ile teknik politika paketinin üretimi | MVP uyumlu |
| SSI/VC yönelimi | QR aktarımında imzalı istek/yanıt, cihaz kimliği ve doğrulama paketi | MVP uyumlu |
| Blockchain yaklaşımı | Ham veri içermeyen yerel hash zinciri ve kanıt kaydı | MVP uyumlu |
| Ham kişisel verinin zincire yazılmaması | Ledger yalnızca hash, politika izi ve alan kimliği tutar | Uyumlu |
| Kullanıcı onayı | QR yanıtı ve paylaşım paketi kullanıcı onayı olmadan üretilmez | Uyumlu |
| Hukuki şeffaflık | KVKK/GDPR taslakları, açık rıza ve veri silme dokümanları | Hukuk onayı bekler |
| Telefon değişimi ve veri sürekliliği | Parola ile şifrelenmiş taşınabilir yedek paketi | MVP uyumlu |
| Canlı ürün güvenliği | Threat model, QR test planı, release checklist, security review backlog'u | İnceleme bekler |

## Gap Analizi

Canlı startup ürünü için aşağıdaki işler uygulama içinde konumlandırıldı ancak dış doğrulama gerektirir:

- Bağımsız mobil güvenlik incelemesi.
- KVKK/GDPR hukukçu onayı ve gerçek şirket bilgileriyle yayınlanmış metinler.
- Üretim seviyesinde DID/VC sağlayıcı veya doğrulanabilir kimlik altyapısı.
- Yerel hash zincirinin production blockchain, timestamping veya notarization servisine bağlanması.
- E2E test altyapısı, iki fiziksel cihaz QR testi ve mağaza öncesi regression seti.
- Kullanıcı destek operasyonu, veri silme talebi süreci ve incident response planı.

## Mimari Karar

PISP canlıya çıkmadan önce ham kişisel veri backend'e veya blockchain'e yazılmamalıdır. Uygulama, kullanıcı verisini cihazda tutar; dış sistemlere yalnızca izin, hash, doğrulama izi veya kullanıcının açıkça onayladığı minimum açıklama paketi çıkar.

Bu karar rapordaki kişisel bilgi egemenliği hedefiyle uyumludur ve startup ürünü için güven, hukuk ve ölçeklenebilirlik risklerini azaltır.
