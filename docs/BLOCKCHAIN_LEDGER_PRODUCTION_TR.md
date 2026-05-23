# PISP Production Blockchain / Ledger Mimarisi

Mevcut mobil uygulama yerel hash zinciri kullanır. Bu doğru bir başlangıçtır çünkü ham kişisel veriyi zincire yazmaz. Production seviyesinde hedef, kişisel veri değerlerini asla zincire koymadan doğrulanabilir paylaşım kanıtı üretmektir.

## Temel Kural

Zincire kişisel veri değil, yalnızca kanıt yazılır:

- Disclosure hash
- Policy hash
- Template ID
- Holder DID
- Recipient DID veya alıcı hash'i
- Zaman damgası
- Revocation reference

## Yazılmaması Gerekenler

- Ad soyad
- E-posta
- Telefon
- Sağlık bilgisi
- Finans bilgisi
- QR response içindeki disclosedClaims değerleri
- Recovery phrase veya private key

## Önerilen Fazlar

### Faz 1: Yerel Kanıt Zinciri

Mobil uygulamada mevcut hash chain kullanılır. Amaç, ürün akışını ve privacy modelini doğrulamaktır.

### Faz 2: Backend Proof Registry

Sunucu yalnızca hash ve policy metadata saklar. Kullanıcı veya kurum daha sonra paylaşımın yapıldığını doğrulayabilir.

### Faz 3: Anchored Ledger

Belirli aralıklarla proof registry root hash'i public veya consortium chain'e anchor edilir. Böylece maliyet düşer, kişisel veri riski azaltılır.

### Faz 4: Verifiable Credential Entegrasyonu

VC/SD-JWT-VC/BBS+ çıktıları ile seçici açıklama doğrulama katmanı eklenir.

## Zincir Seçimi

| Seçenek | Artı | Eksi |
|---|---|---|
| Public chain | Yüksek doğrulanabilirlik | Maliyet ve mahremiyet riski |
| Consortium chain | Kurumsal kontrol | Bağımsızlık daha zayıf |
| Backend hash registry | Basit ve ucuz | Tam decentralization sağlamaz |
| Periodic anchoring | Dengeli model | Ek mimari gerektirir |

## PISP İçin Öneri

v1 için public chain'e her paylaşımı yazmak doğru değildir. Önerilen yol:

1. Mobilde yerel hash chain
2. Backend proof registry
3. Günlük/haftalık Merkle root anchoring
4. Ham veriye sıfır tolerans

## Production Kabul Kriterleri

- Zincirde ham kişisel veri yok.
- Hash üretimi deterministik ve doğrulanabilir.
- Revocation kaydı tutulabiliyor.
- Kullanıcı paylaşım kanıtını dışarı aktarabiliyor.
- Maliyet modeli kullanıcı başına sürdürülebilir.
