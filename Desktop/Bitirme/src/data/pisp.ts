export type DomainId =
  | "D-01"
  | "D-02"
  | "D-03"
  | "D-04"
  | "D-05"
  | "D-06"
  | "D-07"
  | "D-08"
  | "D-09"
  | "D-10"
  | "D-11"
  | "D-12"
  | "D-13"
  | "D-14";

export type Risk = "ordinary" | "sensitive" | "special";

export type Field = {
  id: string;
  label: string;
  value: string;
  type: "text" | "date" | "number" | "multi";
  risk: Risk;
  standard: string;
};

export type Domain = {
  id: DomainId;
  name: string;
  shortName: string;
  description: string;
  gdpr: string;
  color: string;
  fields: Field[];
};

export type Template = {
  id: string;
  name: string;
  purpose: string;
  recipient: string;
  license: string;
  royalty: string;
  fieldIds: string[];
  output: "JSON-LD" | "vCard" | "FHIR" | "VC";
};

export type PolicyState = Record<string, boolean>;
export type VaultValues = Record<string, string>;
export type ShareCounts = Record<string, number>;

export type PolicyContext = {
  purpose: string;
  recipient: string;
  expiryDays: number;
  usageLimit: number;
  retentionDays: number;
};

export type AuditEvent = {
  id: string;
  action: string;
  summary: string;
  details: string[];
  timestamp: string;
  decision: "allow" | "deny" | "revoke";
};

