# PISP Canlıya Alma Runbook

## 1. Kod Kontrolü

```sh
nvm use
npm install
npm run release:check
```

## 2. Kapalı Beta Kontrolü

```sh
npm run beta:check
```

Kapalı beta, gerçek public URL'ler hazır değilken iç test build'i almak için kullanılabilir. Kullanıcı verisi hassas olduğu için beta katılımcıları kontrollü seçilmelidir.

## 3. Production URL Yapılandırması

Gerçek domain hazır olduğunda:

```sh
npm run configure:production -- --base-url=https://your-domain.com
npm run launch:check
```

Bu komutlar şu URL'leri bekler:

- `/privacy`
- `/terms`
- `/delete-data`
- `/support`

## 4. EAS Build

```sh
npm run build:ios
npm run build:android
```

## 5. Mağaza Gönderimi

```sh
npm run submit:ios
npm run submit:android
```

## 6. Go / No-Go

Public launch için aşağıdaki maddeler kapanmadan dış kullanıcıya açılmamalıdır:

- Hukukçu onaylı KVKK/GDPR metinleri
- Gerçek privacy/support/delete-data URL'leri
- İki fiziksel cihaz QR testi
- Biyometrik kilit ve arka plan kilidi testi
- Yerel silme ve yedek geri yükleme testi
- Mobil güvenlik incelemesi
- App Store / Google Play privacy label doğrulaması

## 7. Rollback

Kritik güvenlik veya veri kaybı şüphesinde:

1. Yeni build dağıtımı durdurulur.
2. Store release staged rollout ise duraklatılır.
3. Kullanıcılara kasayı kilitleme ve paylaşım izinlerini kapatma yönlendirmesi yapılır.
4. Incident response planı işletilir.
