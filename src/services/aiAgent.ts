export type AgentMessage = {
  role: "user" | "assistant";
  content: string;
};

type AgentContext = {
  vaultCompleteness: number;
  filledFields: number;
  totalFields: number;
  activeModule: string;
  tokenBalance: number;
  pendingOffers: number;
};

const SYSTEM_PROMPT = `Sen PISP uygulamasının içindeki yardımcı asistanısın. PISP, kullanıcıların kişisel verilerini cihazlarında AES-256 şifreli saklayan ve QR kodu ile seçici paylaşım yapan bir gizlilik uygulaması.

Görevin:
- Kullanıcının kasasını doldurmada rehberlik et (kimlik, iletişim, kariyer, sağlık vb.)
- Pazar yerindeki teklif akışını açıkla (şirket QR'ı tara → teklifi kabul et → veri QR'ı oluştur)
- QR ile veri paylaşımını anlat
- Gizlilik ve güvenlik sorularını yanıtla
- Uygulamanın özelliklerini tanıt

Kurallar:
- Kısa ve net yanıt ver, max 2-3 cümle
- Kullanıcının dilinde yanıt ver (Türkçe veya İngilizce)
- Asla kişisel veri isteme
- Uygulamanın local-first olduğunu ve hiçbir verinin sunucuya gitmediğini her zaman vurgula

Uygulama modülleri:
- Kasa: Kişisel verilerin saklandığı yer (14 kategori, 50+ alan)
- Paylaş: QR kodu ile veri paylaşımı, şablon seçimi
- Pazar: Şirket teklifleri, token kazanma, token gönder/al
- Geçmiş: Paylaşım kayıtları, yedek alma
- Ayarlar: Politikalar, güvenlik, veri silme`;

export async function sendAgentMessage(
  messages: AgentMessage[],
  context: AgentContext
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_KEY;
  if (!apiKey || apiKey === "your_gemini_key_here") {
    return "API anahtarı ayarlanmamış. .env dosyasına EXPO_PUBLIC_GEMINI_KEY ekle.";
  }

  const contextNote = `\n[Kullanıcı bağlamı: Kasa doluluk %${context.vaultCompleteness}, ${context.filledFields}/${context.totalFields} alan dolu, aktif ekran: ${context.activeModule}, token bakiyesi: ${context.tokenBalance} 💎, bekleyen teklif: ${context.pendingOffers}]`;

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT + contextNote }] },
        contents,
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`API hatası: ${response.status}`);
  }

  const data = await response.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };

  return data.candidates[0]?.content?.parts[0]?.text ?? "Yanıt alınamadı.";
}
