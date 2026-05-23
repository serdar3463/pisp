const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const profileArg = args.find((arg) => arg.startsWith("--profile="));
const profile = profileArg?.replace("--profile=", "") || "public";
const isPublicLaunch = profile === "public";

if (!["beta", "public"].includes(profile)) {
  console.error("Usage: node scripts/launch-readiness.js --profile=beta|public");
  process.exit(1);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  failures.push(message);
}

const failures = [];
const warnings = [];
const app = readJson("app.json").expo;
const legal = read("src/data/legal.ts");

const urls = [
  ["privacyPolicyUrl", app.extra?.privacyPolicyUrl],
  ["supportUrl", app.extra?.supportUrl],
  ["dataDeletionUrl", app.extra?.dataDeletionUrl]
];

for (const [name, url] of urls) {
  if (!url || url.includes("example")) {
    const message = `${name} gerçek production URL olmalı: ${url || "eksik"}`;
    if (isPublicLaunch) {
      fail(message);
    } else {
      warnings.push(`${message} Kapalı beta build'i için bloklamıyor.`);
    }
  }
}

if (legal.includes("pisp.example")) {
  const message = "src/data/legal.ts içindeki public hukuk/destek URL'leri placeholder kalmış.";
  if (isPublicLaunch) {
    fail(message);
  } else {
    warnings.push(`${message} Kapalı beta build'i için bloklamıyor.`);
  }
}

if (app.version === "0.1.0") {
  warnings.push("Uygulama sürümü hâlâ 0.1.0. Kapalı beta için kabul edilebilir, public launch için release version belirle.");
}

const requiredDocs = [
  "docs/REPORT_ALIGNMENT_AUDIT_TR.md",
  "docs/THREAT_MODEL_TR.md",
  "docs/QR_TWO_DEVICE_TEST_TR.md",
  "docs/LEGAL_REVIEW_PACK_TR.md",
  "docs/BLOCKCHAIN_LEDGER_PRODUCTION_TR.md",
  "docs/BACKEND_BACKUP_RECOVERY_STRATEGY_TR.md",
  "docs/BETA_TEST_PLAN_TR.md",
  "docs/INCIDENT_RESPONSE_TR.md",
  "docs/SECURITY_DISCLOSURE_TR.md",
  "docs/LAUNCH_RUNBOOK_TR.md",
  "store/APP_STORE_METADATA_TR.md",
  "store/GOOGLE_PLAY_METADATA_TR.md",
  "store/PRIVACY_LABELS_TR.md",
  "store/REVIEW_NOTES_TR.md",
  "STORE_SUBMISSION_CHECKLIST.md"
];

for (const doc of requiredDocs) {
  if (!fs.existsSync(path.join(root, doc))) {
    fail(`Canlıya alma dokümanı eksik: ${doc}`);
  }
}

if (!app.ios?.infoPlist?.NSCameraUsageDescription) {
  fail("iOS kamera izin açıklaması eksik.");
}

if (!app.ios?.infoPlist?.NSFaceIDUsageDescription) {
  fail("iOS Face ID izin açıklaması eksik.");
}

if (!app.android?.permissions?.includes("CAMERA")) {
  fail("Android kamera izni eksik.");
}

if (isPublicLaunch && app.ios?.config?.usesNonExemptEncryption !== false) {
  warnings.push("iOS export compliance değeri doğrulanmalı.");
}

if (warnings.length > 0) {
  console.log("Launch warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (failures.length > 0) {
  console.error("Launch readiness failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`PISP ${profile} readiness checks passed.`);
