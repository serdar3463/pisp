import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, "../../pisp.db");

// Ensure directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new Database(DB_PATH);

// WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    name        TEXT NOT NULL,
    token_balance INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS token_packages (
    id          TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    tokens      INTEGER NOT NULL,
    price_try   REAL NOT NULL,
    price_per_token REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id          TEXT PRIMARY KEY,
    company_id  TEXT NOT NULL,
    package_id  TEXT NOT NULL,
    tokens      INTEGER NOT NULL,
    price_try   REAL NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    iyzico_token TEXT,
    iyzico_payment_id TEXT,
    created_at  TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS offers (
    id          TEXT PRIMARY KEY,
    company_id  TEXT NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    category    TEXT NOT NULL,
    field_ids   TEXT NOT NULL,
    logo        TEXT NOT NULL DEFAULT '🏢',
    reward      INTEGER NOT NULL,
    total_budget INTEGER NOT NULL,
    spent_budget INTEGER NOT NULL DEFAULT 0,
    expires_at  TEXT NOT NULL,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS offer_acceptances (
    id          TEXT PRIMARY KEY,
    offer_id    TEXT NOT NULL,
    device_hash TEXT NOT NULL,
    accepted_at TEXT NOT NULL,
    FOREIGN KEY (offer_id) REFERENCES offers(id)
  );

  CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id          TEXT PRIMARY KEY,
    device_hash TEXT NOT NULL,
    token_amount INTEGER NOT NULL,
    estimated_try REAL NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    iban        TEXT,
    iban_holder TEXT,
    created_at  TEXT NOT NULL,
    processed_at TEXT
  );
`);

// Seed token packages if empty
const pkgCount = (db.prepare("SELECT COUNT(*) as c FROM token_packages").get() as { c: number }).c;
if (pkgCount === 0) {
  const insert = db.prepare(`
    INSERT INTO token_packages (id, label, tokens, price_try, price_per_token)
    VALUES (?, ?, ?, ?, ?)
  `);
  insert.run("pkg_500",   "Başlangıç",  500,   75.00,  0.15);
  insert.run("pkg_2000",  "İş",         2000,  260.00, 0.13);
  insert.run("pkg_10000", "Kurumsal",   10000, 1100.00, 0.11);
}

export default db;
