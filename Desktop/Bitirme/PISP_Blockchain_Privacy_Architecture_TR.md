# PISP Blockchain ve Mahremiyet Mimarisi

PISP'te blockchain'in gorevi kisisel veriyi saklamak degildir. Bu kritik bir tasarim kararidir. Kisisel verinin blockchain'e yazilmasi GDPR/KVKK acisindan ciddi risk dogurur; cunku blockchain kayitlari pratikte degistirilemez ve silinemez. Bu durum unutulma hakki, veri minimizasyonu ve amacla sinirlilik ilkeleriyle celisebilir.

Bu nedenle PISP mimarisi su prensibi izler:

**Kisisel veri kullanicinin cihazinda veya kullanici kontrolundeki sifreli veri kasasinda kalir. Blockchain/ledger sadece kanit hash'lerini ve izin olaylarini tutar.**

## Zincire Yazilmayanlar

- Ad, soyad, dogum tarihi
- Telefon, e-posta, adres
- Saglik verisi
- Finansal veri
- Biyometrik veri
- CV veya egitim bilgisi gibi ham alan degerleri
- Kullanici notlari veya biyografik veriler

## Zincire Yazilabilecekler

- Policy hash
- Payload fingerprint hash
- Onceki blok hash'i
- Blok hash'i
- Izin verildi / izin geri cekildi / paylasim kanitlandi olayi
- Amac, alici ve saklama suresi gibi minimum policy metadata
- Paylasilan field id listesi, degerleri degil

## Neden Bu Dogru?

Bu yaklasim PISP'in hukuki hedefleriyle uyumludur:

- GDPR/KVKK veri minimizasyonu: gereksiz veri zincire yazilmaz.
- Unutulma hakki: ham veri kullanici kasasindan silinebilir.
- Denetlenebilirlik: izin ve paylasim olaylari sonradan kanitlanabilir.
- Veri egemenligi: PISP sirketi kullanicinin ham verisini gormez.
- Startup guveni: kullaniciya "bize guven" yerine teknik garanti sunulur.

## Mevcut Uygulamadaki PoC

Mobil uygulamada `Ledger` ekraninda bir hash-chain PoC bulunur. Her paylasimda:

1. Secilen template ve aktif policy okunur.
2. Ham veri degerleri ledger'a yazilmaz.
3. ODRL/DPV policy JSON'u hash'lenir.
4. Paylasim fingerprint'i hash'lenir.
5. Onceki blok hash'i ile yeni blok hash'i uretilir.
6. Ledger ekraninda sadece kanitlar gosterilir.

Bu PoC ileride uc farkli yola evrilebilir:

- Local-first append-only ledger
- Permissioned blockchain
- Public blockchain anchoring

## Startup Icin Onerilen Nihai Mimari

Ilk fazda public blockchain'e dogrudan veri veya detayli metadata yazilmasi onerilmez. Daha guvenli yol:

1. Mobil cihazda local encrypted vault.
2. Local append-only sovereignty ledger.
3. Kullanici isterse policy proof hash'inin public chain'e anchor edilmesi.
4. Kurumsal musteri icin permissioned ledger secenegi.
5. Verifiable Credential ve DID ile dogrulanabilir paylasim.

Bu sayede PISP hem hukuki riskleri azaltir hem de blockchain'i gercek bir problem icin kullanir: veri saklamak icin degil, veri paylasim kararlarini kanitlamak icin.

