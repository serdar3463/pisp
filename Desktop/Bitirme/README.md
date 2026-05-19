# PISP Mobile

PISP Mobile, kişisel bilgi egemenliği için hazırlanmış local-first mobil uygulamadır. Amaç, kullanıcının kendi bilgilerini tek yerden yönetmesi, hassas alanları kontrol etmesi ve karşı tarafa yalnızca gerekli minimum bilgiyi veya kanıtı paylaşmasıdır.

## Ürün Katmanları

- Şifreli yerel kişisel bilgi kasası
- 14 PISP veri alanına göre düzenlenmiş profil modeli
- Alan ve veri bazlı izin yönetimi
- Özel nitelikli veriler için varsayılan kapalı politika
- Şablon bazlı minimum açıklama paylaşımı
- İmzalı QR istek/yanıt protokolü
- Paylaşım öncesi açık onay ve risk özeti
- Ham veri yazmayan hash tabanlı kanıt zinciri
- Güven merkezi ve bilgi yönetim akışı
- ODRL/DPV ve VC uyumlu teknik kanıt paketleri

## Uygulama Mimarisi

- `Kasa`: 14 PISP veri alanı, alan/kategori/kayıt/öznitelik düzeyi izinler ve şifreli yerel saklama
- `Politika`: amaç, alıcı, süre, kullanım limiti, minimum açıklama ve ODRL/DPV uyumlu paylaşım paketi
- `Aktarım`: kişiden kişiye imzalı QR istek/yanıt, DID benzeri cihaz kimliği ve kullanıcı onayı
- `Kanıt`: ham veri yazmayan hash zinciri, politika izi ve işlem geçmişi
- `Güvenlik`: cihaz kilidi, şifreli yedekleme, veri silme, hukuk paketi ve canlıya alma kontrolleri

Bu mimari klasik alt sekme yapısı yerine tek bir güvenli çalışma alanı ve modül kartları kullanır. Proje raporundaki PISP katmanları doğrudan ürün omurgasına taşınır: veri taksonomisi, bağlamsal erişim politikası, SSI/QR aktarım, blockchain/ledger kanıtı ve production güvenlik-hukuk hazırlığı ayrı ürün alanlarıdır.

## Güvenlik Yaklaşımı

PISP'in ana pozisyonu şudur:

**Kullanıcı verisi kullanıcıda kalır; PISP yalnızca politika, şablon, doğrulama ve kanıt katmanını sağlar.**

Mevcut uygulamada:

- Kasa cihazda şifreli saklanır.
- Uygulama cihaz kilidi/biyometri ile açılır.
- Uygulama arka plana gidince kasa otomatik kilitlenir.
- QR istekleri imza, süre ve DID bilgisiyle kontrol edilir.
- Yanıt QR'ı kullanıcı açık onay vermeden üretilmez.
- Kayıt zincirinde kişisel veri değeri tutulmaz.

## Çalıştırma

Node 20 kullan:

```sh
nvm install
nvm use
node -v
```

Beklenen sürüm:

```sh
v20.19.4
```

Bağımlılıkları kur:

```sh
npm install
```

Expo'yu başlat:

```sh
npm run start -- --port 8081
```

Tip kontrolü:

```sh
npm run check
```

Kod ve ürün invariant kontrolü:

```sh
npm run release:check
```

Kapalı beta build'i öncesi kontrol:

```sh
npm run beta:check
```

Mağaza/public launch öncesi bloklayıcı kontrolü:

```sh
npm run launch:check
```

`launch:check`, placeholder hukuk/destek URL'leri gibi gerçek yayında kalmaması gereken maddeleri bilerek bloklar.

Gerçek production domain hazır olduğunda URL'leri otomatik doldur:

```sh
npm run configure:production -- --base-url=https://senin-domainin.com
npm run launch:check
```

Canlıya alma adımları için [docs/LAUNCH_RUNBOOK_TR.md](docs/LAUNCH_RUNBOOK_TR.md) dosyasını takip et.

## Canlıya Alma Durumu

Geniş kitleye açmadan önce şu maddeler tamamlanmalıdır:

- KVKK/GDPR hukuk incelemesi
- Gizlilik politikası ve kullanım şartları için gerçek public URL
- App Store / Google Play gizlilik etiketleri
- Fiziksel cihazlarda iki telefonlu QR testi
- Mobil güvenlik incelemesi
- QR phishing ve sahte requester DID testleri
- Kullanıcı destek ve veri silme operasyonu

## Production Build

```sh
npm run build:ios
npm run build:android
```

Mağaza gönderimi:

```sh
npm run submit:ios
npm run submit:android
```

Gönderimden önce `STORE_SUBMISSION_CHECKLIST.md`, `legal/` altındaki taslaklar ve `app.json` içindeki URL alanları gerçek bilgilerle tamamlanmalıdır.
