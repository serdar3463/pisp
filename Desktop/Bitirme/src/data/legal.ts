export const legalLinks = [
  {
    id: "privacy",
    title: "Gizlilik Politikası",
    description: "Hangi bilgilerin cihazında kaldığını ve haklarını açıklar.",
    url: "https://pisp.app/privacy",
    body: [
      "Ham kişisel bilgiler yalnızca senin cihazındaki şifreli kasada tutulur.",
      "PISP, paylaşım sırasında yalnızca açıkça onayladığın minimum bilgiyi QR yanıtına dahil eder.",
      "Paylaşım geçmişi kişisel değerlerin görünmeden hash biçiminde saklanır.",
      "Yerel kasayı silebilir, şifreli yedek oluşturabilir ve paylaşım izinlerini istediğin zaman geri çekebilirsin.",
      "Kişisel veriler hiçbir sunucuya, buluta veya üçüncü tarafa gönderilmez."
    ]
  },
  {
    id: "kvkk",
    title: "KVKK Aydınlatma Metni",
    description: "6698 sayılı KVKK kapsamında kişisel veri işleme aydınlatması.",
    url: "https://pisp.app/kvkk",
    body: [
      "Veri Sorumlusu: PISP uygulaması kullanıcının kendisidir; veriler üçüncü tarafça işlenmez.",
      "İşlenen Veriler: Kullanıcının kasaya girdiği kişisel bilgiler (kimlik, iletişim, kariyer vb.).",
      "İşleme Amacı: Yalnızca kullanıcı tarafından başlatılan, onaylanan paylaşım işlemleri.",
      "Hukuki Dayanak: KVKK Md. 5/1 — Açık rıza; her paylaşım öncesi onay alınır.",
      "Saklama Süresi: Kullanıcı kasayı silene kadar; sunucu tarafında saklama yoktur.",
      "Haklarınız: KVKK Md. 11 kapsamında erişim, düzeltme ve silme hakkı uygulama içinden kullanılır."
    ]
  },
  {
    id: "terms",
    title: "Kullanım Şartları",
    description: "Uygulamanın kullanım kuralları, sorumluluk sınırları ve kullanıcı yükümlülükleri.",
    url: "https://pisp.app/terms",
    body: [
      "Kullanıcı, paylaşımdan önce açılacak bilgileri incelemekten sorumludur.",
      "PISP hukuki, tıbbi veya finansal danışmanlık vermez; yalnızca bilgi yönetim aracı sağlar.",
      "QR isteği doğrulansa bile alıcının kimliği ve paylaşım amacı kullanıcı tarafından kontrol edilmelidir.",
      "Uygulama, kişisel bilgi yönetimi ve kontrollü paylaşım amacıyla tasarlanmıştır.",
      "Kullanıcı, yedek parolasını kaybetmesi durumunda veri kurtarmanın mümkün olmadığını kabul eder."
    ]
  },
  {
    id: "delete",
    title: "Veri Silme Talebi",
    description: "Yerel kasayı cihazdan silme ve veri silme talebi iletme süreci.",
    url: "https://pisp.app/delete-data",
    body: [
      "Yerel kasa, Güvenlik ekranındaki 'Kasayı Sil' işlemiyle bu cihazdan tamamen kaldırılır.",
      "Şifreli yedek dosyaları kullanıcının kendi kontrolündedir; yedekleri silmek kullanıcının sorumluluğundadır.",
      "Sunucuda herhangi bir kişisel veri tutulmadığından ek silme talebi gerektirmez.",
      "Silme işleminden önce gerekli yedeği oluşturmak kullanıcının sorumluluğundadır."
    ]
  },
  {
    id: "support",
    title: "Destek",
    description: "Güvenlik bildirimi, hesap yardımı ve kullanıcı desteği.",
    url: "mailto:destek@pisp.app",
    body: [
      "Kilit, yedekleme, QR aktarım ve veri silme konularında destek alabilirsin.",
      "Güvenlik sorunlarını destek@pisp.app adresine iletebilirsin.",
      "Destek talebinde cihaz modeli ve işletim sistemi bilgisini paylaşman süreci hızlandırır.",
      "Güvenlik bildirimi kişisel bilgi içermeden iletilmelidir.",
      "Yanıt süresi: İş günlerinde 24-48 saat."
    ]
  }
];

export const appProfile = {
  name: "PISP",
  tagline: "Kişisel Bilgi Egemenliği",
  version: "1.0.0",
  releaseChannel: "Mobil uygulama",
  companyStatus: "Kişisel veri kasası"
};
