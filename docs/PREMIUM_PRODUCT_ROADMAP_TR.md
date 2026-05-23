# PISP Premium Ürün Roadmap

Bu roadmap uygulamayı bitirme projesinden startup ürününe taşımak için önceliklendirilmiş geliştirme planıdır.

## Hemen Eklenebilecek Ürün Özellikleri

### 1. Akıllı Kasa Tamamlama

Kullanıcıya hangi bilgi gruplarının eksik olduğunu ve hangi paylaşım tipleri için gerekli olduğunu gösterir.

Değer: Kullanıcı ne dolduracağını bilir, uygulama boş görünmez.

### 2. Paylaşım Makbuzu

Her paylaşım sonunda kullanıcıya sade bir makbuz gösterilir:

- Kime paylaşıldı
- Hangi amaçla paylaşıldı
- Hangi bilgiler açıldı
- Hangi bilgiler gizli kaldı
- Kayıt izi

Değer: Güven hissi ve KVKK/GDPR şeffaflığı artar.

### 3. Alıcı Güven Kontrolü

QR isteği geldiğinde alıcı adı, amaç, istenen bilgi sayısı ve risk seviyesi daha görünür bir kartta gösterilir.

Değer: QR phishing riskini azaltır.

### 4. Belge ve Dosya Kasası

Kullanıcı kimlik fotoğrafı, diploma, sertifika veya sağlık belgesi gibi dosyaları yerel kasaya ekleyebilir.

Değer: Uygulama yalnızca form alanı değil, gerçek kişisel bilgi kasası olur.

### 5. Kurum Alıcı Ekranı

Karşı taraf için basit bir web ekranı:

- Bilgi talebi oluştur
- QR üret
- Kullanıcının QR yanıtını oku
- Sadece izinli bilgiyi görüntüle

Değer: Startup ürünü iki taraflı pazara yaklaşır.

## v1.0 Öncelikleri

| Öncelik | Özellik | Neden |
| --- | --- | --- |
| P0 | Gerçek hukuk ve destek URL'leri | Public launch için zorunlu |
| P0 | İki cihaz QR testi | Ana değer önerisinin kanıtı |
| P0 | Paylaşım makbuzu | Güven ve şeffaflık |
| P1 | Akıllı kasa tamamlama | Kullanıcı aktivasyonu |
| P1 | Kurum alıcı ekranı | Startup gelir modeli |
| P1 | Güvenlik review | Hassas veri ürünü için şart |
| P2 | Bulut yedekleme stratejisi | Çoklu cihaz ve retention |
| P2 | Production ledger entegrasyonu | Dış doğrulama |
| P2 | Analytics, privacy-safe | Ürün metrikleri |

## 30 Günlük Plan

### Hafta 1

- Kullanıcı akışı fiziksel cihazda test edilir.
- Boş durumlar, form açıklamaları ve paylaşım makbuzu tamamlanır.
- Store metadata ve ekran görüntüleri hazırlanır.

### Hafta 2

- İki cihaz QR akışı test edilir.
- Hukuki metinler gerçek şirket/destek bilgileriyle güncellenir.
- İlk kapalı beta kullanıcıları belirlenir.

### Hafta 3

- Kurum alıcı ekranı prototipi hazırlanır.
- Güvenlik checklist uygulanır.
- Kritik crash/error senaryoları temizlenir.

### Hafta 4

- TestFlight / Google Play Internal Testing build alınır.
- Beta geri bildirimleri toplanır.
- Public launch kararı için readiness raporu çıkarılır.

## 90 Günlük Plan

- Kurum pilotu
- Premium yedekleme ve recovery modeli
- Production DID/VC veya timestamp altyapısı seçimi
- Security audit
- Public launch

## Premium Hissi İçin UI/UX Checklist

- Her ekranda tek ana aksiyon
- Boş durumda kullanıcıya ne yapacağını söyleyen metin
- Teknik terimleri kullanıcıdan gizleme
- QR akışında riskleri sade dilde gösterme
- Paylaşım sonunda makbuz gösterme
- Ayarlarda iç geliştirme checklist'i göstermeme
- Renk paletini 2-3 ana renk etrafında tutma
- Buton ve kart stillerini tutarlı kullanma
