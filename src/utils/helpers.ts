import { AuditEvent, Field, PolicyContext, PolicyState, Template, VaultValues, allFields, domains, templates } from "../data/pisp";
import { QRRequest } from "../services/qrExchange";
import { ShareReceipt } from "../data/receipts";

export function shortHash(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

export function decisionLabel(decision: AuditEvent["decision"]) {
  if (decision === "deny") return "Reddedildi";
  if (decision === "revoke") return "Geri çekildi";
  return "Onaylandı";
}

export function makeEvent(action: string, summary: string, details: string[], decision: AuditEvent["decision"]): AuditEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action,
    summary,
    details,
    timestamp: new Date().toLocaleString("tr-TR"),
    decision
  };
}

export function nextContextChoice(context: PolicyContext, key: keyof PolicyContext): PolicyContext {
  const purposes = ["Kimlik doğrulama", "İşe alım", "Sağlık acil durumu", "Seyahat işlemi"];
  const recipients = ["Karşı taraf", "İK departmanı", "Sağlık görevlisi", "Kamu hizmeti"];
  if (key === "purpose") return { ...context, purpose: nextValue(purposes, context.purpose) };
  if (key === "recipient") return { ...context, recipient: nextValue(recipients, context.recipient) };
  return context;
}

function nextValue<T>(values: T[], current: T) {
  const index = values.indexOf(current);
  return values[(index + 1) % values.length] ?? values[0]!;
}

export function calculateVaultCompleteness(values: VaultValues) {
  const fields = allFields(values);
  if (fields.length === 0) return 0;
  return Math.round((fields.filter((f) => f.value.trim().length > 0).length / fields.length) * 100);
}

export function getTemplateReadiness(template: Template, policy: PolicyState, values: VaultValues) {
  const fields = allFields(values).filter((f) => template.fieldIds.includes(f.id));
  const readyFields = fields.filter((f) => policy[f.domain.id] && policy[f.id] && f.value.trim().length > 0);
  const missingFields = fields.filter((f) => !policy[f.domain.id] || !policy[f.id] || f.value.trim().length === 0);
  const percent = fields.length === 0 ? 100 : Math.round((readyFields.length / fields.length) * 100);
  return { template, percent, missingFieldIds: missingFields.map((f) => f.id), missingLabels: missingFields.map((f) => f.label) };
}

export function domainForFieldId(fieldId: string) {
  return domains.find((d) => d.fields.some((f) => f.id === fieldId)) ?? null;
}

export function fieldLabelById(id: string) {
  return allFields().find((f) => f.id === id)?.label ?? id;
}

export function templateNameById(id?: string) {
  return templates.find((t) => t.id === id)?.name ?? "Paylaşım";
}

export function outputLabel(output: Template["output"]) {
  if (output === "vCard") return "Kişi bilgisi";
  if (output === "FHIR") return "Sağlık paylaşımı";
  if (output === "VC") return "Doğrulanabilir özet";
  return "Güvenli paket";
}

export function riskLabelForField(field: Field) {
  if (field.risk === "special") return "Hassas bilgi";
  if (field.risk === "sensitive") return "Dikkatli paylaş";
  return "Standart bilgi";
}

export function validateTCKimlikNo(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;
  if (value[0] === "0") return false;
  const d = value.split("").map(Number);
  const d10 = ((d[0]! + d[2]! + d[4]! + d[6]! + d[8]!) * 7 - (d[1]! + d[3]! + d[5]! + d[7]!)) % 10;
  const d11 = (d[0]! + d[1]! + d[2]! + d[3]! + d[4]! + d[5]! + d[6]! + d[7]! + d[8]! + d[9]!) % 10;
  return d10 === d[9] && d11 === d[10];
}

export function keyboardTypeForField(field: Field) {
  if (field.id === "email") return "email-address";
  if (field.id === "phone") return "phone-pad";
  if (field.type === "number") return "number-pad";
  return "default" as const;
}

const FIELD_HINTS: Partial<Record<string, string>> = {
  fullName: "Ad Soyad (örn: Ahmet Yılmaz)",
  birthDate: "YYYY-AA-GG (örn: 2001-08-22)",
  nationality: "örn: Türkiye",
  email: "ornek@email.com",
  phone: "+90 5XX XXX XX XX",
  city: "örn: İstanbul",
  socialHandle: "@kullanıcıadı",
  familyContact: "Ad Soyad — Telefon numarası",
  role: "örn: Yazılım Geliştirici",
  skills: "örn: React Native, TypeScript",
  portfolio: "örn: linkedin.com/in/kullanici",
  income: "Yıllık gelir aralığı",
  taxId: "Vergi / TC kimlik numarası",
  creditScore: "Kredi skoru (örn: 1700)",
  insurance: "Sigorta poliçe no",
  bloodType: "örn: A Rh+",
  allergies: "Varsa alerjiler (örn: Penisilin)",
  activityLevel: "Haftalık aktif dakika",
  idDocument: "Pasaport veya TC kimlik no",
  travelHistory: "Son seyahat edilen ülkeler",
  education: "örn: Bilgisayar Mühendisliği",
  researchArea: "Araştırma / tez konusu",
  publications: "Yayın veya proje linki",
  photoRef: "Fotoğraf URL veya referans",
  mediaPortfolio: "Medya portfolyo linki",
  graduationDate: "Tahmini mezuniyet: YYYY-AA-GG",
  familyNote: "Aile ile paylaşılacak özel not",
  personalMotto: "Kişisel ilke veya motto",
  did: "Decentralized ID (örn: did:key:z6Mk...)",
  policyRef: "Politika referans kodu",
  verifications: "Doğrulama sayısı veya referans"
};

