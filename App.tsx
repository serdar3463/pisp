import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, AppState, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Switch, Text, View } from "react-native";

import {
  PolicyContext,
  PolicyState,
  ShareCounts,
  Template,
  VaultValues,
  allFields,
  calculateRiskScore,
  createDisclosurePreview,
  defaultPolicyContext,
  domains,
  getAllowedFields,
  initialPolicy,
  initialShareCounts,
  initialVaultValues
} from "./src/data/pisp";
import { ShareReceipt } from "./src/data/receipts";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { VaultModule } from "./src/components/VaultModule";
import { ShareModule } from "./src/components/ShareModule";
import { HistoryModule } from "./src/components/HistoryModule";
import { MarketplaceModule } from "./src/components/MarketplaceModule";
import { getBiometricStatus, unlockLocalVault } from "./src/services/appLock";
import {
  PrivateVaultSnapshot,
  clearPrivateVault,
  loadPrivateVault,
  savePrivateVault
} from "./src/services/privateVaultStorage";
import { LedgerBlock, createGenesisBlock, createShareBlock } from "./src/services/sovereigntyLedger";
import { CompanyOfferQR, MarketplaceOffer, StoredDocument, TokenTransaction, PREMIUM_TEMPLATE_LIMIT, PREMIUM_TOKEN_COST } from "./src/data/marketplace";
import { pispApi } from "./src/services/pispApi";
import { getOrCreateDeviceIdentity } from "./src/services/deviceIdentity";
import {
  QRDisclosureResponse,
  QRRequest,
  createDisclosureResponse,
  createQRRequest,
  verifyQRRequest
} from "./src/services/qrExchange";
import { calculateVaultCompleteness, createReceipt, validateFieldValue } from "./src/utils/helpers";
import { useToast } from "./src/hooks/useToast";
import { Toast } from "./src/components/ui";
import { colors, radius, spacing, typography } from "./src/theme";
import { AgentModal } from "./src/components/AgentModal";

type ModuleId = "profile" | "share" | "market" | "history";

const EMPTY_TEMPLATE: Template = { id: "", name: "", purpose: "", recipient: "", license: "", royalty: "", fieldIds: [], output: "JSON-LD" };

const MODULES: Array<{ id: ModuleId; label: string; icon: string }> = [
  { id: "profile", label: "Profilim", icon: "🧑" },
  { id: "share", label: "Paylaş", icon: "📤" },
  { id: "market", label: "Pazar", icon: "💎" },
  { id: "history", label: "Geçmiş", icon: "📋" }
];

type BadgeCounts = Partial<Record<ModuleId, number>>;

const RETIRED_DEMO_VALUES = new Set([
  "Serdar Yılmaz", "2001-08-22", "Türkiye",
  "serdar@example.com", "+90 555 013 42 42", "İstanbul", "@serdar",
  "Aile yakını yalnızca yerelde saklanır", "Mobil geliştirici",
  "React Native, TypeScript, Mahremiyet mühendisliği", "pisp.dev/serdar",
  "Bireysel mükellef", "Şablon üreticisi", "2042", "Gizli", "700+",
  "A Rh+", "Penisilin", "Haftalık aktif dakika: 210",
  "Geçerli kimlik belgesi hazır", "AB konferans seyahati",
  "Bilgisayar Mühendisliği", "Kişisel veri egemenliği",
  "Yerel görsel referansı", "PISP ürün ekranları", "Mezuniyet planı: 2026",
  "Özel aile notu", "Önce fayda, sonra mahremiyet değil; ikisi birlikte",
  "Varsayılan olarak asla paylaşılmaz", "did:key:z6Mk-pisp",
  "Yalnızca yerel politika kontrolleri", "3 doğrulanmış proje referansı",
  "Doğrulanmış katkı sağlayıcı"
]);

export default function App() {
  return (
    <ErrorBoundary>
      <RootApp />
    </ErrorBoundary>
  );
}