export const domains: Domain[] = [
  {
    id: "D-01",
    name: "Kimlik ve Temel Kişisel",
    shortName: "Kimlik",
    description: "Yasal kimlik, yaş ve kişiye ait temel tanımlayıcılar.",
    gdpr: "Normal / biyometri için GDPR Art. 9",
    color: "#1769e0",
    fields: [
      { id: "fullName", label: "Ad soyad", value: "", type: "text", risk: "ordinary", standard: "DPV / schema:Person" },
      { id: "tcKimlikNo", label: "TC Kimlik No", value: "", type: "number", risk: "special", standard: "EUDI PID" },
      { id: "birthDate", label: "Doğum tarihi", value: "", type: "date", risk: "ordinary", standard: "EUDI PID" },
      { id: "birthPlace", label: "Doğum yeri", value: "", type: "text", risk: "ordinary", standard: "EUDI PID" },
      { id: "gender", label: "Cinsiyet", value: "", type: "text", risk: "ordinary", standard: "EUDI PID" },
      { id: "motherName", label: "Anne adı", value: "", type: "text", risk: "sensitive", standard: "EUDI PID" },
      { id: "fatherName", label: "Baba adı", value: "", type: "text", risk: "sensitive", standard: "EUDI PID" },
      { id: "nationality", label: "Uyruk", value: "", type: "text", risk: "ordinary", standard: "EUDI PID" },
      { id: "idExpiry", label: "Kimlik geçerlilik tarihi", value: "", type: "date", risk: "sensitive", standard: "EUDI PID" },
      { id: "idSerialNo", label: "Cüzdan / seri no", value: "", type: "text", risk: "special", standard: "EUDI PID" }
    ]
  },
  {
    id: "D-02",
    name: "İletişim ve Adres",
    shortName: "İletişim",
    description: "Kişi ve hizmetlerin ulaşabileceği iletişim bilgileri.",
    gdpr: "Normal",
    color: "#1769e0",
    fields: [
      { id: "email", label: "E-posta", value: "", type: "text", risk: "ordinary", standard: "vCard 4.0" },
      { id: "phone", label: "Telefon", value: "", type: "text", risk: "ordinary", standard: "vCard 4.0" },
      { id: "city", label: "Şehir", value: "", type: "text", risk: "ordinary", standard: "vCard 4.0" }
    ]
  },
  {
    id: "D-03",
    name: "Sosyal ve İlişkiler",
    shortName: "Sosyal",
    description: "Sosyal medya hesapları, aile bağlantıları ve üyelik bilgileri.",
    gdpr: "Normal / korunan üyeliklerde GDPR Art. 9",
    color: "#1769e0",
    fields: [
      { id: "linkedin", label: "LinkedIn", value: "", type: "text", risk: "ordinary", standard: "FOAF" },
      { id: "github", label: "GitHub", value: "", type: "text", risk: "ordinary", standard: "FOAF" },
      { id: "twitter", label: "Twitter / X", value: "", type: "text", risk: "ordinary", standard: "FOAF" },
      { id: "instagram", label: "Instagram", value: "", type: "text", risk: "ordinary", standard: "FOAF" },
      { id: "socialHandle", label: "Diğer sosyal hesap", value: "", type: "text", risk: "ordinary", standard: "FOAF" },
      { id: "familyContact", label: "Acil durum yakını", value: "", type: "text", risk: "sensitive", standard: "PIMO / FOAF" }
    ]
  },
  {
    id: "D-04",
    name: "Mesleki ve Kariyer",
    shortName: "Kariyer",
    description: "CV, yetkinlikler, sertifikalar ve çalışma geçmişi.",
    gdpr: "Normal",
    color: "#1769e0",
    fields: [
      { id: "role", label: "Mevcut rol / ünvan", value: "", type: "text", risk: "ordinary", standard: "ESCO" },
      { id: "employer", label: "Şu anki işveren", value: "", type: "text", risk: "ordinary", standard: "ESCO" },
      { id: "workHistory", label: "Çalışma geçmişi", value: "", type: "multi", risk: "ordinary", standard: "ESCO" },
      { id: "skills", label: "Yetkinlikler", value: "", type: "multi", risk: "ordinary", standard: "ESCO" },
      { id: "certifications", label: "Sertifikalar", value: "", type: "multi", risk: "ordinary", standard: "ESCO" },
      { id: "languages", label: "Diller", value: "", type: "multi", risk: "ordinary", standard: "ESCO" },
      { id: "portfolio", label: "Portfolyo / web sitesi", value: "", type: "text", risk: "ordinary", standard: "schema:CreativeWork" }
    ]
  },
  {
    id: "D-05",
    name: "İş ve Hukuki",
    shortName: "Hukuk",
    description: "Sözleşmeler, şirket rolleri ve hukuki tanımlayıcılar.",
    gdpr: "Normal",
    color: "#1769e0",
    fields: [
      { id: "taxStatus", label: "Vergi durumu", value: "", type: "text", risk: "sensitive", standard: "DPV Legal" },
      { id: "contractRole", label: "Sözleşme rolü", value: "", type: "text", risk: "ordinary", standard: "ODRL Party" }
    ]
  },
  {
    id: "D-06",
    name: "Finansal",
    shortName: "Finans",
    description: "Sıkı veri azaltımı gerektiren finansal göstergeler.",
    gdpr: "Normal, pratikte yüksek hassasiyet",
    color: "#1769e0",
    fields: [
      { id: "ibanLast4", label: "IBAN son 4 hane", value: "", type: "number", risk: "sensitive", standard: "DPV Financial" },
      { id: "incomeBand", label: "Gelir aralığı", value: "", type: "text", risk: "sensitive", standard: "DPV Financial" },
      { id: "creditRange", label: "Kredi skoru aralığı", value: "", type: "text", risk: "sensitive", standard: "ZKP range proof" }
    ]
  },
  {
    id: "D-07",
    name: "Sağlık ve Medikal",
    shortName: "Sağlık",
    description: "Açık onayla yönetilen klinik ve iyi oluş verileri.",
    gdpr: "Özel nitelikli, GDPR Art. 9",
    color: "#1769e0",
    fields: [
      { id: "bloodType", label: "Kan grubu", value: "", type: "text", risk: "special", standard: "HL7 FHIR" },
      { id: "allergies", label: "Alerjiler", value: "", type: "multi", risk: "special", standard: "HL7 FHIR" },
      { id: "chronicConditions", label: "Kronik hastalıklar", value: "", type: "multi", risk: "special", standard: "HL7 FHIR" },
      { id: "medications", label: "Sürekli kullanılan ilaçlar", value: "", type: "multi", risk: "special", standard: "HL7 FHIR" },
      { id: "doctorName", label: "Doktor adı", value: "", type: "text", risk: "sensitive", standard: "HL7 FHIR" },
      { id: "lastDoctorVisit", label: "Son muayene tarihi", value: "", type: "date", risk: "sensitive", standard: "FHIR Observation" },
      { id: "fitnessMetric", label: "Aktivite özeti", value: "", type: "text", risk: "sensitive", standard: "FHIR Observation" }
    ]
  },
  {
    id: "D-08",
    name: "Seyahat ve Mobilite",
    shortName: "Seyahat",
    description: "Seyahat belgeleri, güzergahlar ve mobilite kayıtları.",
    gdpr: "Normal / biyometrik seyahat belgelerinde Art. 9",
    color: "#1769e0",
    fields: [
      { id: "passportStatus", label: "Pasaport durumu", value: "", type: "text", risk: "sensitive", standard: "EUDI EAA" },
      { id: "lastTrip", label: "Son seyahat", value: "", type: "text", risk: "ordinary", standard: "DPV Location" }
    ]
  },
  {
    id: "D-09",
    name: "Eğitim ve Akademik",
    shortName: "Eğitim",
    description: "Diplomalar, transkriptler, araştırma ve akademik kimlik.",
    gdpr: "Normal",
    color: "#1769e0",
    fields: [
      { id: "degree", label: "Bölüm / derece", value: "", type: "text", risk: "ordinary", standard: "EUDI EAA / Open Badges" },
      { id: "researchTopic", label: "Araştırma konusu", value: "", type: "text", risk: "ordinary", standard: "schema:ScholarlyArticle" }
    ]
  },
  {
    id: "D-10",
    name: "Medya ve İçerik",
    shortName: "Medya",
    description: "Fotoğraflar, yaratıcı işler ve yayımlanmış dijital iz.",
    gdpr: "Normal",
    color: "#1769e0",
    fields: [
      { id: "profilePhoto", label: "Profil fotoğrafı", value: "", type: "text", risk: "sensitive", standard: "schema:ImageObject" },
      { id: "creativeWork", label: "Yaratıcı çalışma", value: "", type: "text", risk: "ordinary", standard: "schema:CreativeWork" }
    ]
  },
  {
    id: "D-11",
    name: "Biyografik ve Hatıra",
    shortName: "Yaşam",
    description: "Yaşam olayları, günlükler ve dijital miras kayıtları.",
    gdpr: "İçeriğe göre normal / Art. 9",
    color: "#1769e0",
    fields: [
      { id: "lifeEvent", label: "Yaşam olayı", value: "", type: "text", risk: "ordinary", standard: "PISP extension" },
      { id: "legacyNote", label: "Miras notu", value: "", type: "text", risk: "sensitive", standard: "PISP extension" }
    ]
  },
  {
    id: "D-12",
    name: "Tercihler ve Davranış",
    shortName: "Davranış",
    description: "İlgi alanları, çıkarılan örüntüler ve tercih sinyalleri.",
    gdpr: "Siyasi, dini veya sağlıkla ilgiliyse özel nitelikli",
    color: "#1769e0",
    fields: [
      { id: "appPreference", label: "Uygulama tercihi", value: "", type: "text", risk: "ordinary", standard: "DPV Behavioural" },
      { id: "sensitivePreference", label: "Hassas tercih", value: "", type: "text", risk: "special", standard: "GDPR Art. 9" }
    ]
  },
  {
    id: "D-13",
    name: "Cihaz ve Dijital",
    shortName: "Cihaz",
    description: "Cihaz tanımlayıcıları, uygulama kullanımı ve IoT sinyalleri.",
    gdpr: "Normal",
    color: "#1769e0",
    fields: [
      { id: "deviceKey", label: "Cihaz anahtarı", value: "", type: "text", risk: "sensitive", standard: "W3C DID" },
      { id: "appUsage", label: "Uygulama kullanımı", value: "", type: "text", risk: "ordinary", standard: "DPV Technology" }
    ]
  },
  {
    id: "D-14",
    name: "İtibar ve Güven",
    shortName: "Güven",
    description: "Referanslar, derecelendirmeler ve doğrulanabilir güven sinyalleri.",
    gdpr: "Normal",
    color: "#1769e0",
    fields: [
      { id: "endorsements", label: "Referanslar", value: "", type: "number", risk: "ordinary", standard: "PISP extension" },
      { id: "trustScore", label: "Güven durumu", value: "", type: "text", risk: "ordinary", standard: "PROV / PISP extension" }
    ]
  }
];

