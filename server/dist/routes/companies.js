"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../auth");
const router = (0, express_1.Router)();
// POST /api/companies/register
router.post("/register", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
        res.status(400).json({ error: "E-posta, şifre ve şirket adı zorunludur" });
        return;
    }
    if (password.length < 8) {
        res.status(400).json({ error: "Şifre en az 8 karakter olmalıdır" });
        return;
    }
    const existing = db_1.default.prepare("SELECT id FROM companies WHERE email = ?").get(email);
    if (existing) {
        res.status(409).json({ error: "Bu e-posta zaten kayıtlı" });
        return;
    }
    const hash = await bcryptjs_1.default.hash(password, 12);
    const id = (0, uuid_1.v4)();
    db_1.default.prepare(`
    INSERT INTO companies (id, email, password, name, token_balance, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(id, email.toLowerCase().trim(), hash, name.trim(), new Date().toISOString());
    const token = (0, auth_1.signToken)({ companyId: id, email });
    res.status(201).json({ token, company: { id, email, name, tokenBalance: 0 } });
});
// POST /api/companies/login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: "E-posta ve şifre gerekli" });
        return;
    }
    const company = db_1.default.prepare("SELECT * FROM companies WHERE email = ?").get(email.toLowerCase());
    if (!company) {
        res.status(401).json({ error: "E-posta veya şifre hatalı" });
        return;
    }
    const ok = await bcryptjs_1.default.compare(password, company.password);
    if (!ok) {
        res.status(401).json({ error: "E-posta veya şifre hatalı" });
        return;
    }
    const token = (0, auth_1.signToken)({ companyId: company.id, email: company.email });
    res.json({
        token,
        company: { id: company.id, email: company.email, name: company.name, tokenBalance: company.token_balance }
    });
});
// GET /api/companies/me
router.get("/me", auth_1.requireAuth, (req, res) => {
    const { companyId } = req.company;
    const company = db_1.default.prepare("SELECT id, email, name, token_balance FROM companies WHERE id = ?").get(companyId);
    if (!company) {
        res.status(404).json({ error: "Şirket bulunamadı" });
        return;
    }
    const offers = db_1.default.prepare(`
    SELECT id, title, description, category, logo, reward, total_budget, spent_budget, expires_at, active, created_at
    FROM offers WHERE company_id = ? ORDER BY created_at DESC
  `).all(companyId);
    const stats = db_1.default.prepare(`
    SELECT
      COUNT(*) as total_offers,
      SUM(spent_budget) as total_spent,
      (SELECT COUNT(*) FROM offer_acceptances oa JOIN offers o ON oa.offer_id = o.id WHERE o.company_id = ?) as total_acceptances
    FROM offers WHERE company_id = ?
  `).get(companyId, companyId);
    res.json({
        company: { id: company.id, email: company.email, name: company.name, tokenBalance: company.token_balance },
        offers,
        stats
    });
});
exports.default = router;
