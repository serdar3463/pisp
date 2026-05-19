import { Router, Request } from "express";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import db from "../db";
import { requireAuth } from "../auth";

const router = Router();

// POST /api/offers  — company creates offer
router.post("/", requireAuth, (req, res) => {
  const { companyId } = (req as Request & { company: { companyId: string } }).company;
  const { title, description, category, fieldIds, logo, reward, totalBudget, expiresInHours } = req.body as {
    title: string; description: string; category: string; fieldIds: string[];
    logo: string; reward: number; totalBudget: number; expiresInHours: number;
  };

  if (!title || !description || !category || !fieldIds?.length || !reward || !totalBudget || !expiresInHours) {
    res.status(400).json({ error: "Tüm alanlar zorunludur" });
    return;
  }
  if (reward < 1 || totalBudget < reward) {
    res.status(400).json({ error: "Bütçe en az bir ödülü karşılamalıdır" });
    return;
  }

  const company = db.prepare("SELECT token_balance FROM companies WHERE id = ?").get(companyId) as
    { token_balance: number } | undefined;
  if (!company || company.token_balance < totalBudget) {
    res.status(402).json({ error: `Yetersiz token bakiyesi. Gereken: ${totalBudget}, Mevcut: ${company?.token_balance ?? 0}` });
    return;
  }

  const id = uuid();
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();

  // Deduct budget from company balance atomically
  const create = db.transaction(() => {
    db.prepare("UPDATE companies SET token_balance = token_balance - ? WHERE id = ?").run(totalBudget, companyId);
    db.prepare(`
      INSERT INTO offers (id, company_id, title, description, category, field_ids, logo, reward, total_budget, spent_budget, expires_at, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?)
    `).run(id, companyId, title, description, category, JSON.stringify(fieldIds), logo ?? "🏢", reward, totalBudget, expiresAt, new Date().toISOString());
  });
  create();

  // Return the QR payload the company will show to users
  const qrPayload = {
    protocol: "pisp.offer.v1",
    id,
    company: (db.prepare("SELECT name FROM companies WHERE id = ?").get(companyId) as { name: string }).name,
    logo: logo ?? "🏢",
    category,
    description,
    fieldIds,
    reward,
    expiresInHours,
    sig: crypto.createHmac("sha256", process.env.OFFER_SECRET ?? "pisp-offer-secret")
      .update(id).digest("hex").slice(0, 16)
  };

  res.status(201).json({ offer: { id, title, expiresAt, totalBudget }, qrPayload });
});

// GET /api/offers/packages  — token purchase packages (must be before /:id routes)
router.get("/packages", (_req, res) => {
  const packages = db.prepare("SELECT * FROM token_packages ORDER BY tokens ASC").all();
  res.json({ packages });
});

// GET /api/offers/:id/validate  — mobile app validates before showing to user
router.get("/:id/validate", (req, res) => {
  const offer = db.prepare(`
    SELECT o.*, c.name as company_name
    FROM offers o JOIN companies c ON o.company_id = c.id
    WHERE o.id = ? AND o.active = 1 AND o.expires_at > ?
  `).get(req.params.id, new Date().toISOString()) as
    ({ id: string; company_name: string; reward: number; total_budget: number; spent_budget: number } & Record<string, unknown>) | undefined;

  if (!offer) {
    res.status(404).json({ valid: false, error: "Teklif bulunamadı veya süresi dolmuş" });
    return;
  }
  if ((offer.spent_budget as unknown as number) >= (offer.total_budget as unknown as number)) {
    res.status(410).json({ valid: false, error: "Teklif bütçesi doldu" });
    return;
  }
  res.json({ valid: true, remainingSlots: ((offer.total_budget as unknown as number) - (offer.spent_budget as unknown as number)) / (offer.reward as unknown as number) });
});

// POST /api/offers/:id/accept  — mobile app records acceptance
router.post("/:id/accept", (req, res) => {
  const { deviceId } = req.body as { deviceId: string };
  if (!deviceId) { res.status(400).json({ error: "deviceId gerekli" }); return; }

  // Hash device ID — we only store the hash, never the real ID
  const deviceHash = crypto.createHash("sha256").update(deviceId).digest("hex");

  const offer = db.prepare(`
    SELECT * FROM offers WHERE id = ? AND active = 1 AND expires_at > ?
  `).get(req.params.id, new Date().toISOString()) as
    ({ id: string; reward: number; total_budget: number; spent_budget: number; company_id: string } & Record<string, unknown>) | undefined;

  if (!offer) {
    res.status(404).json({ success: false, error: "Teklif geçersiz" });
    return;
  }

  // Prevent duplicate acceptance from same device
  const alreadyAccepted = db.prepare(
    "SELECT id FROM offer_acceptances WHERE offer_id = ? AND device_hash = ?"
  ).get(offer.id, deviceHash);
  if (alreadyAccepted) {
    res.status(409).json({ success: false, error: "Bu teklifi zaten kabul ettin" });
    return;
  }

  if ((offer.spent_budget as number) + (offer.reward as number) > (offer.total_budget as number)) {
    res.status(410).json({ success: false, error: "Teklif bütçesi doldu" });
    return;
  }

  const record = db.transaction(() => {
    db.prepare(`
      INSERT INTO offer_acceptances (id, offer_id, device_hash, accepted_at)
      VALUES (?, ?, ?, ?)
    `).run(uuid(), offer.id, deviceHash, new Date().toISOString());
    db.prepare("UPDATE offers SET spent_budget = spent_budget + ? WHERE id = ?")
      .run(offer.reward, offer.id);
  });
  record();

  res.json({ success: true, reward: offer.reward });
});

export default router;
