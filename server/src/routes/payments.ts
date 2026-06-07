import { Router, Request } from "express";
import { v4 as uuid } from "uuid";
// @ts-ignore — iyzipay has no official types
import Iyzipay from "iyzipay";
import db from "../db";
import { requireAuth } from "../auth";

const router = Router();

function getIyzipay() {
  return new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY ?? "",
    secretKey: process.env.IYZICO_SECRET_KEY ?? "",
    uri: process.env.IYZICO_ENV === "production"
      ? "https://api.iyzipay.com"
      : "https://sandbox-api.iyzipay.com",
  });
}

// POST /api/payments/initiate  — company initiates token purchase
router.post("/initiate", requireAuth, (req, res) => {
  const { companyId, email } = (req as Request & { company: { companyId: string; email: string } }).company;
  const { packageId, cardHolderName, cardNumber, expireMonth, expireYear, cvc, ip } = req.body as {
    packageId: string;
    cardHolderName: string; cardNumber: string;
    expireMonth: string; expireYear: string; cvc: string;
    ip: string;
  };

  const pkg = db.prepare("SELECT * FROM token_packages WHERE id = ?").get(packageId) as
    { id: string; label: string; tokens: number; price_try: number } | undefined;
  if (!pkg) { res.status(404).json({ error: "Paket bulunamadı" }); return; }

  const company = db.prepare("SELECT name FROM companies WHERE id = ?").get(companyId) as { name: string };
  const paymentId = uuid();
  const conversationId = `pisp-${paymentId.slice(0, 8)}`;

  db.prepare(`
    INSERT INTO payments (id, company_id, package_id, tokens, price_try, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `).run(paymentId, companyId, packageId, pkg.tokens, pkg.price_try, new Date().toISOString());

  const iyzipay = getIyzipay();
  const request = {
    locale: "tr",
    conversationId,
    price: pkg.price_try.toFixed(2),
    paidPrice: pkg.price_try.toFixed(2),
    currency: "TRY",
    installment: "1",
    basketId: paymentId,
    paymentChannel: "WEB",
    paymentGroup: "PRODUCT",
    paymentCard: { cardHolderName, cardNumber: cardNumber.replace(/\s/g, ""), expireMonth, expireYear, cvc, registerCard: "0" },
    buyer: { id: companyId, name: company.name.split(" ")[0] ?? "PISP", surname: company.name.split(" ")[1] ?? "User", gsmNumber: "+905000000000", email, identityNumber: "11111111111", registrationAddress: "Türkiye", ip: ip ?? "85.34.78.112", city: "Istanbul", country: "Turkey", zipCode: "34732" },
    shippingAddress: { contactName: company.name, city: "Istanbul", country: "Turkey", address: "Türkiye", zipCode: "34732" },
    billingAddress: { contactName: company.name, city: "Istanbul", country: "Turkey", address: "Türkiye", zipCode: "34732" },
    basketItems: [{
      id: pkg.id, name: `PISP ${pkg.label} Token Paketi`, category1: "Dijital Ürün",
      itemType: "VIRTUAL", price: pkg.price_try.toFixed(2)
    }],
  };

  iyzipay.payment.create(request, (err: Error, result: { status: string; paymentId?: string; errorMessage?: string }) => {
    if (err || result.status !== "success") {
      db.prepare("UPDATE payments SET status = 'failed' WHERE id = ?").run(paymentId);
      res.status(402).json({ error: result?.errorMessage ?? "Ödeme başarısız" });
      return;
    }
    // Credit tokens immediately on successful payment
    db.transaction(() => {
      db.prepare("UPDATE payments SET status = 'completed', iyzico_payment_id = ?, completed_at = ? WHERE id = ?")
        .run(result.paymentId, new Date().toISOString(), paymentId);
      db.prepare("UPDATE companies SET token_balance = token_balance + ? WHERE id = ?")
        .run(pkg.tokens, companyId);
    })();

    res.json({ success: true, tokens: pkg.tokens, newBalance: (db.prepare("SELECT token_balance FROM companies WHERE id = ?").get(companyId) as { token_balance: number }).token_balance });
  });
});

