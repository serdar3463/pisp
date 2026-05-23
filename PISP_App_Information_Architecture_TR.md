# PISP Uygulama Bilgi Mimarisi

Bu dokuman, PISP mobil uygulamasinin canli urun hissi verecek sekilde nasil gezilebilir hale getirildigini aciklar.

## Ana Navigasyon

Uygulama artik teknik demo sekmeleri yerine bes ana alana ayrilir:

- Today: kullanicinin durumunu ve baslayacagi aksiyonlari gosterir.
- Vault: kullanicinin kendi bilgilerini girdigi sifreli yerel kasa.
- Exchange: QR ile bilgi isteme ve bilgi paylasma akisi.
- Templates: amaca gore disclosure paketi olusturma alani.
- Activity: proof ledger ve audit log gecmisi.

Bu yapi kullanicinin zihinsel modeline daha uygundur:

1. Bilgimi girerim.
2. Izinlerimi kontrol ederim.
3. QR ile bilgi isterim veya paylasirim.
4. Gecmiste ne oldugunu kontrol ederim.

## Home Ekrani

Home ekrani sadece metrik gosteren bir dashboard degildir. Kullaniciya dort net is verir:

- Add my information
- Share by QR
- Create disclosure
- Review activity

Bu sayede kullanici teknik kavramlari bilmeden uygulamada ne yapacagini anlar.

## Gizli / Ileri Akislar

Policy artik Vault icindeki Permissions modu olarak konumlandirildi. Share akisi ise Templates alanina tasindi:

- Vault / Data: kullanici bilgilerini girer.
- Vault / Permissions: izin kontrolu ve panic close.
- Templates: minimum disclosure ve ODRL/DPV policy preview.

Bu yaklasim startup urunleri icin daha dogrudur. Kullanici teknik kavramlari ayri ekranlar olarak gormez; her sey islevsel baglaminda durur.

## Activity Ekrani

Ledger ve Log ayri sekmeler olmaktan cikarildi. Activity altinda iki mod olarak sunulur:

- Proof ledger
- Audit log

Kullanici icin bunlar ayni soruya cevap verir: "Benim verimle ilgili ne oldu?"

## Sonuc

Bu bilgi mimarisi PISP'i teknik bir prototipten daha kullanilabilir bir urune yaklastirir. Uygulama artik startup MVP'si olarak su degeri daha net verir:

**Kullanici bilgilerini girer, izinlerini yonetir, QR ile kontrollu paylasir, sablonlarla disclosure olusturur ve tum gecmisi denetler.**
