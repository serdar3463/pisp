# PISP QR ile Kisi-Kisi Veri Aktarim Akisi

Bu dokuman PISP mobil uygulamasinda iki kisinin birbirinden bilgi istemesi ve paylasmasi icin kullanilan QR tabanli akisi aciklar.

## Temel Ilke

PISP'te bilgi isteyen taraf ham veriye dogrudan erisemez. Once ne istedigini, hangi amacla istedigini ve hangi alanlari talep ettigini belirten bir QR request olusturur. Bilgiyi verecek kisi bu QR'i okutur. Uygulama, istegi kullanicinin yerel policy ayarlariyla karsilastirir ve sadece izin verilen minimum veri setini response olarak uretir.

## Akis

1. Kisi A uygulamada bir template secer.
   - Hiring Snapshot
   - Clinic Intake
   - Finance Proof
   - EUDI Bridge
   - Sovereign Contact Card

2. Kisi A'nin uygulamasi request QR uretir.
   - requestId
   - requesterDid
   - templateId
   - purpose
   - recipient
   - requestedFieldIds
   - expiresAt
   - nonce

3. Kisi B bu QR'i kendi uygulamasinda okutur.

4. Kisi B'nin uygulamasi istegi kendi local policy ayarlariyla karsilastirir.
   - Domain kapaliysa veri paylasilmaz.
   - Field kapaliysa veri paylasilmaz.
   - Ozel kategori veri default kapali kalir.
   - Sadece izin verilen alanlar disclosure response'a girer.

5. Kisi B'nin uygulamasi response QR uretir.
   - requestId
   - holderDid
   - disclosureHash
   - disclosedClaims
   - withheldCount
   - policy summary

6. Kisi A response QR'i okutarak izin verilen bilgiye ulasir.

## Kisisel Veri Guvenligi

Bu akista PISP sirketinin ham veriyi gormesi gerekmez. Veri transferi kullanicilar arasinda olur. PISP'in uzun vadeli mimarisinde sunucu sadece su rolleri ustlenebilir:

- DID/public key discovery
- Template catalog
- Revocation registry
- Optional hash anchoring
- Abuse/rate-limit mekanizmalari

Ham kisisel veri sunucuya zorunlu olarak gitmez.

## Mevcut Uygulamadaki PoC

Uygulamada `QR` sekmesi su an uc asamayi gosterir:

1. Request QR olusturma
2. Kamera ile PISP request QR okutma
3. Local policy sonucunda response QR ve disclosure JSON uretme

Demo icin `Demo scan` butonu da vardir. Bu, iki cihaz olmadan ayni akisi gostermeyi saglar.

## Startup Degeri

Bu ozellik PISP'i basit bir veri kasasindan cikarir. Uygulama gercek dunyada su senaryolari destekleyebilir:

- Bir isveren adaydan sadece CV ve skill proof ister.
- Bir klinik hastadan sadece on kabul icin gerekli saglik alanlarini ister.
- Bir finans kurumu kullanicidan sadece eligibility proof ister.
- Bir etkinlikte iki kisi contact card bilgilerini minimum disclosure ile paylasir.

PISP'in degeri, "tum profili gonder" yerine "amac icin gereken minimum kaniti gonder" modelidir.