function RootApp() {
  const [activeModule, setActiveModule] = useState<ModuleId>("profile");
  const [policy, setPolicy] = useState<PolicyState>(initialPolicy);
  const [vaultValues, setVaultValues] = useState<VaultValues>(initialVaultValues);
  const [shareCounts, setShareCounts] = useState<ShareCounts>(initialShareCounts);
  const [policyContext, setPolicyContext] = useState<PolicyContext>(defaultPolicyContext);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [ledger, setLedger] = useState<LedgerBlock[]>([]);
  const [qrRequest, setQrRequest] = useState<QRRequest | null>(null);
  const [scannedRequest, setScannedRequest] = useState<QRRequest | null>(null);
  const [disclosureResponse, setDisclosureResponse] = useState<QRDisclosureResponse | null>(null);
  const [receipts, setReceipts] = useState<ShareReceipt[]>([]);
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [tokenHistory, setTokenHistory] = useState<TokenTransaction[]>([]);
  const [acceptedOfferIds, setAcceptedOfferIds] = useState<string[]>([]);
  const [scannedOffers, setScannedOffers] = useState<MarketplaceOffer[]>([]);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [onboardingAccepted, setOnboardingAccepted] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [lockMessage, setLockMessage] = useState("Kasa kilitli");
  const [showAgent, setShowAgent] = useState(false);

  const allTemplates = useMemo(() => customTemplates, [customTemplates]);
  const selectedTemplate = allTemplates.find((t) => t.id === selectedTemplateId) ?? allTemplates[0];
  const vaultCompleteness = useMemo(() => calculateVaultCompleteness(vaultValues), [vaultValues]);
  const vaultFields = useMemo(() => allFields(vaultValues), [vaultValues]);
  const filledFields = useMemo(() => vaultFields.filter((f) => f.value.trim().length > 0).length, [vaultFields]);
  const totalFields = vaultFields.length;
  const preview = useMemo(() => createDisclosurePreview(selectedTemplate ?? EMPTY_TEMPLATE, policy, vaultValues, policyContext), [policy, policyContext, selectedTemplate, vaultValues]);

  const toast = useToast();


  useEffect(() => {
    let mounted = true;
    loadPrivateVault()
      .then((snapshot) => {
        if (!mounted) return;
        setVaultValues(removeDemoValues(snapshot.vaultValues));
        setPolicy(snapshot.policy);
        setShareCounts(snapshot.shareCounts);
        setReceipts(snapshot.receipts);
        setCustomTemplates(snapshot.customTemplates);
        setTokenBalance(snapshot.tokenBalance);
        setIsPremium(snapshot.isPremium);
        setTokenHistory(snapshot.tokenHistory);
        setAcceptedOfferIds(snapshot.acceptedOfferIds);
        setScannedOffers(snapshot.scannedOffers);
        setDocuments(snapshot.documents);
        setOnboardingAccepted(snapshot.onboardingAccepted);
        setStorageReady(true);
      })
      .catch(() => { if (mounted) setStorageReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    const snapshot: PrivateVaultSnapshot = { vaultValues, policy, shareCounts, receipts, customTemplates, onboardingAccepted, tokenBalance, isPremium, tokenHistory, acceptedOfferIds, scannedOffers, documents, updatedAt: new Date().toISOString() };
    const timeout = setTimeout(() => { void savePrivateVault(snapshot); }, 350);
    return () => clearTimeout(timeout);
  }, [acceptedOfferIds, customTemplates, documents, isPremium, onboardingAccepted, policy, receipts, scannedOffers, shareCounts, storageReady, tokenBalance, tokenHistory, vaultValues]);

  useEffect(() => {
    let mounted = true;
    createGenesisBlock().then((block) => { if (mounted) { setLedger([block]); } });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedTemplate) { setQrRequest(null); return; }
    createQRRequest(selectedTemplate, policyContext).then(setQrRequest);
  }, [policyContext, selectedTemplate]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" && onboardingAccepted) {
        setIsLocked(true);
        setLockMessage("Uygulama arka plana alındığı için kasa kilitlendi");
        void savePrivateVault({ vaultValues, policy, shareCounts, receipts, customTemplates, onboardingAccepted, tokenBalance, isPremium, tokenHistory, acceptedOfferIds, scannedOffers, documents, updatedAt: new Date().toISOString() });
      }
    });
    return () => subscription.remove();
  }, [onboardingAccepted, vaultValues, policy, shareCounts, receipts, customTemplates, tokenBalance, isPremium, tokenHistory, acceptedOfferIds, scannedOffers, documents]);

  function togglePolicy(id: string, value: boolean) {
    const domain = domains.find((d) => d.id === id);
    if (domain) {
      setPolicy((current) => {
        const next = { ...current, [domain.id]: value };
        for (const field of domain.fields) next[field.id] = value;
        return next;
      });
      return;
    }
    setPolicy((current) => ({ ...current, [id]: value }));
  }

  function updateVaultValue(id: string, value: string) {
    setVaultValues((current) => ({ ...current, [id]: value }));
  }

  function restoreSnapshot(snapshot: PrivateVaultSnapshot) {
    setVaultValues(snapshot.vaultValues);
    setPolicy(snapshot.policy);
    setShareCounts(snapshot.shareCounts);
    setReceipts(snapshot.receipts);
    setOnboardingAccepted(snapshot.onboardingAccepted);
    toast.show("Yedek başarıyla geri yüklendi", "success");
  }

  function saveCustomTemplate(template: Template) {
    const isNew = !customTemplates.find((t) => t.id === template.id);
    if (isNew && !isPremium && customTemplates.length >= PREMIUM_TEMPLATE_LIMIT) {
      toast.show(`Ücretsiz planda en fazla ${PREMIUM_TEMPLATE_LIMIT} şablon oluşturabilirsin — Pazar sekmesinden Premium'a geç`, "warning");
      return;
    }
    setCustomTemplates((prev) => {
      const exists = prev.find((t) => t.id === template.id);
      return exists ? prev.map((t) => t.id === template.id ? template : t) : [...prev, template];
    });
    setSelectedTemplateId(template.id);
    toast.show(`"${template.name}" şablonu kaydedildi`, "success");
  }

  function addTokenTransaction(tx: Omit<TokenTransaction, "id" | "timestamp">) {
    const full: TokenTransaction = { ...tx, id: `tx-${Date.now()}`, timestamp: new Date().toISOString() };
    setTokenHistory((prev) => [full, ...prev].slice(0, 50));
    if (tx.type === "earned" || tx.type === "received") setTokenBalance((b) => b + tx.amount);
    if (tx.type === "sent" || tx.type === "spent") setTokenBalance((b) => Math.max(0, b - tx.amount));
  }

  async function acceptOffer(offer: MarketplaceOffer) {
    try {
      const identity = await getOrCreateDeviceIdentity();
      const result = await pispApi.acceptOffer(offer.id, identity.did);
      const userReward = result.reward;
      const commission = offer.reward - userReward;
      setAcceptedOfferIds((prev) => [...prev, offer.id]);
      addTokenTransaction({ type: "earned", amount: userReward, label: `${offer.company} — veri talebi` });
      toast.show(`+${userReward} 💎 kazandın (komisyon: ${commission} 💎)`, "success");
    } catch (e) {
      toast.show((e as Error).message ?? "Teklif kabul edilemedi", "danger");
    }
  }

  async function addScannedOffer(qr: CompanyOfferQR) {
    const offer: MarketplaceOffer = {
      id: qr.id,
      company: qr.company,
      logo: qr.logo,
      category: qr.category,
      description: qr.description,
      fieldIds: qr.fieldIds,
      reward: qr.reward,
      expiresInHours: qr.expiresInHours
    };
    try {
      const validation = await pispApi.validateOffer(qr.id);
      if (!validation.valid) {
        toast.show(validation.error ?? "Teklif geçersiz", "danger");
        return;
      }
    } catch {
      // Backend unreachable — still add offer, will fail on accept
    }
    setScannedOffers((prev) => {
      if (prev.some((o) => o.id === offer.id)) return prev;
      return [...prev, offer];
    });
    toast.show(`${offer.company} teklifi eklendi 🎯`, "success");
  }

  function sendTokens(amount: number, recipientLabel: string) {
    addTokenTransaction({ type: "sent", amount, label: `Gönderildi → ${recipientLabel}` });
    toast.show(`${amount} 💎 gönderildi`, "success");
  }

  function receiveTokens(amount: number, senderLabel: string) {
    addTokenTransaction({ type: "received", amount, label: `Alındı ← ${senderLabel}` });
    toast.show(`+${amount} PISP alındı 💎`, "success");
  }

  function addDocument(doc: StoredDocument) {
    setDocuments((prev) => [doc, ...prev]);
    toast.show(`"${doc.name}" eklendi`, "success");
  }

  function deleteDocument(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    toast.show("Belge silindi", "warning");
  }


  function activatePremium() {
    addTokenTransaction({ type: "spent", amount: PREMIUM_TOKEN_COST, label: "Premium aktivasyonu" });
    setIsPremium(true);
    toast.show("✦ Premium aktif! Sınırsız şablon ve öncelikli teklifler senin.", "success");
  }

  function deleteCustomTemplate(id: string) {
    setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
    if (selectedTemplateId === id) setSelectedTemplateId((prev) => customTemplates.find((t) => t.id !== id)?.id ?? prev);
    toast.show("Şablon silindi", "warning");
  }

  function revokeReceipt(id: string) {
    setReceipts((current) =>
      current.map((r) => r.id === id ? { ...r, revoked: true, revokedAt: new Date().toLocaleString("tr-TR") } : r)
    );
    toast.show("Paylaşım geri çekildi", "warning");
  }

  async function wipeLocalData() {
    await clearPrivateVault();
    setPolicy(initialPolicy);
    setVaultValues(initialVaultValues);
    setShareCounts(initialShareCounts);
    setReceipts([]);
    setCustomTemplates([]);
    setTokenBalance(0);
    setIsPremium(false);
    setTokenHistory([]);
    setAcceptedOfferIds([]);
    setDocuments([]);
    setOnboardingAccepted(false);
    setIsLocked(true);
  }

  function panicClose() {
    const next: PolicyState = {};
    for (const key of Object.keys(policy)) next[key] = false;
    setPolicy(next);
    toast.show("Tüm paylaşım izinleri kapatıldı", "warning");
  }

  async function shareTemplate(template: Template) {
    const allowed = getAllowedFields(template, policy, vaultValues);
    const invalidFields = allowed.map((f) => ({ field: f, error: validateFieldValue(f, f.value) })).filter(({ error }) => error);
    if (invalidFields.length > 0) {
      rejectShare("Paylaşım paketinde geçersiz bilgi var", invalidFields.map(({ field, error }) => `${field.label}: ${error}`));
      toast.show("Geçersiz bilgi var, paylaşım yapılamadı", "danger");
      return;
    }
    if (allowed.length === 0) {
      rejectShare(`${template.name} için açılacak bilgi yok`, ["Yerel izin politikan bu paylaşımı engelledi"]);
      toast.show("Açılacak bilgi yok — izinleri kontrol et", "warning");
      return;
    }
    const block = await createShareBlock({ chain: ledger, template, policy, context: policyContext });
    const receipt = createReceipt({ mode: "direct", template, context: policyContext, disclosedFields: allowed, withheldCount: template.fieldIds.length - allowed.length, riskScore: calculateRiskScore(template, policy, vaultValues), proof: block.blockHash });
    setReceipts((current) => [receipt, ...current].slice(0, 50));
    setLedger((current) => [...current, block]);
    setShareCounts((current) => ({ ...current, [template.id]: (current[template.id] ?? 0) + 1 }));
    toast.show(`${template.name} paylaşıldı — ${allowed.length} alan açıldı`, "success");
    setActiveModule("share");
  }

  function rejectShare(_summary: string, _details: string[]) {
    setActiveModule("profile");
  }

  async function handleScannedRequest(request: QRRequest) {
    setScannedRequest(request);
    setDisclosureResponse(null);
  }

  async function approveScannedRequest() {
    if (!scannedRequest || !verifyQRRequest(scannedRequest).valid) return;
    const template = allTemplates.find((t) => t.id === scannedRequest.templateId) ?? selectedTemplate;
    if (!template) return;
    const allowed = getAllowedFields(template, policy, vaultValues).filter((f) => scannedRequest.requestedFieldIds.includes(f.id));
    const invalidFields = allowed.map((f) => ({ field: f, error: validateFieldValue(f, f.value) })).filter(({ error }) => error);
    if (invalidFields.length > 0) {
      rejectShare("QR yanıtında geçersiz bilgi var", invalidFields.map(({ field, error }) => `${field.label}: ${error}`));
      return;
    }
    const response = await createDisclosureResponse({ request: scannedRequest, template, policy, values: vaultValues, context: policyContext });
    const block = await createShareBlock({ chain: ledger, template, policy, context: { ...policyContext, purpose: scannedRequest.purpose, recipient: scannedRequest.recipient } });
    const receipt = createReceipt({ mode: "qr", template, context: { ...policyContext, purpose: scannedRequest.purpose, recipient: scannedRequest.recipient }, disclosedFields: allowed, withheldCount: response.withheldCount, riskScore: calculateRiskScore(template, policy, vaultValues), proof: block.blockHash });
    setReceipts((current) => [receipt, ...current].slice(0, 50));
    setDisclosureResponse(response);
    setLedger((current) => [...current, block]);
    setShareCounts((current) => ({ ...current, [template.id]: (current[template.id] ?? 0) + 1 }));
  }

  async function unlock() {
    const result = await unlockLocalVault();
    setLockMessage(result.message);
    if (result.ok) setIsLocked(false);
  }

  if (!storageReady) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <View style={styles.splashShell}>
          <View style={styles.splashLogo}>
            <Text style={styles.splashLogoText}>P</Text>
          </View>
          <Text style={styles.splashTitle}>PISP</Text>
          <Text style={styles.splashSub}>Kasa hazırlanıyor...</Text>
          <View style={styles.splashBadge}>
            <Text style={styles.splashVersion}>v1.0.0</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!onboardingAccepted) {
    return (
      <OnboardingScreen
        onAccept={() => {
          setOnboardingAccepted(true);
          setIsLocked(false);
          addTokenTransaction({ type: "earned", amount: 50, label: "🎉 Hoş geldin bonusu" });
          void savePrivateVault({ vaultValues, policy, shareCounts, receipts, customTemplates, onboardingAccepted: true, tokenBalance, isPremium, tokenHistory, acceptedOfferIds, scannedOffers, documents, updatedAt: new Date().toISOString() });
        }}
      />
    );
  }

  if (isLocked) {
    return <LockScreen message={lockMessage} onUnlock={unlock} />;
  }

  const lockFn = () => { setLockMessage("Kasa manuel olarak kilitlendi"); setIsLocked(true); };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Global toast */}
      <View style={styles.toastWrap} pointerEvents="none">
        <Toast message={toast.message} tone={toast.tone} visible={toast.visible} />
      </View>

      {/* ── Sabit Header ──────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>P</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>PISP</Text>
            <Text style={styles.headerSub}>Kişisel veri kasası</Text>
          </View>
        </View>
        <Pressable style={styles.lockBtn} onPress={lockFn}>
          <Text style={styles.lockBtnText}>🔒</Text>
        </Pressable>
      </View>

      {/* ── Modül İçeriği ─────────────────────────────── */}
      <View style={styles.content}>
        {activeModule === "profile" && (
          <VaultModule
            values={vaultValues}
            policy={policy}
            completeness={vaultCompleteness}
            activeSharesCount={receipts.filter((r) => !r.revoked).length}
            documents={documents}
            onChangeValue={updateVaultValue}
            onToggle={togglePolicy}
            onPanicClose={panicClose}
            onAddDocument={addDocument}
            onDeleteDocument={deleteDocument}
          />
        )}
        {activeModule === "share" && (
          <ShareModule
            policy={policy}
            values={vaultValues}
            selectedTemplate={selectedTemplate ?? EMPTY_TEMPLATE}
            allTemplates={allTemplates}
            customTemplates={customTemplates}
            context={policyContext}
            preview={preview}
            lastReceipt={receipts[0] ?? null}
            qrRequest={qrRequest}
            scannedRequest={scannedRequest}
            disclosureResponse={disclosureResponse}
            vaultCompleteness={vaultCompleteness}
            onChangeContext={setPolicyContext}
            onSelectTemplate={setSelectedTemplateId}
            onShare={shareTemplate}
            onSaveTemplate={saveCustomTemplate}
            onDeleteTemplate={deleteCustomTemplate}
            onRequestScanned={handleScannedRequest}
            onApproveScanned={approveScannedRequest}
            onGoToVault={() => setActiveModule("profile")}
          />
        )}
        {activeModule === "market" && (
          <MarketplaceModule
            tokenBalance={tokenBalance}
            tokenHistory={tokenHistory}
            acceptedOfferIds={acceptedOfferIds}
            scannedOffers={scannedOffers}
            vaultValues={vaultValues}
            isPremium={isPremium}
            onAcceptOffer={acceptOffer}
            onAddOffer={addScannedOffer}
            onSendTokens={sendTokens}
            onReceiveTokens={receiveTokens}
            onActivatePremium={activatePremium}
          />
        )}
        {activeModule === "history" && (
          <HistoryModule
            receipts={receipts}
            backupSnapshot={{ vaultValues, policy, shareCounts, receipts, customTemplates, onboardingAccepted, tokenBalance, isPremium, tokenHistory, acceptedOfferIds, scannedOffers, documents, updatedAt: new Date().toISOString() }}
            onRevoke={revokeReceipt}
            onRestoreBackup={restoreSnapshot}
            onLock={lockFn}
            onWipe={wipeLocalData}
          />
        )}
      </View>

      {/* ── AI Agent FAB ──────────────────────────────── */}
      <Pressable style={styles.agentFab} onPress={() => setShowAgent(true)}>
        <Text style={styles.agentFabText}>✦</Text>
      </Pressable>

      {/* ── Sabit Bottom Tab Bar ───────────────────────── */}
      <BottomTabBar
        active={activeModule}
        onSelect={setActiveModule}
        badges={{ history: receipts.filter((r) => !r.revoked).length || undefined }}
      />

      <AgentModal
        visible={showAgent}
        onClose={() => setShowAgent(false)}
        vaultCompleteness={vaultCompleteness}
        filledFields={filledFields}
        totalFields={totalFields}
        activeModule={activeModule}
        tokenBalance={tokenBalance}
        pendingOffers={scannedOffers.filter((o) => !acceptedOfferIds.includes(o.id)).length}
      />
    </SafeAreaView>
  );
}


