# PISP Canliya Alma Hazirlik Notu

Bu uygulama artik demo veri gosteren bir prototip olmaktan cikti ve kullanici tarafinda gercek bilgi girisi yapilabilen local-first MVP seviyesine geldi.

## Su An Calisan Temel Urun

- Kullanici ilk acilista mahremiyet/onay ekranini gorur.
- Uygulama cihaz kilidi/biyometri ile acilir.
- Uygulama arka plana gidince vault tekrar kilitlenir.
- Kullanici 14 PISP domaini altinda kendi bilgilerini girebilir.
- Bilgiler cihazda sifreli yerel kasada saklanir.
- Policy toggle'lari hangi field'larin paylasilabilecegini belirler.
- QR request okutuldugunda sadece izin verilen field'lar response'a girer.
- QR request ve response payload'lari cihaz anahtariyla imzalanir.
- Gecersiz veya suresi gecmis QR request reddedilir.
- QR okutuldugunda response otomatik uretilmez; kullanici once talep eden DID'i, amaci, acilacak ve engellenecek alanlari gorur.
- Paylasimdan once acik onay/risk ekrani gosterilir.
- Activity icinde Security Center bulunur.
- Ledger, ham veri yerine hash kanitlarini tutar.
- Minimum disclosure ve ODRL/DPV policy preview uretilir.

## Canli Urun Icin Eksik Kalan Kritik Isler

Bu maddeler tamamlanmadan uygulamayi genis kitleye acmak risklidir:

- App Store / Google Play privacy policy ve terms metinleri.
- KVKK/GDPR acik riza ve aydinlatma metni.
- Secure backup ve cihaz kaybi senaryosu.
- DID key recovery stratejisi.
- Abuse prevention: spam request, phishing QR, sahte requester DID.
- Penetration test ve mobile security review.
- DPIA: Data Protection Impact Assessment.
- Kullanici destek ve veri silme sureci.

## Canliya Cikmadan Once Mutlaka Yapilacak Dis Inceleme

- KVKK/GDPR hukuk incelemesi
- App Store privacy nutrition label incelemesi
- Mobile security review
- QR phishing/threat model testi
- 20-50 kisilik kapali beta

## Kapali Beta Icin Kabul Kriteri

- Uygulama kilidi fiziksel cihazda test edilmeli.
- Kamera izni ve QR tarama akisi iOS/Android'de test edilmeli.
- Imzali QR request-response uyumu iki cihazla test edilmeli.
- Ozel kategori veri paylasiminda explicit consent dogrulanmali.
- Uygulama arka plandayken ekran goruntusu/veri gorunurlugu incelenmeli.
- Privacy policy ve terms linkleri final metinlerle uygulamaya eklenmeli.

## Go / No-Go Matrisi

| Alan | Durum | Not |
|---|---|---|
| Local encrypted vault | GO | Cihazda sifreli saklama mevcut. |
| App lock | GO | Biyometri/cihaz kilidi akisi mevcut. |
| Background lock | GO | Uygulama arka plana gidince kilitlenir. |
| Signed QR exchange | GO | Request/response imzalanir ve request dogrulanir. |
| Explicit consent | GO | Paylasim oncesi onay gerekir. |
| Hash-only ledger | GO | Ham veri zincire yazilmaz. |
| Store build config | GO | EAS production profilleri mevcut. |
| Privacy policy | NO-GO | Taslak var, hukukcu onayi ve public URL gerekir. |
| Terms of service | NO-GO | Taslak var, hukukcu onayi ve public URL gerekir. |
| Data deletion process | NO-GO | Taslak var, operasyonel surec gerekir. |
| Security review | NO-GO | Dis mobil guvenlik incelemesi gerekir. |
| Physical device beta | NO-GO | Iki cihazli QR ve biyometri testi gerekir. |

Public launch karari icin tum NO-GO satirlari kapatilmalidir.

## Dogru Startup Pozisyonu

PISP'in iddiasi "verileri bizde saklayalim" degildir. Dogru iddia:

**Kullanici verisini kendi cihazinda/kasasinda tutar; PISP sadece policy, template, verification ve kanit katmanini saglar.**

Bu, hukuki ve ticari olarak daha guvenli bir yoldur.
