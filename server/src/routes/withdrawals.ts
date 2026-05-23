import { Router } from "express";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import db from "../db";

const TOKEN_TRY_RATE = 0.10;
const MIN_WITHDRAWAL = 500;

const router = Router();

// POST /api/withdrawals  — mobile app submits request, no IBAN stored here
router.post("/", (req, res) => {
  const { deviceId, tokenAmount } = req.body as { deviceId: string; tokenAmount: number };
  if (!deviceId || !tokenAmount) {
    res.status(400).json({ error: "deviceId ve tokenAmount gerekli" });
    return;
  }
  if (tokenAmount < MIN_WITHDRAWAL) {
    res.status(400).json({ error: `Minimum çekim: ${MIN_WITHDRAWAL} token` });
    return;
  }

  const deviceHash = crypto.createHash("sha256").update(deviceId).digest("hex");

  // Prevent duplicate pending requests
  const pending = db.prepare(
    "SELECT id FROM withdrawal_requests WHERE device_hash = ? AND status = 'pending'"
  ).get(deviceHash);
  if (pending) {
    res.status(409).json({ error: "Bekleyen bir çekim talebiniz var" });
    return;
  }

  const id = uuid();
  const estimatedTry = parseFloat((tokenAmount * TOKEN_TRY_RATE).toFixed(2));

  db.prepare(`
    INSERT INTO withdrawal_requests (id, device_hash, token_amount, estimated_try, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `).run(id, deviceHash, tokenAmount, estimatedTry, new Date().toISOString());

  res.status(201).json({
    requestId: id,
    tokenAmount,
    estimatedTry,
    message: "Çekim talebiniz alındı. IBAN bilginizi pisp.app/odemeler adresinden girin."
  });
});

// GET /api/withdrawals/:requestId/status  — mobile app polls status
router.get("/:requestId/status", (req, res) => {
  const request = db.prepare(
    "SELECT id, token_amount, estimated_try, status, created_at, processed_at FROM withdrawal_requests WHERE id = ?"
  ).get(req.params.requestId) as
    { id: string; token_amount: number; estimated_try: number; status: string; created_at: string; processed_at: string | null } | undefined;

  if (!request) { res.status(404).json({ error: "Talep bulunamadı" }); return; }
  res.json(request);
});

// PATCH /api/withdrawals/:requestId/iban  — web portal submits IBAN to complete request
router.patch("/:requestId/iban", (req, res) => {
  const { iban, holderName } = req.body as { iban: string; holderName: string };
  if (!iban || !holderName) { res.status(400).json({ error: "IBAN ve isim zorunlu" }); return; }

  const ibanClean = iban.replace(/\s/g, "").toUpperCase();
  if (!ibanClean.startsWith("TR") || ibanClean.length !== 26) {
    res.status(400).json({ error: "Geçersiz Türk IBAN'ı" }); return;
  }

  const row = db.prepare("SELECT id, status FROM withdrawal_requests WHERE id = ?").get(req.params.requestId) as
    { id: string; status: string } | undefined;
  if (!row) { res.status(404).json({ error: "Talep bulunamadı" }); return; }
  if (row.status !== "pending") { res.status(409).json({ error: "Bu talep zaten işleme alındı" }); return; }

  db.prepare("UPDATE withdrawal_requests SET iban = ?, iban_holder = ?, status = 'processing' WHERE id = ?")
    .run(ibanClean, holderName.toUpperCase(), req.params.requestId);

  const updated = db.prepare("SELECT id, status, token_amount, estimated_try, created_at FROM withdrawal_requests WHERE id = ?")
    .get(req.params.requestId) as { id: string; status: string; token_amount: number; estimated_try: number; created_at: string };

  res.json({ requestId: updated.id, status: updated.status, tokenAmount: updated.token_amount, estimatedTry: updated.estimated_try, requestedAt: updated.created_at });
});

// GET /api/withdrawals/admin  — admin lists all (basic auth via env secret)
router.get("/admin/all", (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (secret !== process.env.ADMIN_SECRET) {
    res.status(403).json({ error: "Yetkisiz" });
    return;
  }
  const requests = db.prepare(
    "SELECT * FROM withdrawal_requests ORDER BY created_at DESC LIMIT 100"
  ).all();
  res.json({ requests });
});

// PATCH /api/withdrawals/admin/:id  — admin updates status
router.patch("/admin/:id", (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (secret !== process.env.ADMIN_SECRET) {
    res.status(403).json({ error: "Yetkisiz" }); return;
  }
  const { status } = req.body as { status: string };
  if (!["processing", "completed", "rejected"].includes(status)) {
    res.status(400).json({ error: "Geçersiz durum" }); return;
  }
  db.prepare(
    "UPDATE withdrawal_requests SET status = ?, processed_at = ? WHERE id = ?"
  ).run(status, new Date().toISOString(), req.params.id);
  res.json({ success: true });
});

export default router;
