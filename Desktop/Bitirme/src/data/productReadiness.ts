export type ReadinessStatus = "ready" | "inProgress" | "blocked";

export type ReadinessItem = {
  id: string;
  title: string;
  owner: string;
  status: ReadinessStatus;
  description: string;
};

export const trustControls: ReadinessItem[] = [
  {
    id: "local-vault",
    title: "Bilgiler telefonda kalır",
    owner: "Mobil ürün",
    status: "ready",
    description: "Kişisel bilgiler cihazında saklanır; uygulama bu bilgileri sunucuda okumak zorunda kalmaz."
  },
  {
    id: "signed-qr",
    title: "QR istekleri kontrol edilir",
    owner: "Güvenlik",
    status: "ready",
    description: "QR isteği paylaşmadan önce kontrol edilir; şüpheli istekler reddedilir."
  },
  {
    id: "ledger-proof",
    title: "Paylaşım geçmişi güvenli tutulur",
    owner: "Güvenlik",
    status: "ready",
    description: "Geçmiş kaydı kişisel değerleri göstermez; yalnızca işlemin izini tutar."
  },
  {
    id: "legal-review",
    title: "Hukuki metinler hazırlanıyor",
    owner: "Hukuk",
    status: "inProgress",
    description: "Gizlilik, onay, saklama ve silme süreçleri kullanıcıya açık gösterilir."
  }
];

export const productionControls: ReadinessItem[] = [
  {
    id: "mobile-security-review",
    title: "Bağımsız güvenlik kontrolü",
    owner: "Güvenlik",
    status: "blocked",
    description: "Yayın öncesi cihaz kilidi, QR akışı ve yerel saklama bağımsız olarak test edilmeli."
  },
  {
    id: "key-recovery",
    title: "Telefon değişimi planı",
    owner: "Güvenlik",
    status: "blocked",
    description: "Telefon kaybolursa veya değişirse kullanıcının ne yapacağı netleştirilmeli."
  },
  {
    id: "private-backup",
    title: "Şifreli yedekleme",
    owner: "Platform",
    status: "inProgress",
    description: "Kullanıcı, bilgilerini sunucuya açmadan şifreli yedekle taşıyabilmeli."
  },
  {
    id: "production-ledger",
    title: "Dış doğrulama kararı",
    owner: "Platform",
    status: "inProgress",
    description: "Paylaşım geçmişinin dışarıdan nasıl doğrulanacağı public yayın öncesi seçilmeli."
  },
  {
    id: "legal-pack",
    title: "Hukukçu onayı",
    owner: "Hukuk",
    status: "blocked",
    description: "Gizlilik, kullanım şartları ve veri silme süreci hukukçu tarafından onaylanmalı."
  },
  {
    id: "e2e-tests",
    title: "Gerçek cihaz testleri",
    owner: "Kalite",
    status: "inProgress",
    description: "QR paylaşımı, veri silme, yedekleme ve uygulama kilidi gerçek cihazlarda test edilmeli."
  }
];

export function readinessScore(items: ReadinessItem[]) {
  if (items.length === 0) {
    return 0;
  }
  const score = items.reduce((total, item) => {
    if (item.status === "ready") {
      return total + 1;
    }
    if (item.status === "inProgress") {
      return total + 0.5;
    }
    return total;
  }, 0);
  return Math.round((score / items.length) * 100);
}