// POST /api/payments/user-purchase  — mobile user buys tokens directly
const USER_PACKAGES: Record<string, { label: string; tokens: number; price_try: number }> = {
  pkg_100:  { label: "Başlangıç",   tokens: 100,  price_try: 15  },
  pkg_300:  { label: "Popüler",     tokens: 300,  price_try: 40  },
  pkg_500:  { label: "Avantajlı",   tokens: 500,  price_try: 60  },
  pkg_1000: { label: "Süper Değer", tokens: 1000, price_try: 110 },
};

router.post("/user-purchase", (req, res) => {
  const { deviceId, packageId, cardHolderName, cardNumber, expireMonth, expireYear, cvc } = req.body as {
    deviceId: string; packageId: string;
    cardHolderName: string; cardNumber: string;
    expireMonth: string; expireYear: string; cvc: string;
  };

  if (!deviceId || !packageId || !cardHolderName || !cardNumber || !expireMonth || !expireYear || !cvc) {
    res.status(400).json({ error: "Eksik kart bilgisi" }); return;
  }

  const pkg = USER_PACKAGES[packageId];
  if (!pkg) { res.status(404).json({ error: "Paket bulunamadı" }); return; }

  const paymentId = uuid();
  const conversationId = `user-${paymentId.slice(0, 8)}`;
  const shortDevice = deviceId.slice(-8);
  const holderParts = cardHolderName.trim().split(" ");

  const iyzipay = getIyzipay();
  const request = {
    locale: "tr",
    conversationId,
    price: pkg.price_try.toFixed(2),
    paidPrice: pkg.price_try.toFixed(2),
    currency: "TRY",
    installment: "1",
    basketId: paymentId,
    paymentChannel: "MOBILE",
    paymentGroup: "PRODUCT",
    paymentCard: { cardHolderName, cardNumber: cardNumber.replace(/\s/g, ""), expireMonth, expireYear, cvc, registerCard: "0" },
    buyer: { id: shortDevice, name: holderParts[0] ?? "PISP", surname: holderParts.slice(1).join(" ") || "User", gsmNumber: "+905000000000", email: `user-${shortDevice}@pisp.app`, identityNumber: "11111111111", registrationAddress: "Türkiye", ip: "85.34.78.112", city: "Istanbul", country: "Turkey", zipCode: "34732" },
    shippingAddress: { contactName: cardHolderName, city: "Istanbul", country: "Turkey", address: "Türkiye", zipCode: "34732" },
    billingAddress: { contactName: cardHolderName, city: "Istanbul", country: "Turkey", address: "Türkiye", zipCode: "34732" },
    basketItems: [{ id: packageId, name: `PISP ${pkg.label} Token Paketi`, category1: "Dijital Ürün", itemType: "VIRTUAL", price: pkg.price_try.toFixed(2) }],
  };

  const deviceHash = require("crypto").createHash("sha256").update(deviceId).digest("hex") as string;

  iyzipay.payment.create(request, (err: Error, result: { status: string; paymentId?: string; errorMessage?: string }) => {
    if (err || result.status !== "success") {
      res.status(402).json({ error: result?.errorMessage ?? "Ödeme başarısız" }); return;
    }
    db.prepare(`
      INSERT INTO user_payments (id, device_hash, package_id, tokens, price_try, card_holder, status, iyzico_payment_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?)
    `).run(paymentId, deviceHash, packageId, pkg.tokens, pkg.price_try, cardHolderName, result.paymentId ?? paymentId, new Date().toISOString());
    res.json({ success: true, tokens: pkg.tokens, paymentId: result.paymentId ?? paymentId });
  });
});

// GET /api/payments/history
router.get("/history", requireAuth, (req, res) => {
  const { companyId } = (req as Request & { company: { companyId: string } }).company;
  const payments = db.prepare(`
    SELECT p.*, tp.label as package_label
    FROM payments p JOIN token_packages tp ON p.package_id = tp.id
    WHERE p.company_id = ? ORDER BY p.created_at DESC LIMIT 20
  `).all(companyId);
  res.json({ payments });
});

export default router;
