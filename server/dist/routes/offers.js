"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../auth");
const router = (0, express_1.Router)();
// POST /api/offers  — company creates offer
router.post("/", auth_1.requireAuth, (req, res) => {
    const { companyId } = req.company;
    const { title, description, category, fieldIds, logo, reward, totalBudget, expiresInHours } = req.body;
    if (!title || !description || !category || !fieldIds?.length || !reward || !totalBudget || !expiresInHours) {
        res.status(400).json({ error: "Tüm alanlar zorunludur" });
        return;
    }
    if (reward < 1 || totalBudget < reward) {
        res.status(400).json({ error: "Bütçe en az bir ödülü karşılamalıdır" });
        return;
    }
    const company = db_1.default.prepare("SELECT token_balance FROM companies WHERE id = ?").get(companyId);
    if (!company || company.token_balance < totalBudget) {
        res.status(402).json({ error: `Yetersiz token bakiyesi. Gereken: ${totalBudget}, Mevcut: ${company?.token_balance ?? 0}` });
        return;
    }
    const id = (0, uuid_1.v4)();
    const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();
    // Deduct budget from company balance atomically
    const create = db_1.default.transaction(() => {
        db_1.default.prepare("UPDATE companies SET token_balance = token_balance - ? WHERE id = ?").run(totalBudget, companyId);
        db_1.default.prepare(`
      INSERT INTO offers (id, company_id, title, description, category, field_ids, logo, reward, total_budget, spent_budget, expires_at, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?)
    `).run(id, companyId, title, description, category, JSON.stringify(fieldIds), logo ?? "🏢", reward, totalBudget, expiresAt, new Date().toISOString());
    });
    create();
    // Return the QR payload the company will show to users
    const qrPayload = {
        protocol: "pisp.offer.v1",
        id,
        company: db_1.default.prepare("SELECT name FROM companies WHERE id = ?").get(companyId).name,
        logo: logo ?? "🏢",
        category,
        description,
        fieldIds,
        reward,
        expiresInHours,
        sig: crypto_1.default.createHmac("sha256", process.env.OFFER_SECRET ?? "pisp-offer-secret")
            .update(id).digest("hex").slice(0, 16)
    };
    res.status(201).json({ offer: { id, title, expiresAt, totalBudget }, qrPayload });
});
// GET /api/offers/packages  — token purchase packages (must be before /:id routes)
router.get("/packages", (_req, res) => {
    const packages = db_1.default.prepare("SELECT * FROM token_packages ORDER BY tokens ASC").all();
    res.json({ packages });
});
// GET /api/offers/:id/validate  — mobile app validates before showing to user
router.get("/:id/validate", (req, res) => {
    const offer = db_1.default.prepare(`
    SELECT o.*, c.name as company_name
    FROM offers o JOIN companies c ON o.company_id = c.id
    WHERE o.id = ? AND o.active = 1 AND o.expires_at > ?
  `).get(req.params.id, new Date().toISOString());
    if (!offer) {
        res.status(404).json({ valid: false, error: "Teklif bulunamadı veya süresi dolmuş" });
        return;
    }
    if (offer.spent_budget >= offer.total_budget) {
        res.status(410).json({ valid: false, error: "Teklif bütçesi doldu" });
        return;
    }
    res.json({ valid: true, remainingSlots: (offer.total_budget - offer.spent_budget) / offer.reward });
});
// POST /api/offers/:id/accept  — mobile app records acceptance
router.post("/:id/accept", (req, res) => {
    const { deviceId } = req.body;
    if (!deviceId) {
        res.status(400).json({ error: "deviceId gerekli" });
        return;
    }
    // Hash device ID — we only store the hash, never the real ID
    const deviceHash = crypto_1.default.createHash("sha256").update(deviceId).digest("hex");
    const offer = db_1.default.prepare(`
    SELECT * FROM offers WHERE id = ? AND active = 1 AND expires_at > ?
  `).get(req.params.id, new Date().toISOString());
    if (!offer) {
        res.status(404).json({ success: false, error: "Teklif geçersiz" });
        return;
    }
    // Prevent duplicate acceptance from same device
    const alreadyAccepted = db_1.default.prepare("SELECT id FROM offer_acceptances WHERE offer_id = ? AND device_hash = ?").get(offer.id, deviceHash);
    if (alreadyAccepted) {
        res.status(409).json({ success: false, error: "Bu teklifi zaten kabul ettin" });
        return;
    }
    if (offer.spent_budget + offer.reward > offer.total_budget) {
        res.status(410).json({ success: false, error: "Teklif bütçesi doldu" });
        return;
    }
    const record = db_1.default.transaction(() => {
        db_1.default.prepare(`
      INSERT INTO offer_acceptances (id, offer_id, device_hash, accepted_at)
      VALUES (?, ?, ?, ?)
    `).run((0, uuid_1.v4)(), offer.id, deviceHash, new Date().toISOString());
        db_1.default.prepare("UPDATE offers SET spent_budget = spent_budget + ? WHERE id = ?")
            .run(offer.reward, offer.id);
    });
    record();
    res.json({ success: true, reward: offer.reward });
});
exports.default = router;
