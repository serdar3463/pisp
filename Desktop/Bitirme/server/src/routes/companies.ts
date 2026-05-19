import { Router, Request } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import db from "../db";
import { signToken, requireAuth } from "../auth";

const router = Router();

// POST /api/companies/register
router.post("/register", async (req, res) => {
  const { email, password, name } = req.body as { email: string; password: string; name: string };
  if (!email || !password || !name) {
    res.status(400).json({ error: "E-posta, şifre ve şirket adı zorunludur" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Şifre en az 8 karakter olmalıdır" });
    return;
  }
  const existing = db.prepare("SELECT id FROM companies WHERE email = ?").get(email);
  if (existing) {
    res.status(409).json({ error: "Bu e-posta zaten kayıtlı" });
    return;
  }
  const hash = await bcrypt.hash(password, 12);
  const id = uuid();
  db.prepare(`
    INSERT INTO companies (id, email, password, name, token_balance, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(id, email.toLowerCase().trim(), hash, name.trim(), new Date().toISOString());

  const token = signToken({ companyId: id, email });
  res.status(201).json({ token, company: { id, email, name, tokenBalance: 0 } });
});

// POST /api/companies/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: "E-posta ve şifre gerekli" });
    return;
  }
  const company = db.prepare("SELECT * FROM companies WHERE email = ?").get(email.toLowerCase()) as
    { id: string; email: string; password: string; name: string; token_balance: number } | undefined;
  if (!company) {
    res.status(401).json({ error: "E-posta veya şifre hatalı" });
    return;
  }
  const ok = await bcrypt.compare(password, company.password);
  if (!ok) {
    res.status(401).json({ error: "E-posta veya şifre hatalı" });
    return;
  }
  const token = signToken({ companyId: company.id, email: company.email });
  res.json({
    token,
    company: { id: company.id, email: company.email, name: company.name, tokenBalance: company.token_balance }
  });
});

// GET /api/companies/me
router.get("/me", requireAuth, (req, res) => {
  const { companyId } = (req as Request & { company: { companyId: string } }).company;
  const company = db.prepare("SELECT id, email, name, token_balance FROM companies WHERE id = ?").get(companyId) as
    { id: string; email: string; name: string; token_balance: number } | undefined;
  if (!company) { res.status(404).json({ error: "Şirket bulunamadı" }); return; }

  const offers = db.prepare(`
    SELECT id, title, description, category, logo, reward, total_budget, spent_budget, expires_at, active, created_at
    FROM offers WHERE company_id = ? ORDER BY created_at DESC
  `).all(companyId);

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_offers,
      SUM(spent_budget) as total_spent,
      (SELECT COUNT(*) FROM offer_acceptances oa JOIN offers o ON oa.offer_id = o.id WHERE o.company_id = ?) as total_acceptances
    FROM offers WHERE company_id = ?
  `).get(companyId, companyId) as { total_offers: number; total_spent: number; total_acceptances: number };

  res.json({
    company: { id: company.id, email: company.email, name: company.name, tokenBalance: company.token_balance },
    offers,
    stats
  });
});

export default router;
