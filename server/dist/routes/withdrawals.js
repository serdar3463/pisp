"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importDefault(require("../db"));
const TOKEN_TRY_RATE = 0.10;
const MIN_WITHDRAWAL = 500;
const router = (0, express_1.Router)();
// POST /api/withdrawals  — mobile app submits request, no IBAN stored here
router.post("/", (req, res) => {
    const { deviceId, tokenAmount } = req.body;
    if (!deviceId || !tokenAmount) {
        res.status(400).json({ error: "deviceId ve tokenAmount gerekli" });
        return;
    }
    if (tokenAmount < MIN_WITHDRAWAL) {
        res.status(400).json({ error: `Minimum çekim: ${MIN_WITHDRAWAL} token` });
        return;
    }
    const deviceHash = crypto_1.default.createHash("sha256").update(deviceId).digest("hex");
    // Prevent duplicate pending requests
    const pending = db_1.default.prepare("SELECT id FROM withdrawal_requests WHERE device_hash = ? AND status = 'pending'").get(deviceHash);
    if (pending) {
        res.status(409).json({ error: "Bekleyen bir çekim talebiniz var" });
        return;
    }
    const id = (0, uuid_1.v4)();
    const estimatedTry = parseFloat((tokenAmount * TOKEN_TRY_RATE).toFixed(2));
    db_1.default.prepare(`
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
    const request = db_1.default.prepare("SELECT id, token_amount, estimated_try, status, created_at, processed_at FROM withdrawal_requests WHERE id = ?").get(req.params.requestId);
    if (!request) {
        res.status(404).json({ error: "Talep bulunamadı" });
        return;
    }
    res.json(request);
});
// PATCH /api/withdrawals/:requestId/iban  — web portal submits IBAN to complete request
router.patch("/:requestId/iban", (req, res) => {
    const { iban, holderName } = req.body;
    if (!iban || !holderName) {
        res.status(400).json({ error: "IBAN ve isim zorunlu" });
        return;
    }
    const ibanClean = iban.replace(/\s/g, "").toUpperCase();
    if (!ibanClean.startsWith("TR") || ibanClean.length !== 26) {
        res.status(400).json({ error: "Geçersiz Türk IBAN'ı" });
        return;
    }
    const row = db_1.default.prepare("SELECT id, status FROM withdrawal_requests WHERE id = ?").get(req.params.requestId);
    if (!row) {
        res.status(404).json({ error: "Talep bulunamadı" });
        return;
    }
    if (row.status !== "pending") {
        res.status(409).json({ error: "Bu talep zaten işleme alındı" });
        return;
    }
    db_1.default.prepare("UPDATE withdrawal_requests SET iban = ?, iban_holder = ?, status = 'processing' WHERE id = ?")
        .run(ibanClean, holderName.toUpperCase(), req.params.requestId);
    const updated = db_1.default.prepare("SELECT id, status, token_amount, estimated_try, created_at FROM withdrawal_requests WHERE id = ?")
        .get(req.params.requestId);
    res.json({ requestId: updated.id, status: updated.status, tokenAmount: updated.token_amount, estimatedTry: updated.estimated_try, requestedAt: updated.created_at });
});
// GET /api/withdrawals/admin  — admin lists all (basic auth via env secret)
router.get("/admin/all", (req, res) => {
    const secret = req.headers["x-admin-secret"];
    if (secret !== process.env.ADMIN_SECRET) {
        res.status(403).json({ error: "Yetkisiz" });
        return;
    }
    const requests = db_1.default.prepare("SELECT * FROM withdrawal_requests ORDER BY created_at DESC LIMIT 100").all();
    res.json({ requests });
});
// PATCH /api/withdrawals/admin/:id  — admin updates status
router.patch("/admin/:id", (req, res) => {
    const secret = req.headers["x-admin-secret"];
    if (secret !== process.env.ADMIN_SECRET) {
        res.status(403).json({ error: "Yetkisiz" });
        return;
    }
    const { status } = req.body;
    if (!["processing", "completed", "rejected"].includes(status)) {
        res.status(400).json({ error: "Geçersiz durum" });
        return;
    }
    db_1.default.prepare("UPDATE withdrawal_requests SET status = ?, processed_at = ? WHERE id = ?").run(status, new Date().toISOString(), req.params.id);
    res.json({ success: true });
});
exports.default = router;
