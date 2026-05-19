const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const baseArg = args.find((arg) => arg.startsWith("--base-url="));
const baseUrl = baseArg?.replace("--base-url=", "").replace(/\/$/, "");

if (!baseUrl || !/^https:\/\/[^/]+\.[^/]+/.test(baseUrl)) {
  console.error("Usage: npm run configure:production -- --base-url=https://your-domain.com");
  console.error("The base URL must be a real https domain.");
  process.exit(1);
}

const urls = {
  privacy: `${baseUrl}/privacy`,
  terms: `${baseUrl}/terms`,
  delete: `${baseUrl}/delete-data`,
  support: `${baseUrl}/support`
};

const appJsonPath = path.join(root, "app.json");
const app = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

app.expo.extra = {
  ...app.expo.extra,
  privacyPolicyUrl: urls.privacy,
  supportUrl: urls.support,
  dataDeletionUrl: urls.delete
};

fs.writeFileSync(appJsonPath, `${JSON.stringify(app, null, 2)}\n`);

const legalPath = path.join(root, "src/data/legal.ts");
let legal = fs.readFileSync(legalPath, "utf8");
legal = legal
  .replace(/https:\/\/pisp\.example\/privacy/g, urls.privacy)
  .replace(/https:\/\/pisp\.example\/terms/g, urls.terms)
  .replace(/https:\/\/pisp\.example\/delete-data/g, urls.delete)
  .replace(/https:\/\/pisp\.example\/support/g, urls.support);

fs.writeFileSync(legalPath, legal);

console.log("Production URLs configured:");
console.log(`- privacy: ${urls.privacy}`);
console.log(`- terms: ${urls.terms}`);
console.log(`- delete: ${urls.delete}`);
console.log(`- support: ${urls.support}`);
console.log("Run npm run launch:check again.");
