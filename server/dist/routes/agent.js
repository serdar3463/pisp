"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
const SYSTEM_PROMPT = `Sen PISP uygulamasının yardımcı asistanısın. PISP, kullanıcıların kişisel verilerini AES-256 şifreli saklayan ve QR kodu ile seçici paylaşım yapan bir gizlilik uygulaması.

Görevin:
- Kullanıcının kasasını doldurmada rehberlik et
- Pazar yerindeki teklif akışını açıkla
- QR ile veri paylaşımını anlat
- Gizlilik ve güvenlik sorularını yanıtla

Kurallar:
- Kısa ve net yanıt ver, max 2-3 cümle
- Kullanıcının dilinde yanıt ver (Türkçe veya İngilizce)
- Asla kişisel veri isteme
- Uygulamanın local-first olduğunu vurgula`;
// POST /api/agent — server-side AI proxy (avoids mobile CORS/ATS issues)
router.post("/", async (req, res) => {
    const { messages, context } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: "Mesajlar eksik" });
        return;
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        res.status(503).json({ error: "Agent yapılandırılmamış" });
        return;
    }
    const contextNote = context
        ? `\n[Kasa doluluk %${context.vaultCompleteness ?? 0}, token: ${context.tokenBalance ?? 0} 💎, ekran: ${context.activeModule ?? "?"}]`
        : "";
    const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
    }));
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT + contextNote }] },
                contents,
                generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
            }),
        });
        if (!response.ok) {
            res.status(502).json({ error: `Upstream API hatası: ${response.status}` });
            return;
        }
        const data = await response.json();
        const text = data.candidates[0]?.content?.parts[0]?.text ?? "Yanıt alınamadı.";
        res.json({ text });
    }
    catch (e) {
        res.status(502).json({ error: e.message ?? "Bağlantı hatası" });
    }
});
exports.default = router;