export const templates: Template[] = [];

export const defaultPolicyContext: PolicyContext = {
  purpose: "Geçmiş doğrulama",
  recipient: "İK iş ortağı",
  expiryDays: 36500,
  usageLimit: 999999,
  retentionDays: 36500
};

export const initialShareCounts: ShareCounts = templates.reduce<ShareCounts>((counts, template) => {
  counts[template.id] = 0;
  return counts;
}, {});

export const initialPolicy: PolicyState = domains.reduce<PolicyState>((state, domain) => {
  state[domain.id] = true;
  for (const field of domain.fields) {
    state[field.id] = field.risk !== "special";
  }
  return state;
}, {});

export const initialVaultValues: VaultValues = domains.reduce<VaultValues>((values, domain) => {
  for (const field of domain.fields) {
    values[field.id] = field.value;
  }
  return values;
}, {});

export function allFields(values: VaultValues = initialVaultValues) {
  return domains.flatMap((domain) =>
    domain.fields.map((field) => ({
      ...field,
      value: values[field.id] ?? field.value,
      domain
    }))
  );
}

export function getAllowedFields(template: Template, policy: PolicyState, values: VaultValues = initialVaultValues) {
  return allFields(values).filter(({ id, domain, value }) => template.fieldIds.includes(id) && policy[domain.id] && policy[id] && value.trim().length > 0);
}