export function placeholderForField(field: Field): string {
  return FIELD_HINTS[field.id] ?? field.label;
}

export function validateFieldValue(field: Field, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Bu alan boş bırakıldı.";
  if (field.id === "tcKimlikNo") {
    if (!/^\d{11}$/.test(trimmed)) return "TC Kimlik No 11 haneli olmalı.";
    if (!validateTCKimlikNo(trimmed)) return "TC Kimlik No geçersiz (algoritma hatası).";
  }
  if (field.type === "date") {
    const isDateFormat = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    const timestamp = Date.parse(trimmed);
    if (!isDateFormat || Number.isNaN(timestamp)) return "Tarih YYYY-AA-GG biçiminde olmalı.";
  }
  if (field.type === "number" && field.id !== "tcKimlikNo" && !/^\d+$/.test(trimmed)) return "Bu alan yalnızca sayı içermeli.";
  if (field.id === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Geçerli bir e-posta adresi gir.";
  if (field.id === "phone" && !/^\+?[0-9\s()-]{7,}$/.test(trimmed)) return "Geçerli bir telefon numarası gir.";
  return null;
}

export function createReceipt({
  mode,
  template,
  context,
  disclosedFields,
  withheldCount,
  riskScore,
  proof
}: {
  mode: ShareReceipt["mode"];
  template: Template;
  context: PolicyContext;
  disclosedFields: Field[];
  withheldCount: number;
  riskScore: number;
  proof: string;
}): ShareReceipt {
  return {
    id: `${Date.now()}-${template.id}`,
    mode,
    templateName: template.name,
    recipient: context.recipient,
    purpose: context.purpose,
    disclosedLabels: disclosedFields.map((f) => f.label),
    withheldCount,
    riskScore,
    proof: shortHash(proof),
    timestamp: new Date().toLocaleString("tr-TR")
  };
}

export type RequestFinding = { level: "safe" | "warning" | "danger"; text: string };

export function assessQRRequest(
  request: QRRequest,
  template: Template,
  policy: PolicyState,
  values: VaultValues,
  context: PolicyContext,
  allowedFields: Field[],
  verifyQRRequest: (req: QRRequest) => { valid: boolean; message: string }
): RequestFinding[] {
  const verification = verifyQRRequest(request);
  const templateExists = templates.some((t) => t.id === request.templateId);
  const unknownFieldIds = request.requestedFieldIds.filter((id) => !template.fieldIds.includes(id));
  const invalidAllowedFields = allowedFields
    .map((f) => ({ field: f, error: validateFieldValue(f, values[f.id] ?? f.value) }))
    .filter(({ error }) => error);
  const specialAllowed = allowedFields.filter((f) => f.risk === "special" && policy[f.id]);

  const findings: RequestFinding[] = [
    { level: verification.valid ? "safe" : "danger", text: verification.valid ? "İstek imzası ve süresi doğrulandı." : verification.message }
  ];
  if (!templateExists) findings.push({ level: "danger", text: "İstek bilinmeyen bir paylaşım tipi kullanıyor." });
  if (unknownFieldIds.length > 0) findings.push({ level: "danger", text: `Bu paylaşım tipinde olmayan bilgiler isteniyor: ${unknownFieldIds.map(fieldLabelById).join(", ")}` });
  if (invalidAllowedFields.length > 0) findings.push({ level: "danger", text: "Açılacak bilgilerden bazıları geçersiz veya eksik." });
  findings.push({ level: "safe", text: "Paylaşım süresi süresiz olarak ayarlandı; alıcıyı dikkatle kontrol et." });
  if (specialAllowed.length > 0) findings.push({ level: "warning", text: `Özel nitelikli bilgi açılabilir: ${specialAllowed.map((f) => f.label).join(", ")}` });
  findings.push({
    level: "safe",
    text: allowedFields.length === 0 ? "Yerel izin politikan bu istekte bilgi açmıyor." : `${allowedFields.length} bilgi yerel politikanla eşleşiyor.`
  });
  return findings;
}
