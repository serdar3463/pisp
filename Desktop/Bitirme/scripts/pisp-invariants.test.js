const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const pisp = read("src/data/pisp.ts");
const app = read("App.tsx");
const backup = read("src/services/portableBackup.ts");

const domainMatches = pisp.match(/id: "D-\d{2}"/g) ?? [];
assert(domainMatches.length === 14, `Expected 14 PISP domains, found ${domainMatches.length}`);

for (const id of ["D-01", "D-07", "D-14"]) {
  assert(pisp.includes(`id: "${id}"`), `Missing domain ${id}`);
}

assert(pisp.includes('risk: "special"'), "Expected at least one special-category field");
assert(pisp.includes("initialShareCounts"), "Expected share count defaults for sharing history");
assert(app.includes('type ModuleId = "vault" | "share" | "settings";'), "Expected simplified three-section user architecture");
assert(app.includes("function ShareModule"), "Expected sharing preparation and QR to be combined");
assert(app.includes("function SettingsModule"), "Expected history and security to be grouped under settings");
for (const label of ["Bilgilerim", "Paylaş", "Ayarlar"]) {
  assert(app.includes(`title: "${label}"`), `Missing simplified section label: ${label}`);
}
assert(!app.includes("function HomeModule"), "Legacy home action screen should not remain");
assert(!fs.existsSync(path.join(root, "src/navigation/tabs.ts")), "Legacy tab navigation file should not remain");
assert(!app.includes("bottomNav"), "Legacy bottom tab navigation should not remain");
assert(!app.includes("function OverviewScreen"), "Legacy overview screen should not remain in the report-aligned architecture");
assert(app.includes("validateFieldValue"), "Expected field validation in app");
assert(!app.includes("usageLimitReached"), "Unlimited sharing should not be blocked by usage limit enforcement");
assert(app.includes('label="Limit: Limitsiz"'), "Expected sharing flow to communicate unlimited sharing");
assert(app.includes("qrConsentAccepted"), "Expected explicit consent gate for QR disclosure");
assert(app.includes("assessQRRequest"), "Expected QR anti-phishing/security review before disclosure");
assert(app.includes("Akıllı hazırlık"), "Expected premium smart vault readiness layer");
assert(app.includes("Paylaşım makbuzu"), "Expected post-share receipt for startup-grade trust");
assert(app.includes("setReceipts"), "Expected receipts to be stored as durable product history");
assert(app.includes("Paylaşım makbuzları"), "Expected receipt history in the product");
assert(app.includes("Bugün ne yapmak istiyorsun?"), "Expected user-goal oriented home experience");
assert(app.includes("Bilgi isteyen kişiysen"), "Expected QR flow to explain user roles");
assert(app.includes("verifierCard"), "Expected verifier trust card in QR flow");
assert(!app.includes("Test et"), "Production user flow should not show local test shortcuts");
assert(!app.includes("Örnek profili yükle"), "Production user flow should not expose sample profile loading");
assert(app.includes("riskLabelForField"), "Expected user-friendly risk labels instead of raw standards");
assert(app.includes("Şifreli yedekleme"), "Expected encrypted backup UI in account controls");
assert(backup.includes('protocol: "pisp.backup.v1"'), "Expected portable backup protocol");
assert(backup.includes("restorePortableBackup"), "Expected portable backup restore function");

const requiredDocs = [
  "docs/V1_RELEASE_CHECKLIST_TR.md",
  "docs/THREAT_MODEL_TR.md",
  "docs/QR_TWO_DEVICE_TEST_TR.md",
  "docs/BACKEND_BACKUP_RECOVERY_STRATEGY_TR.md",
  "docs/BLOCKCHAIN_LEDGER_PRODUCTION_TR.md",
  "docs/LEGAL_REVIEW_PACK_TR.md",
  "docs/UI_UX_REVIEW_CHECKLIST_TR.md",
  "docs/REPORT_ALIGNMENT_AUDIT_TR.md",
  "docs/BETA_TEST_PLAN_TR.md",
  "docs/INCIDENT_RESPONSE_TR.md",
  "docs/SECURITY_DISCLOSURE_TR.md",
  "docs/LAUNCH_RUNBOOK_TR.md",
  "docs/STARTUP_PROJECT_PACKAGE_TR.md",
  "docs/PREMIUM_PRODUCT_ROADMAP_TR.md",
  "docs/STARTUP_PITCH_DECK_TR.md",
  "store/APP_STORE_METADATA_TR.md",
  "store/GOOGLE_PLAY_METADATA_TR.md",
  "store/PRIVACY_LABELS_TR.md",
  "store/REVIEW_NOTES_TR.md"
];

for (const doc of requiredDocs) {
  assert(fs.existsSync(path.join(root, doc)), `Missing required release document: ${doc}`);
}

assert(fs.existsSync(path.join(root, "scripts/launch-readiness.js")), "Missing launch readiness gate");
assert(app.includes("1. Hazırla") && app.includes("2. QR"), "Expected simple two-step sharing flow");

console.log("PISP invariant checks passed.");
