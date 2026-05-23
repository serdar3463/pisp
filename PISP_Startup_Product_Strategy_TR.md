# PISP Startup Urun Stratejisi

Bu dokuman, PISP mobil uygulamasinin bitirme projesi demosundan startup MVP'sine nasil konumlandirilacagini ozetler.

## 1. Urun Tezi

PISP, kullanicinin kisisel verisini merkezi platformlara teslim etmeden, amaca gore minimum veriyle paylasmasini saglayan bir personal information sovereignty platformudur.

Urunun ana farki sadece "veri kasasi" olmasi degildir. PISP'in savunulabilir tarafi uc katmandan gelir:

- 14 alanli ontoloji tabanli kisisel veri modeli.
- ODRL/DPV uyumlu makine-okunur izin ve politika motoru.
- Sablon pazari ile somut kullanim senaryolari: IK, klinik, finans, EUDI bridge.

## 2. Ilk Pazar Girisi

PISP'in dogrudan tum tuketicilere "gizlilik uygulamasi" olarak satilmasi zordur. Raporun da belirttigi gibi kullanicilar soyut gizlilik vaadi yerine pratik faydaya tepki verir. Bu nedenle ilk pazar girisi su sekilde olmalidir:

1. IK ve kariyer dogrulama
2. Klinik on kabul ve saglik veri paylasimi
3. Finansal uygunluk/proof paylasimi
4. EUDI Wallet uyumlu attribute bridge

Bu senaryolar kullaniciya somut fayda verir: CV bilgisi, saglik ozeti veya finansal uygunluk iddiasi paylasilir; gereksiz veri acilmaz.

## 3. MVP Kapsami

Mevcut mobil MVP su startup hipotezlerini gosterir:

- Kullanici verilerini PISP domainlerine gore gorebilir.
- Hassas ve ozel kategori veriler varsayilan olarak kapali tutulur.
- Kullanici domain ve attribute seviyesinde izin verebilir.
- Sablon secildiginde sadece izin verilen field'lar minimum disclosure olarak cikar.
- Paylasim karari audit log'a yazilir.
- Her paylasim icin ODRL/DPV benzeri policy agreement uretilir.

Bu, hocaya teknik uygunluk; potansiyel yatirimciya ise platform vizyonu gosterir.

## 4. Savunulabilirlik

PISP'in rakiplerden ayrildigi yerler:

- Solid gibi sadece pod/data store degil; attribute-level template sharing sunar.
- EUDI Wallet gibi sadece resmi kimlik cuzdani degil; 14 domainli genel veri egemenligi modeli sunar.
- LinkedIn gibi merkezi profil degil; kullanici kontrollu profesyonel veri paylasimi sunar.
- Consent management araclari gibi sadece izin formu degil; policy + data + template katmanini birlikte yurutur.

## 5. Teknik Yol Haritasi

### Faz 1: Mobil MVP

- Veri kasasi
- Policy toggle
- Minimum disclosure preview
- Audit log
- ODRL/DPV policy preview

### Faz 2: Guvenli Yerel Urun

- SecureStore tabanli anahtar saklama
- Uygulama seviyesinde sifreli local storage
- PIN/biyometri kilidi
- Sifreli export/import

### Faz 3: SSI ve Credential Katmani

- did:key olusturma
- VC JSON-LD uretimi
- 18+ selective disclosure PoC
- BBS+ ve SD-JWT-VC karsilastirmasi

### Faz 4: PII Detection ve Otomatik Siniflandirma

- Presidio/spaCy tabanli PII detection servisi
- Turkce ve Ingilizce ornek setleri
- Tespit edilen veriyi D-01...D-14 domainlerine onerme

### Faz 5: B2D Platform

- Policy evaluation API
- Template render API
- JSON-LD/vCard/FHIR export API
- HR, klinik ve finans uygulamalari icin ornek entegrasyon

## 6. Demo Anlatim Akisi

Sunumda onerilen akis:

1. Home ekraninda PISP'in amacini anlat: "Share the proof, not the whole person."
2. Vault ekraninda 14 domain ve GDPR/standart eslesmelerini goster.
3. Policy ekraninda ozel kategori verinin default kapali oldugunu goster.
4. Share ekraninda Hiring Snapshot veya Clinic Intake sec.
5. Minimum disclosure JSON-LD ve ODRL/DPV policy agreement'i goster.
6. Share butonuna bas ve Log ekraninda audit trail'i goster.
7. Startup acisindan bunun ileride API platformuna donusecegini anlat.

## 7. Kisa Pitch

PISP, kisilerin verilerini merkezi platformlara teslim etmeden, amaca uygun minimum bilgiyle dogrulanabilir sekilde paylasmasini saglayan bir personal data sovereignty platformudur. Ilk urun mobil uygulama olarak calisir; uzun vadede IK, saglik, finans ve EUDI uyumlu uygulamalar icin policy engine ve template API altyapisi sunan B2D platforma donusur.