export function createDisclosurePreview(
  template: Template,
  policy: PolicyState,
  values: VaultValues = initialVaultValues,
  context: PolicyContext = {
    purpose: template.purpose,
    recipient: template.recipient,
    expiryDays: 36500,
    usageLimit: 999999,
    retentionDays: 36500
  }
) {
  const allowed = getAllowedFields(template, policy, values);
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2", "https://pisp.dev/context/v1"],
    type: ["VerifiablePresentation", "PISPMinimumDisclosure"],
    purpose: context.purpose,
    recipient: context.recipient,
    output: template.output,
    disclosedClaims: Object.fromEntries(allowed.map((field) => [field.id, field.value])),
    withheldClaims: template.fieldIds.length - allowed.length,
    policy: {
      expiryDays: context.expiryDays,
      usageLimit: context.usageLimit,
      retentionDays: context.retentionDays
    },
    proof: template.id === "finance" ? "range-proof: creditRange >= 700" : "selective-disclosure-ready"
  };
}

export function createOdrlPolicy(
  template: Template,
  policy: PolicyState,
  context: PolicyContext,
  values: VaultValues = initialVaultValues
) {
  const allowed = getAllowedFields(template, policy, values);
  return {
    "@context": {
      odrl: "http://www.w3.org/ns/odrl/2/",
      dpv: "https://w3id.org/dpv#",
      pisp: "https://pisp.dev/ns#"
    },
    "@type": "odrl:Agreement",
    uid: `urn:pisp:policy:${template.id}`,
    profile: "pisp:ODRL-DPV-AccessControl",
    permission: [
      {
        action: "odrl:use",
        target: allowed.map((field) => `pisp:attribute/${field.id}`),
        assignee: context.recipient,
        constraint: [
          { leftOperand: "dpv:Purpose", operator: "odrl:eq", rightOperand: context.purpose },
          { leftOperand: "odrl:dateTime", operator: "odrl:lteq", rightOperand: `P${context.expiryDays}D` },
          { leftOperand: "pisp:usageCount", operator: "odrl:lteq", rightOperand: context.usageLimit },
          { leftOperand: "dpv:StorageDuration", operator: "odrl:lteq", rightOperand: `P${context.retentionDays}D` }
        ]
      }
    ],
    prohibition: [
      {
        action: "odrl:use",
        target: template.fieldIds
          .filter((id) => !allowed.some((field) => field.id === id))
          .map((id) => `pisp:attribute/${id}`)
      }
    ]
  };
}

export function calculateRiskScore(template: Template, policy: PolicyState, values: VaultValues = initialVaultValues) {
  const allowed = getAllowedFields(template, policy, values);
  const weighted = allowed.reduce((score, field) => {
    if (field.risk === "special") {
      return score + 35;
    }
    if (field.risk === "sensitive") {
      return score + 18;
    }
    return score + 6;
  }, 0);
  return Math.min(100, weighted);
}

export function minimizationScore(template: Template, policy: PolicyState, values: VaultValues = initialVaultValues) {
  const allowed = getAllowedFields(template, policy, values).length;
  if (template.fieldIds.length === 0) {
    return 100;
  }
  return Math.round((1 - allowed / template.fieldIds.length) * 100);
}

export const starterEvents: AuditEvent[] = [];
