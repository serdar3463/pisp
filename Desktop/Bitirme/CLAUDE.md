# PISP Mobile — Developer Guide

## Quick Start

```bash
nvm use 20        # Node 20 zorunlu — ESLint v9, expo 54, jest-expo 54 gerektirir
npm install
npm run start
```

> **Önemli:** Sistem Node'u (v14) kullanılırsa ESLint ve Jest hata verir. `nvm use 20` çalıştırmadan önce devam etme.

## Commands

| Komut | Açıklama |
|-------|----------|
| `npm start` | Expo geliştirme sunucusu |
| `npm run ios` | iOS simülatörde aç |
| `npm run android` | Android emülatörde aç |
| `npm run typecheck` | TypeScript kontrol |
| `npm run lint` | ESLint kontrol |
| `npm run lint:fix` | ESLint otomatik düzeltme |
| `npm run format` | Prettier formatla |
| `npm test` | Jest testleri (node_modules/jest/bin/jest.js ile çalışır) |
| `npm run test:invariants` | Ürün değişmezleri testi |
| `npm run release:check` | Tüm kontroller (typecheck + lint + test) |

## Architecture

```
App.tsx              — Root: state, navigation, handlers, onboarding wizard
assets/              — icon.png, adaptive-icon.png, splash.png, favicon.png
src/
  components/
    VaultModule.tsx      — Kasa modülü (bilgi girişi, domain toggle)
    ShareModule.tsx      — Paylaşım modülü (QR, şablon seçimi, kamera)
    SettingsModule.tsx   — Ayarlar (yedek, geçmiş, yasal/KVKK merkezi)
    ErrorBoundary.tsx    — Global hata yakalayıcı
    ui/                  — Atom components (Badge, Button, Card, StatCard, Toast, vs.)
  data/
    pisp.ts              — Domain modeli (14 domain, 5 şablon, 50+ alan)
    legal.ts             — Yasal bağlantılar (Gizlilik, KVKK, Şartlar, Destek)
    receipts.ts          — ShareReceipt tipi
    informationArchitecture.ts — Onboarding ve rehber içerikleri
    productReadiness.ts  — Güven kontrolleri ve skor
  hooks/
    useToast.ts          — Auto-dismiss toast hook
    useVaultStats.ts     — Memoized vault istatistikleri
  services/
    privateVaultStorage.ts — AES şifreli AsyncStorage vault
    appLock.ts             — Biyometrik kilitleme
    deviceIdentity.ts      — DID + EdDSA imzalama
    qrExchange.ts          — QR istek/yanıt protokolü
    sovereigntyLedger.ts   — Hash-only egemenlik defteri
    portableBackup.ts      — Şifreli taşınabilir yedek
    errorTracking.ts       — Hata izleme (Sentry ready)
  utils/
    helpers.ts       — Pure fonksiyonlar (validate, calculate, vs.)
  __tests__/         — Jest unit testleri (23 test)
  theme.ts           — Renk paleti, tipografi, spacing, radius
```

## Key Design Principles

1. **Local-first**: Kişisel veri hiçbir zaman sunucuya gitmez
2. **Consent-first**: Paylaşımdan önce 3 adımlı onboarding + açık onay switch'i zorunlu
3. **Hash-only ledger**: Egemenlik defteri ham veri içermez, yalnızca SHA-256 hash
4. **Default closed**: Özel nitelikli veriler (sağlık, biyometrik) varsayılan OFF
5. **Minimum disclosure**: Şablon + izin kesişimi — fazlası asla paylaşılmaz

## Production Deployment

### Ön Gereksinimler (Canlıya Almadan Önce)

1. **EAS Project ID** — `eas init` komutu çalıştır, `app.json` içindeki `"YOUR_EAS_PROJECT_ID"` gerçek ID ile değiştir
2. **Domain** — `pisp.app` üzerinde `/privacy`, `/terms`, `/kvkk`, `/delete-data` sayfaları yayında olmalı
3. **Destek e-postası** — `destek@pisp.app` adresi aktif olmalı
4. **Expo Account** — EAS Build için `eas login` ile giriş yapılmış olmalı

### EAS Build

```bash
# İlk kurulum (bir kez)
npx eas init
npx eas build:configure

# Preview build (test dağıtımı)
npm run build:android
npm run build:ios

# Production build (mağaza)
eas build --platform all --profile production

# Mağazaya gönder
npm run submit:ios
npm run submit:android
```

### Environment Setup

```bash
cp .env.example .env
# .env: Sentry DSN, analytics key (isteğe bağlı)
```

### Required Secrets (GitHub Actions)

- `EXPO_TOKEN`: EAS erişim tokeni
- `APPLE_APP_SPECIFIC_PASSWORD`: App Store submit için

## Testing

```bash
# Tüm testler (Node 20 ile çalışır)
npm test

# Sadece bir test dosyası
node node_modules/jest/bin/jest.js src/__tests__/helpers.test.ts

# Coverage raporu
node node_modules/jest/bin/jest.js --coverage

# Ürün değişmezleri
npm run test:invariants
```

## Security

- Vault verisi AES ile şifrelenir (expo-secure-store'dan türetilen 32-byte anahtar)
- QR payload'ları EdDSA (TweetNaCl) ile imzalanır
- Uygulama arka plana geçince otomatik kilitlenir
- Yedek parolası min. 12 karakter zorunlu
- Egemenlik defteri hash-only — ham veri asla yazılmaz
- KVKK Md. 5/1 + GDPR Art. 5 uyumlu

## Known Limitations (v1.0)

- Anahtar rotasyonu yok — cihaz değişimi = yeni kasa (yedek ile geri yükle)
- QR payload boyutu büyük vault'larda sınırlanabilir (~2KB limit)
- Çevrimdışı-first; bulut senkronizasyonu yok (by design)