type OnboardStep = {
  icon: string;
  eyebrow: string;
  headline: string;
  body: string;
  features: Array<{ icon: string; text: string }>;
  isSetupStep?: boolean;
};

const ONBOARD_STEPS: OnboardStep[] = [
  {
    icon: "🔐",
    eyebrow: "HOŞ GELDİN",
    headline: "Bilgilerin sende.\nPaylaşım kontrolü sende.",
    body: "PISP, kişisel bilgilerini telefonunda şifreli tutar. Paylaşmadan önce neyin, kime ve hangi amaçla gideceğini her zaman görürsün.",
    features: [
      { icon: "🏠", text: "Veriler yalnızca cihazında" },
      { icon: "👁", text: "Paylaşmadan önce önizle" },
      { icon: "🔒", text: "Biyometrik koruma" }
    ]
  },
  {
    icon: "⚡",
    eyebrow: "NASIL ÇALIŞIR",
    headline: "3 adımda güvenli paylaşım.",
    body: "Bilgilerini kasana ekle, paylaşım şablonunu seç, onayından sonra yalnızca seçilen bilgi QR ile aktarılır.",
    features: [
      { icon: "1️⃣", text: "Kasanı doldur ve izinleri belirle" },
      { icon: "2️⃣", text: "Şablonu ve alıcıyı seç" },
      { icon: "3️⃣", text: "QR ile minimum bilgi paylaş" }
    ]
  },
  {
    icon: "✅",
    eyebrow: "GİZLİLİK TAAHHÜDÜ",
    headline: "Rızan olmadan\nhiçbir şey paylaşılmaz.",
    body: "KVKK ve GDPR uyumlu. Sunucuya sıfır veri. Her paylaşım öncesi açık onayın alınır.",
    features: [
      { icon: "🇹🇷", text: "KVKK Md. 5/1 uyumlu" },
      { icon: "🇪🇺", text: "GDPR Art. 5 uyumlu" },
      { icon: "📵", text: "Sunucuya sıfır veri gönderilir" }
    ]
  },
  {
    icon: "🛡",
    eyebrow: "GÜVENLİK KURULUMU",
    headline: "Kasanı\nguvenli hâle getir.",
    body: "Bilgilerin AES-256 ile bu cihazda şifrelendi. Sunucuya hiçbir veri gitmez.",
    features: [],
    isSetupStep: true
  }
];

function OnboardingScreen({ onAccept }: { onAccept: () => void }) {
  const [step, setStep] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<{ hasHardware: boolean; isEnrolled: boolean } | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step === 3) {
      getBiometricStatus().then(setBiometricStatus);
    }
  }, [step]);

  function goNext() {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true })
    ]).start();
    setStep((s) => Math.min(s + 1, ONBOARD_STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  const current = ONBOARD_STEPS[step]!;
  const isLast = step === ONBOARD_STEPS.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Progress dots */}
      <View style={styles.onboardDots}>
        {ONBOARD_STEPS.map((_, i) => (
          <View key={i} style={[styles.onboardDot, i === step && styles.onboardDotActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.onboardShell} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.onboardStep, { transform: [{ translateX: slideAnim }] }]}>
          {/* Hero icon */}
          <View style={styles.onboardHero}>
            <View style={styles.onboardLogo}>
              <Text style={styles.onboardLogoEmoji}>{current.icon}</Text>
            </View>
            <Text style={styles.onboardTagline}>{current.eyebrow}</Text>
            <Text style={styles.onboardHeadline}>{current.headline}</Text>
            <Text style={styles.onboardBody}>{current.body}</Text>
          </View>

          {/* Feature list / Security status */}
          {current.isSetupStep ? (
            <View style={styles.onboardFeatures}>
              <View style={styles.featureRow}>
                <Text style={styles.featureIcon}>✅</Text>
                <Text style={styles.featureText}>AES-256 şifreleme aktif</Text>
              </View>
              <View style={styles.featureRow}>
                <Text style={styles.featureIcon}>
                  {biometricStatus === null ? "⏳" : (biometricStatus.hasHardware && biometricStatus.isEnrolled) ? "✅" : "⚠️"}
                </Text>
                <Text style={styles.featureText}>
                  {biometricStatus !== null && (!biometricStatus.hasHardware || !biometricStatus.isEnrolled)
                    ? "Biyometri ayarlanmamış — Ayarlar'dan etkinleştirebilirsin"
                    : "Biyometrik kilit aktif"}
                </Text>
              </View>
              <View style={styles.featureRow}>
                <Text style={styles.featureIcon}>✅</Text>
                <Text style={styles.featureText}>Cihaz kimliği oluşturuldu</Text>
              </View>
            </View>
          ) : (
            <View style={styles.onboardFeatures}>
              {current.features.map((f) => (
                <View key={f.text} style={styles.featureRow}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                  <Text style={styles.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Consent on last step */}
          {isLast && (
            <View style={styles.consentCard}>
              <Text style={styles.consentTitle}>Başlamadan önce</Text>
              <Text style={styles.consentBody}>
                Bu uygulama hassas kişisel bilgi yönetir. Paylaşmadan önce alıcıyı, amacı ve açılacak bilgileri her zaman kontrol et.
              </Text>
              <Pressable style={styles.consentRow} onPress={() => setAccepted((v) => !v)}>
                <View style={styles.consentFlex}>
                  <Text style={styles.consentLabel}>Aydınlatmayı okudum ve anladım</Text>
                  <Text style={styles.consentSub}>
                    Bilgilerimin yalnızca telefonumda kalacağını ve paylaşmadan önce her zaman onay vereceğimi kabul ediyorum.
                  </Text>
                </View>
                <Switch
                  value={accepted}
                  onValueChange={setAccepted}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.white}
                />
              </Pressable>
            </View>
          )}
        </Animated.View>

        {/* Navigation */}
        <View style={styles.onboardNav}>
          {step > 0 ? (
            <Pressable style={styles.onboardBack} onPress={goBack}>
              <Text style={styles.onboardBackText}>← Geri</Text>
            </Pressable>
          ) : <View style={styles.onboardBack} />}

          {isLast ? (
            <Pressable
              style={[styles.ctaButton, !accepted && styles.ctaDisabled]}
              onPress={accepted ? onAccept : undefined}
            >
              <Text style={styles.ctaText}>Güvenli kasayı oluştur 🔐</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.onboardNext} onPress={goNext}>
              <Text style={styles.onboardNextText}>İleri →</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.onboardFooter}>
          Hiçbir verin sunucuya gitmez · KVKK & GDPR uyumlu · v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function LockScreen({ message, onUnlock }: { message: string; onUnlock: () => void | Promise<void> }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.lockShell}>
        <View style={styles.lockLogoWrap}>
          <View style={styles.lockLogo}>
            <Text style={styles.lockLogoText}>🔐</Text>
          </View>
        </View>
        <Text style={styles.lockTitle}>Kasa Kilitli</Text>
        <Text style={styles.lockSub}>{message}</Text>

        <View style={styles.lockInfoCard}>
          <View style={styles.lockInfoRow}>
            <Text style={styles.lockInfoDot}>·</Text>
            <Text style={styles.lockInfoText}>Veriler cihazınızda şifreli</Text>
          </View>
          <View style={styles.lockInfoRow}>
            <Text style={styles.lockInfoDot}>·</Text>
            <Text style={styles.lockInfoText}>Biometrik veya PIN ile açılır</Text>
          </View>
          <View style={styles.lockInfoRow}>
            <Text style={styles.lockInfoDot}>·</Text>
            <Text style={styles.lockInfoText}>Yalnızca siz erişebilirsiniz</Text>
          </View>
        </View>

        <Pressable style={styles.unlockBtn} onPress={onUnlock}>
          <Text style={styles.unlockBtnText}>Kasayı Aç</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function BottomTabBar({ active, onSelect, badges }: { active: ModuleId; onSelect: (id: ModuleId) => void; badges?: BadgeCounts }) {
  return (
    <View style={styles.bottomBar}>
      {MODULES.map((m) => {
        const isActive = m.id === active;
        const badgeCount = badges?.[m.id];
        return (
          <Pressable key={m.id} style={styles.bottomTabItem} onPress={() => onSelect(m.id)}>
            {isActive && <View style={styles.bottomTabIndicator} />}
            <View style={styles.bottomTabIconWrap}>
              <Text style={[styles.bottomTabIcon, isActive && styles.bottomTabIconActive]}>{m.icon}</Text>
              {badgeCount !== undefined && badgeCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{badgeCount > 9 ? "9+" : String(badgeCount)}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.bottomTabLabel, isActive && styles.bottomTabLabelActive]}>{m.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function removeDemoValues(values: VaultValues): VaultValues {
  const cleaned: VaultValues = { ...initialVaultValues };
  for (const [key, value] of Object.entries(values)) {
    cleaned[key] = RETIRED_DEMO_VALUES.has(value) ? "" : value;
  }
  return cleaned;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.bg, flex: 1 },
  content: { flex: 1 },

  // Toast overlay
  toastWrap: { left: spacing.lg, position: "absolute", right: spacing.lg, top: 56, zIndex: 999 },
  agentFab: { alignItems: "center", backgroundColor: colors.accent, borderRadius: 28, bottom: 90, elevation: 8, height: 52, justifyContent: "center", position: "absolute", right: spacing.lg, shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, width: 52, zIndex: 100 },
  agentFabText: { color: "#fff", fontSize: 22, fontWeight: "800" },

  // Splash
  splashShell: { alignItems: "center", flex: 1, gap: spacing.lg, justifyContent: "center", padding: spacing.xxl },
  splashLogo: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.xl, height: 72, justifyContent: "center", width: 72 },
  splashLogoText: { color: colors.white, fontSize: 32, fontWeight: "900" },
  splashTitle: { ...typography.display, color: colors.textPrimary },
  splashSub: { ...typography.body, color: colors.textSecondary },
  splashBadge: { backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  splashVersion: { ...typography.caption, color: colors.textTertiary },

  // Header
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerLeft: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  brandMark: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.md, height: 40, justifyContent: "center", width: 40 },
  brandMarkText: { color: colors.white, fontSize: 18, fontWeight: "900" },
  headerTitle: { ...typography.heading2, color: colors.textPrimary },
  headerSub: { ...typography.caption, color: colors.textSecondary },
  lockBtn: { alignItems: "center", backgroundColor: colors.bgElevated, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  lockBtnText: { fontSize: 18 },

  // Bottom tab bar
  bottomBar: { backgroundColor: colors.bgCard, borderColor: colors.border, borderTopWidth: 1, flexDirection: "row", paddingBottom: spacing.lg, paddingTop: spacing.sm },
  bottomTabItem: { alignItems: "center", flex: 1, gap: 3, paddingVertical: spacing.sm, position: "relative" },
  bottomTabIndicator: { backgroundColor: colors.accent, borderRadius: radius.full, height: 2, left: "30%", position: "absolute", right: "30%", top: 0 },
  bottomTabIconWrap: { position: "relative" },
  bottomTabIcon: { fontSize: 20, opacity: 0.5 },
  bottomTabIconActive: { opacity: 1 },
  bottomTabLabel: { color: colors.textTertiary, fontSize: 11, fontWeight: "500" },
  bottomTabLabelActive: { color: colors.accentLight, fontWeight: "700" },
  tabBadge: { alignItems: "center", backgroundColor: colors.accent, borderColor: colors.bg, borderRadius: radius.full, borderWidth: 1.5, height: 16, justifyContent: "center", minWidth: 16, position: "absolute", right: -6, top: -4 },
  tabBadgeText: { color: colors.white, fontSize: 9, fontWeight: "700" },

  // Onboarding
  onboardDots: { flexDirection: "row", gap: spacing.sm, justifyContent: "center", paddingTop: spacing.lg },
  onboardDot: { backgroundColor: colors.border, borderRadius: radius.full, height: 6, width: 24 },
  onboardDotActive: { backgroundColor: colors.accent, width: 40 },
  onboardShell: { gap: spacing.xl, padding: spacing.xl, paddingBottom: 48 },
  onboardStep: { gap: spacing.xl },
  onboardHero: { alignItems: "center", gap: spacing.md, paddingTop: spacing.lg },
  onboardLogo: { alignItems: "center", backgroundColor: colors.accentDim, borderColor: colors.accent, borderRadius: radius.xl, borderWidth: 1, height: 80, justifyContent: "center", width: 80 },
  onboardLogoEmoji: { fontSize: 36 },
  onboardTagline: { ...typography.overline, color: colors.accent, letterSpacing: 3 },
  onboardHeadline: { ...typography.heading1, color: colors.textPrimary, textAlign: "center" },
  onboardBody: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  onboardFeatures: { backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.xl },
  featureRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  featureIcon: { fontSize: 20, width: 28 },
  featureText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  onboardNav: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  onboardBack: { flex: 1 },
  onboardBackText: { ...typography.label, color: colors.textSecondary },
  onboardNext: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.md, flex: 2, paddingVertical: spacing.xl },
  onboardNextText: { ...typography.label, color: colors.white, fontSize: 15 },
  consentCard: { backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.lg, padding: spacing.xl },
  consentTitle: { ...typography.heading3, color: colors.textPrimary },
  consentBody: { ...typography.body, color: colors.textSecondary },
  consentRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  consentFlex: { flex: 1, gap: spacing.xs },
  consentLabel: { ...typography.label, color: colors.textPrimary },
  consentSub: { ...typography.caption, color: colors.textSecondary },
  ctaButton: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.md, flex: 2, paddingVertical: spacing.xl },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { ...typography.label, color: colors.white, fontSize: 15 },
  onboardFooter: { ...typography.caption, color: colors.textTertiary, textAlign: "center" },

  // Lock screen
  lockShell: { alignItems: "center", flex: 1, gap: spacing.xl, justifyContent: "center", padding: spacing.xxl },
  lockLogoWrap: { alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  lockLogo: { alignItems: "center", backgroundColor: colors.bgElevated, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, height: 88, justifyContent: "center", width: 88 },
  lockLogoText: { fontSize: 40 },
  lockTitle: { ...typography.heading1, color: colors.textPrimary },
  lockSub: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  lockInfoCard: { backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.xl, width: "100%" },
  lockInfoRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm },
  lockInfoDot: { color: colors.accent, fontSize: 20, lineHeight: 22 },
  lockInfoText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  unlockBtn: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing.xl, width: "100%" },
  unlockBtnText: { ...typography.label, color: colors.white, fontSize: 16 }
});
