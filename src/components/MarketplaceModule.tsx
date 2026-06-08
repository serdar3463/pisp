import { useEffect, useRef, useState } from "react";
import { Alert, ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  endConnection,
  finishTransaction,
  fetchProducts,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from "react-native-iap";
import type { ProductIOS, Purchase, PurchaseError } from "react-native-iap";
import QRCode from "react-native-qrcode-svg";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";

import {
  CompanyOfferQR,
  MarketplaceOffer,
  MIN_WITHDRAWAL_TOKENS,
  PREMIUM_TEMPLATE_LIMIT,
  PREMIUM_TOKEN_COST,
  TOKEN_TRY_RATE,
  TokenTransaction,
} from "../data/marketplace";
import { allFields, VaultValues } from "../data/pisp";
import { getOrCreateDeviceIdentity } from "../services/deviceIdentity";
import { pispApi } from "../services/pispApi";
import { colors, radius, spacing, typography } from "../theme";
import { Card, Section } from "./ui";

type Props = {
  tokenBalance: number;
  tokenHistory: TokenTransaction[];
  acceptedOfferIds: string[];
  scannedOffers: MarketplaceOffer[];
  vaultValues: VaultValues;
  isPremium: boolean;
  onAcceptOffer: (offer: MarketplaceOffer) => void;
  onAddOffer: (qr: CompanyOfferQR) => void;
  onSendTokens: (amount: number, recipientLabel: string) => void;
  onReceiveTokens: (amount: number, senderLabel: string) => void;
  onActivatePremium: () => void;
};

type TokenQRPayload = {
  protocol: "pisp.token.v1";
  action: "request";
  label: string;
  shortId: string;
};

type TokenPackage = {
  sku: string;
  label: string;
  tokens: number;
  fallbackPrice: string;
  popular?: boolean;
  bonus?: string;
};

const CATEGORY_FILTERS = ["Tümü", "İK", "Sağlık", "Finans", "Araştırma"] as const;

const TOKEN_PACKAGES: TokenPackage[] = [
  { sku: "com.pisp.mobile.tokens.100",  label: "Başlangıç",   tokens: 100,  fallbackPrice: "₺15,00" },
  { sku: "com.pisp.mobile.tokens.300",  label: "Popüler",     tokens: 300,  fallbackPrice: "₺40,00", popular: true, bonus: "%11 avantaj" },
  { sku: "com.pisp.mobile.tokens.500",  label: "Avantajlı",   tokens: 500,  fallbackPrice: "₺60,00", bonus: "%20 avantaj" },
  { sku: "com.pisp.mobile.tokens.1000", label: "Süper Değer", tokens: 1000, fallbackPrice: "₺110,00", bonus: "%27 avantaj" },
];

const FAQ_ITEMS = [
  {
    q: "Verilerim kimin elinde?",
    a: "Verileriniz yalnızca kendi cihazınızda, AES-256 şifreli olarak saklanır. PISP sunucularına asla gönderilmez. Veri paylaşım QR kodu bile doğrudan cihazınızda oluşturulur — araya giren sunucu yoktur.",
  },
  {
    q: "Token nasıl kazanırım?",
    a: "Şirket temsilcisinin gösterdiği PISP QR kodunu 'Teklif Tara' ile okutun. Hangi bilgilerin istendiğini ve karşılığında ne kadar token kazanacağınızı görürsünüz. Onayladığınızda token bakiyeniz anında artar.",
  },
  {
    q: "Token'ları nakde ne zaman çevirebilirim?",
    a: `Minimum ${MIN_WITHDRAWAL_TOKENS} 💎 bakiyeye ulaştığınızda pisp.app/odemeler adresinden IBAN'ınıza çekim yapabilirsiniz. İşlemler genellikle 1–3 iş günü içinde hesabınıza geçer. %10 işlem ücreti uygulanır.`,
  },
  {
    q: "Hangi bilgilerimi paylaşacağım?",
    a: "Her teklif, talep ettiği alanları açıkça listeler. Kasanızda bulunmayan bilgiler paylaşılamaz. Her adımda onay veya reddetme hakkınız saklıdır — PISP hiçbir zaman zorla paylaşım yapmaz.",
  },
  {
    q: "Ödeme yaptıktan sonra token ne zaman gelir?",
    a: "Ödeme onaylandıktan sonra tokenlar saniyeler içinde bakiyenize yansır. Kart bilgileriniz güvenli şekilde Iyzico altyapısı üzerinden işlenir, PISP sunucularında saklanmaz.",
  },
];

const SAMPLE_OFFERS: CompanyOfferQR[] = [
  {
    protocol: "pisp.offer.v1",
    id: "sample-ik-001",
    company: "Kariyer Teknoloji A.Ş.",
    logo: "💼",
    category: "İK",
    description: "İşe alım profili — yazılım geliştirici pozisyonu",
    fieldIds: ["fullName", "email", "role", "skills", "linkedIn"],
    reward: 30,
    expiresInHours: 72,
  },
  {
    protocol: "pisp.offer.v1",
    id: "sample-saglik-001",
    company: "Güven Sigorta A.Ş.",
    logo: "🏥",
    category: "Sağlık",
    description: "Bireysel sağlık sigortası profil değerlendirmesi",
    fieldIds: ["fullName", "birthDate", "bloodType", "allergies", "chronicConditions"],
    reward: 60,
    expiresInHours: 48,
  },
  {
    protocol: "pisp.offer.v1",
    id: "sample-finans-001",
    company: "Dijital Finansman A.Ş.",
    logo: "🏦",
    category: "Finans",
    description: "Bireysel kredi başvurusu için gelir profili",
    fieldIds: ["fullName", "taxId", "employmentStatus", "monthlyIncome", "email"],
    reward: 100,
    expiresInHours: 24,
  },
  {
    protocol: "pisp.offer.v1",
    id: "sample-arastirma-001",
    company: "Anket & Araştırma Merkezi",
    logo: "📊",
    category: "Araştırma",
    description: "Tüketici alışkanlıkları araştırması",
    fieldIds: ["fullName", "birthDate", "city", "education", "occupation"],
    reward: 20,
    expiresInHours: 168,
  },
];


export function MarketplaceModule(props: Props) {
  const [activeFilter, setActiveFilter] = useState<string>("Tümü");
  const [showReceiveQR, setShowReceiveQR] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<0 | 1 | 2 | 3>(0);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawIBAN, setWithdrawIBAN] = useState("");
  const [withdrawHolder, setWithdrawHolder] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawRequestId, setWithdrawRequestId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanningOffer, setScanningOffer] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<MarketplaceOffer | null>(null);
  const [dataQR, setDataQR] = useState<string | null>(null);
  const [sendAmount, setSendAmount] = useState("");
  const [scannedTarget, setScannedTarget] = useState<TokenQRPayload | null>(null);
  const [deviceShortId, setDeviceShortId] = useState("——");
  const [sortByReward, setSortByReward] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();

  // Payment state
  const [showBuyTokens, setShowBuyTokens] = useState(false);
  const [iapReady, setIapReady] = useState(false);
  const [iapProducts, setIapProducts] = useState<ProductIOS[]>([]);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const pendingPkgRef = useRef<TokenPackage | null>(null);

  // FAQ accordion state
  const [faqOpen, setFaqOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getOrCreateDeviceIdentity()
      .then((id) => setDeviceShortId(id.did.slice(-8)))
      .catch(() => setDeviceShortId("——"));
  }, []);

  useEffect(() => {
    const skus = TOKEN_PACKAGES.map((p) => p.sku);
    initConnection()
      .then(() => fetchProducts({ skus, type: "in-app" }))
      .then((products) => {
        const list = products as ProductIOS[];
        setIapProducts(list);
        setIapReady(list.length > 0);
      })
      .catch(() => setIapReady(false));

    const updateSub = purchaseUpdatedListener(async (purchase: Purchase) => {
      const pkg = pendingPkgRef.current ?? TOKEN_PACKAGES.find((p) => p.sku === purchase.productId);
      if (pkg) props.onReceiveTokens(pkg.tokens, `${pkg.label} paketi satın alındı`);
      await finishTransaction({ purchase, isConsumable: true }).catch(() => {});
      setPurchaseLoading(null);
      pendingPkgRef.current = null;
      setShowBuyTokens(false);
    });

    const errorSub = purchaseErrorListener((error: PurchaseError) => {
      setPurchaseLoading(null);
      pendingPkgRef.current = null;
      if ((error.code as string) !== "E_USER_CANCELLED") {
        Alert.alert("Ödeme Hatası", error.message || "Satın alma başarısız.");
      }
    });

    return () => {
      updateSub.remove();
      errorSub.remove();
      endConnection();
    };
  }, []);

  const visibleOffers = props.scannedOffers
    .filter((o) => (activeFilter === "Tümü" || o.category === activeFilter) && !props.acceptedOfferIds.includes(o.id))
    .sort((a, b) => sortByReward ? b.reward - a.reward : a.expiresInHours - b.expiresInHours);

  const receivePayload: TokenQRPayload = {
    protocol: "pisp.token.v1",
    action: "request",
    label: `PISP-${deviceShortId}`,
    shortId: deviceShortId,
  };

  const totalEarned = props.tokenHistory
    .filter((t) => t.type === "earned" || t.type === "received")
    .reduce((s, t) => s + t.amount, 0);
  const totalSpent = props.tokenHistory
    .filter((t) => t.type === "spent" || t.type === "sent")
    .reduce((s, t) => s + t.amount, 0);

  const balanceTL = (props.tokenBalance * TOKEN_TRY_RATE).toFixed(2);
  const earnedTL = (totalEarned * TOKEN_TRY_RATE).toFixed(2);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyEarned = props.tokenHistory
    .filter((t) => (t.type === "earned" || t.type === "received") && t.timestamp.startsWith(thisMonth))
    .reduce((s, t) => s + t.amount, 0);

  function handleScan(result: BarcodeScanningResult) {
    try {
      const parsed = JSON.parse(result.data) as Partial<TokenQRPayload>;
      if (parsed.protocol === "pisp.token.v1" && parsed.action === "request") {
        setScannedTarget(parsed as TokenQRPayload);
        setScanning(false);
      }
    } catch { /* not a token QR */ }
  }

  function handleOfferScan(result: BarcodeScanningResult) {
    try {
      const parsed = JSON.parse(result.data) as Partial<CompanyOfferQR>;
      if (parsed.protocol === "pisp.offer.v1" && parsed.id && parsed.company) {
        props.onAddOffer(parsed as CompanyOfferQR);
        setScanningOffer(false);
      }
    } catch { /* not an offer QR */ }
  }

  function confirmAccept() {
    if (!pendingOffer) return;
    const fields = allFields(props.vaultValues);
    const data: Record<string, string> = {};
    pendingOffer.fieldIds.forEach((fid) => {
      const f = fields.find((x) => x.id === fid);
      if (f && f.value.trim()) data[f.label] = f.value;
    });
    const payload = JSON.stringify({
      protocol: "pisp.data.v1",
      offerId: pendingOffer.id,
      company: pendingOffer.company,
      issuedAt: new Date().toISOString(),
      data,
    });
    props.onAcceptOffer(pendingOffer);
    setPendingOffer(null);
    setDataQR(payload);
  }

  function confirmSend() {
    const amt = parseInt(sendAmount, 10);
    if (!scannedTarget || isNaN(amt) || amt <= 0) return;
    if (amt > props.tokenBalance) {
      Alert.alert("Yetersiz bakiye", `En fazla ${props.tokenBalance} 💎 gönderebilirsin.`);
      return;
    }
    props.onSendTokens(amt, scannedTarget.label);
    setScannedTarget(null);
    setSendAmount("");
  }

  function handleActivatePremium() {
    if (props.tokenBalance < PREMIUM_TOKEN_COST) {
      Alert.alert(
        "Yetersiz Bakiye",
        `Sınırsız şablon için ${PREMIUM_TOKEN_COST} 💎 gerekli.\nŞu an: ${props.tokenBalance} 💎\n\nDaha fazla teklif kabul ederek token kazan.`
      );
      return;
    }
    Alert.alert(
      "Sınırsız Şablon Özelliği",
      `${PREMIUM_TOKEN_COST} 💎 harcayarak sınırsız özel şablon oluşturma özelliğini aktif etmek istiyor musun?`,
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Aktif Et", onPress: props.onActivatePremium },
      ]
    );
  }

  async function handleIAPPurchase(pkg: TokenPackage) {
    if (!iapReady || purchaseLoading) return;
    pendingPkgRef.current = pkg;
    setPurchaseLoading(pkg.sku);
    setShowBuyTokens(false);
    try {
      await requestPurchase({ request: { apple: { sku: pkg.sku } }, type: "in-app" });
    } catch {
      setPurchaseLoading(null);
      pendingPkgRef.current = null;
    }
  }

  function iapPrice(sku: string, fallback: string) {
    const p = iapProducts.find((x) => x.id === sku);
    return p?.displayPrice ?? fallback;
  }


  function toggleFaq(q: string) {
    setFaqOpen((prev) => ({ ...prev, [q]: !prev[q] }));
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Cüzdan Kartı ─────────────────────────── */}
      <View style={styles.walletCard}>
        <View style={styles.walletTop}>
          <Text style={styles.walletLabel}>PISP Ödül Puanı</Text>
          <View style={styles.tlBadge}>
            <Text style={styles.tlBadgeText}>≈ {balanceTL} ₺</Text>
          </View>
        </View>
        <Text style={styles.walletBalance}>💎 {props.tokenBalance}</Text>
        <View style={styles.walletStats}>
          <View style={styles.walletStatItem}>
            <Text style={styles.walletStatValue}>{totalEarned}</Text>
            <Text style={styles.walletStatLabel}>Toplam Kazanılan</Text>
            <Text style={styles.walletStatTL}>{earnedTL} ₺</Text>
          </View>
          <View style={styles.walletStatDivider} />
          <View style={styles.walletStatItem}>
            <Text style={[styles.walletStatValue, { color: "#facc15" }]}>{monthlyEarned}</Text>
            <Text style={styles.walletStatLabel}>Bu Ay</Text>
            <Text style={styles.walletStatTL}>{(monthlyEarned * TOKEN_TRY_RATE).toFixed(2)} ₺</Text>
          </View>
          <View style={styles.walletStatDivider} />
          <View style={styles.walletStatItem}>
            <Text style={[styles.walletStatValue, { color: colors.danger }]}>{totalSpent}</Text>
            <Text style={styles.walletStatLabel}>Harcanan</Text>
            <Text style={styles.walletStatTL}>&nbsp;</Text>
          </View>
        </View>
        {props.tokenBalance === 0 && (
          <View style={styles.earnHint}>
            <Text style={styles.earnHintText}>💡 Teklifleri kabul ederek puan kazan · 1 💎 = {TOKEN_TRY_RATE.toFixed(2)} ₺</Text>
          </View>
        )}
        <View style={styles.walletActions}>
          <Pressable style={styles.walletBtn} onPress={() => setShowReceiveQR(true)}>
            <Text style={styles.walletBtnText}>📥 Al</Text>
          </Pressable>
          <Pressable style={styles.walletBtn} onPress={async () => {
            if (!permission?.granted) await requestPermission();
            setScanning(true);
          }}>
            <Text style={styles.walletBtnText}>📤 Gönder</Text>
          </Pressable>
          <Pressable style={[styles.walletBtn, styles.redeemBtn]} onPress={() => setWithdrawStep(1)}>
            <Text style={styles.walletBtnText}>💳 Çevir</Text>
          </Pressable>
        </View>
        <Pressable style={styles.buyTokensBtn} onPress={() => setShowBuyTokens(true)}>
          <Text style={styles.buyTokensBtnText}>+ Token Satın Al</Text>
        </Pressable>
        <Text style={styles.rateNote}>1 💎 = {TOKEN_TRY_RATE.toFixed(2)} ₺ · Nakde çevirim: pisp.app/odemeler</Text>
      </View>

      {/* ── Kategori Filtreleri ──────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
        {CATEGORY_FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterPillText, activeFilter === f && styles.filterPillTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Şirket Teklifleri ────────────────────── */}
      <View style={styles.offerHeader}>
        <View>
          <Text style={styles.offerSectionEyebrow}>PAZAR</Text>
          <Text style={styles.offerSectionTitle}>Şirket Teklifleri</Text>
        </View>
        <View style={styles.offerHeaderRight}>
          {props.scannedOffers.length > 0 && (
            <Pressable style={styles.sortToggle} onPress={() => setSortByReward((v) => !v)}>
              <Text style={styles.sortToggleText}>
                {sortByReward ? "💎 En yüksek" : "⏰ Süreye göre"}
              </Text>
            </Pressable>
          )}
          <Pressable style={styles.scanOfferBtn} onPress={async () => {
            if (!permission?.granted) await requestPermission();
            setScanningOffer(true);
          }}>
            <Text style={styles.scanOfferBtnText}>+ Teklif Tara</Text>
          </Pressable>
        </View>
      </View>

      {visibleOffers.length === 0 ? (
        <Card>
          {props.scannedOffers.length === 0 ? (
            <>
              <Text style={styles.emptyTitle}>Nasıl çalışır?</Text>
              <Text style={styles.emptyText}>
                Şirketler sana PISP teklif QR kodu gösterir. Sen tara, hangi bilgilerin paylaşılacağını gör ve onayla — puan kazan.
              </Text>
              <View style={styles.howSteps}>
                <Text style={styles.howStep}>1 · Şirketten QR kodu iste</Text>
                <Text style={styles.howStep}>{'2 · "Teklif Tara" ile okut'}</Text>
                <Text style={styles.howStep}>3 · Bilgileri onayla → puan kazan</Text>
              </View>
              <Text style={styles.sampleLabel}>Örnek teklifler</Text>
              <View style={styles.sampleBtnRow}>
                {SAMPLE_OFFERS.map((offer) => (
                  <Pressable key={offer.id} style={styles.sampleBtn} onPress={() => props.onAddOffer(offer)}>
                    <Text style={styles.sampleBtnEmoji}>{offer.logo}</Text>
                    <Text style={styles.sampleBtnCategory}>{offer.category}</Text>
                    <Text style={styles.sampleBtnReward}>+{offer.reward} 💎</Text>
                    <Text style={styles.sampleBtnTL}>≈ {(offer.reward * TOKEN_TRY_RATE).toFixed(2)} ₺</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>Bu kategoride bekleyen teklif yok.</Text>
          )}
        </Card>
      ) : (
        visibleOffers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} onAccept={() => setPendingOffer(offer)} />
        ))
      )}

      {/* ── Eğitim Rehberi ───────────────────────── */}
      <Section title="Nasıl Çalışır?" eyebrow="REHBER" />

      <View style={styles.stepsCard}>
        <StepRow n={1} icon="🔐" title="Kasanı doldur" desc="Ad, e-posta, meslek, sağlık bilgileri... Kasanda ne kadar çok bilgi olursa sana uygun o kadar çok teklif gelir." />
        <StepRow n={2} icon="📷" title="Teklif QR'ını tara" desc={'Şirket temsilcisi PISP QR kodunu gösterdiğinde "Teklif Tara" butonuna bas ve kamerana göster.'} />
        <StepRow n={3} icon="👁" title="İncele ve karar ver" desc="Hangi bilgiler isteniyor, karşılığında kaç token kazanacaksın — hepsini görürsün. İstersen reddedebilirsin." last={false} />
        <StepRow n={4} icon="💎" title="Token kazan" desc={`Onayladığın her paylaşım için belirlenen token anında bakiyene eklenir. 1 💎 = ${TOKEN_TRY_RATE.toFixed(2)} ₺`} />
        <StepRow n={5} icon="💳" title="Nakde çevir" desc={`${MIN_WITHDRAWAL_TOKENS} 💎 ve üzerinde bakiyeni IBAN'ına çekebilirsin. pisp.app/odemeler üzerinden talep oluştur.`} last />
      </View>

      {/* ── Gizlilik Güvenceleri ─────────────────── */}
      <View style={styles.privacyCard}>
        <Text style={styles.privacyTitle}>🔒 Gizlilik Güvenceleri</Text>
        <View style={styles.privacyGrid}>
          {[
            "Kişisel veriler asla sunucuya gönderilmez",
            "AES-256 şifreleme — yalnızca cihazınızda",
            "Her paylaşımda açık onayınız gerekir",
            "İstediğiniz zaman reddedebilirsiniz",
            "KVKK ve GDPR uyumlu",
            "Face ID / Touch ID ile kilit",
          ].map((item) => (
            <View key={item} style={styles.privacyItem}>
              <Text style={styles.privacyCheck}>✓</Text>
              <Text style={styles.privacyItemText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Token Kazanç Örnekleri ───────────────── */}
      <View style={styles.earningsCard}>
        <Text style={styles.earningsTitle}>💡 Ne Kadar Kazanabilirsin?</Text>
        <Text style={styles.earningsSubtitle}>Örnek teklifler ve kazanç değerleri</Text>
        {[
          { icon: "📊", label: "Anket & Araştırma",      tokens: 20,  category: "Araştırma" },
          { icon: "💼", label: "İK / İşe Alım Profili",  tokens: 30,  category: "İK" },
          { icon: "🏥", label: "Sigorta Sağlık Profili", tokens: 60,  category: "Sağlık" },
          { icon: "🏦", label: "Finans / Kredi Profili", tokens: 100, category: "Finans" },
        ].map((row) => (
          <View key={row.label} style={styles.earningsRow}>
            <Text style={styles.earningsIcon}>{row.icon}</Text>
            <View style={styles.flex}>
              <Text style={styles.earningsLabel}>{row.label}</Text>
              <Text style={styles.earningsCategory}>{row.category}</Text>
            </View>
            <View style={styles.earningsReward}>
              <Text style={styles.earningsToken}>+{row.tokens} 💎</Text>
              <Text style={styles.earningsTL}>≈ {(row.tokens * TOKEN_TRY_RATE).toFixed(2)} ₺</Text>
            </View>
          </View>
        ))}
        <View style={styles.earningsTotalRow}>
          <Text style={styles.earningsTotalLabel}>Tüm teklifleri kabul edersen</Text>
          <Text style={styles.earningsTotalValue}>210 💎 · ≈ 31.50 ₺</Text>
        </View>
      </View>

      {/* ── Token Hesaplayıcı ────────────────────── */}
      <View style={styles.calcCard}>
        <Text style={styles.earningsTitle}>🧮 Kazanç Hesaplayıcı</Text>
        <Text style={styles.earningsSubtitle}>Kasanı ne kadar doldurursan o kadar çok kazan</Text>
        {[
          { label: "Yalnızca temel bilgiler (ad, e-posta)", pct: 20, est: 40 },
          { label: "Kişisel + meslek bilgileri", pct: 50, est: 180 },
          { label: "Tam profil (sağlık dahil)", pct: 85, est: 420 },
          { label: "Tüm alanlar dolu", pct: 100, est: 600 },
        ].map((row) => (
          <View key={row.label} style={styles.calcRow}>
            <View style={styles.flex}>
              <Text style={styles.calcLabel}>{row.label}</Text>
              <View style={styles.calcBarBg}>
                <View style={[styles.calcBarFill, { width: `${row.pct}%` }]} />
              </View>
            </View>
            <View style={styles.calcReward}>
              <Text style={styles.calcTokens}>~{row.est} 💎</Text>
              <Text style={styles.calcTL}>≈ {(row.est * TOKEN_TRY_RATE).toFixed(0)} ₺</Text>
            </View>
          </View>
        ))}
        <Text style={styles.calcNote}>* Aylık tahmin, teklife göre değişir</Text>
      </View>

      {/* ── Sıkça Sorulan Sorular ───────────────── */}
      <Section title="Sıkça Sorulan Sorular" eyebrow="SSS" />
      {FAQ_ITEMS.map((item) => (
        <FAQItem
          key={item.q}
          question={item.q}
          answer={item.a}
          open={!!faqOpen[item.q]}
          onToggle={() => toggleFaq(item.q)}
        />
      ))}

      {/* ── Token Kullan ─────────────────────────── */}
      <Section title="Özellik Kilidi Aç" eyebrow="PUANLARINI KULLAN" />
      <View style={styles.featureCard}>
        <View style={styles.featureCardHeader}>
          <View style={styles.featureIconBox}>
            <Text style={styles.featureIconText}>✦</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.featureCardTitle}>Sınırsız Özel Şablon</Text>
            <Text style={styles.featureCardDesc}>
              {props.isPremium
                ? "Aktif — sınırsız şablon oluşturabilirsin"
                : `Ücretsiz planda en fazla ${PREMIUM_TEMPLATE_LIMIT} şablon oluşturulabilir`}
            </Text>
          </View>
          {props.isPremium ? (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>✓ Aktif</Text>
            </View>
          ) : (
            <Pressable
              style={[styles.unlockBtn, props.tokenBalance < PREMIUM_TOKEN_COST && styles.unlockBtnDim]}
              onPress={handleActivatePremium}
            >
              <Text style={styles.unlockBtnText}>{PREMIUM_TOKEN_COST} 💎</Text>
            </Pressable>
          )}
        </View>
        {!props.isPremium && (
          <View style={styles.featureProgressBar}>
            <View style={[styles.featureProgressFill, { width: `${Math.min(100, (props.tokenBalance / PREMIUM_TOKEN_COST) * 100)}%` }]} />
          </View>
        )}
        {!props.isPremium && (
          <Text style={styles.featureProgressLabel}>
            {props.tokenBalance}/{PREMIUM_TOKEN_COST} 💎 · {Math.max(0, PREMIUM_TOKEN_COST - props.tokenBalance)} puan daha gerekli
          </Text>
        )}
      </View>

      {/* ── Kabul Edilen Teklifler ───────────────── */}
      {props.acceptedOfferIds.length > 0 && (
        <>
          <Section title="Tamamlananlar" eyebrow="GEÇMİŞ" />
          <Card>
            {props.scannedOffers.filter((o) => props.acceptedOfferIds.includes(o.id)).map((o, idx) => (
              <View key={o.id} style={[styles.completedRow, idx > 0 && styles.rowBorder]}>
                <Text style={styles.completedLogo}>{o.logo}</Text>
                <View style={styles.flex}>
                  <Text style={styles.completedCompany}>{o.company}</Text>
                  <Text style={styles.completedDesc}>{o.description}</Text>
                </View>
                <View style={styles.completedRewardCol}>
                  <Text style={styles.completedReward}>+{o.reward} 💎</Text>
                  <Text style={styles.completedTL}>≈ {(o.reward * TOKEN_TRY_RATE).toFixed(2)} ₺</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* ── İşlem Geçmişi ───────────────────────── */}
      {props.tokenHistory.length > 0 && (
        <>
          <Section title="İşlem Geçmişi" eyebrow="CÜZDAN" />
          <Card>
            {props.tokenHistory.slice(0, 8).map((tx, idx) => (
              <View key={tx.id} style={[styles.txRow, idx > 0 && styles.rowBorder]}>
                <Text style={styles.txIcon}>{tx.type === "earned" || tx.type === "received" ? "⬆" : "⬇"}</Text>
                <View style={styles.flex}>
                  <Text style={styles.txLabel}>{tx.label}</Text>
                  <Text style={styles.txTime}>{new Date(tx.timestamp).toLocaleDateString("tr-TR")}</Text>
                </View>
                <View style={styles.txAmountCol}>
                  <Text style={[styles.txAmount, (tx.type === "earned" || tx.type === "received") ? styles.txPositive : styles.txNegative]}>
                    {(tx.type === "earned" || tx.type === "received") ? "+" : "−"}{tx.amount} 💎
                  </Text>
                  <Text style={styles.txTL}>
                    {(tx.type === "earned" || tx.type === "received") ? "+" : "−"}{(tx.amount * TOKEN_TRY_RATE).toFixed(2)} ₺
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* ── Token Al — QR Modal ─────────────────── */}
      <Modal visible={showReceiveQR} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Puan Al</Text>
            <Text style={styles.sheetSub}>Karşı taraf bu QR kodu okutarak sana puan gönderebilir.</Text>
            <View style={styles.qrBox}>
              <QRCode value={JSON.stringify(receivePayload)} size={180} backgroundColor={colors.bgCard} color={colors.textPrimary} />
            </View>
            <Text style={styles.deviceId}>Adres: PISP-{deviceShortId}</Text>
            <Pressable style={styles.closeBtn} onPress={() => setShowReceiveQR(false)}>
              <Text style={styles.closeBtnText}>Kapat</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Token Gönder — Kamera ───────────────── */}
      <Modal visible={scanning} animationType="slide">
        <View style={styles.scanShell}>
          <Text style={styles.scanTitle}>{"Alıcının QR'ını tara"}</Text>
          {permission?.granted ? (
            <CameraView style={styles.camera} facing="back" onBarcodeScanned={handleScan} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} />
          ) : (
            <Pressable style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>Kamera İzni Ver</Text>
            </Pressable>
          )}
          <Pressable style={styles.closeBtn} onPress={() => setScanning(false)}>
            <Text style={styles.closeBtnText}>İptal</Text>
          </Pressable>
        </View>
      </Modal>

      {/* ── Token Gönder — Miktar ───────────────── */}
      <Modal visible={scannedTarget !== null} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Puan Gönder</Text>
            <Text style={styles.sheetSub}>Alıcı: {scannedTarget?.label}</Text>
            <Text style={styles.sheetSub}>Bakiyeniz: {props.tokenBalance} 💎</Text>
            <TextInput
              style={styles.amountInput}
              value={sendAmount}
              onChangeText={setSendAmount}
              keyboardType="number-pad"
              placeholder="Miktar girin"
              placeholderTextColor={colors.textTertiary}
            />
            <View style={styles.btnRow}>
              <Pressable style={[styles.closeBtn, styles.flex]} onPress={() => { setScannedTarget(null); setSendAmount(""); }}>
                <Text style={styles.closeBtnText}>İptal</Text>
              </Pressable>
              <Pressable style={[styles.confirmBtn, styles.flex]} onPress={confirmSend}>
                <Text style={styles.confirmBtnText}>Gönder</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Teklif QR Tarayıcı ─────────────────── */}
      <Modal visible={scanningOffer} animationType="slide">
        <View style={styles.scanShell}>
          <Text style={styles.scanTitle}>Şirket Teklifi Tara</Text>
          <Text style={styles.sheetSub}>Şirketin PISP teklif QR kodunu kameraya göster</Text>
          {permission?.granted ? (
            <CameraView style={styles.camera} facing="back" onBarcodeScanned={handleOfferScan} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} />
          ) : (
            <Pressable style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>Kamera İzni Ver</Text>
            </Pressable>
          )}
          <Pressable style={styles.closeBtn} onPress={() => setScanningOffer(false)}>
            <Text style={styles.closeBtnText}>İptal</Text>
          </Pressable>
        </View>
      </Modal>

      {/* ── Teklif Onay Modalı ─────────────────── */}
      <Modal visible={pendingOffer !== null} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{pendingOffer?.logo} {pendingOffer?.company}</Text>
            <Text style={styles.sheetSub}>{pendingOffer?.description}</Text>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardBig}>+{pendingOffer?.reward} 💎</Text>
              <Text style={styles.rewardTL}>≈ {((pendingOffer?.reward ?? 0) * TOKEN_TRY_RATE).toFixed(2)} ₺</Text>
            </View>
            <View style={styles.fieldList}>
              <Text style={styles.fieldListTitle}>Paylaşılacak bilgiler:</Text>
              {pendingOffer && allFields(props.vaultValues)
                .filter((f) => pendingOffer.fieldIds.includes(f.id))
                .map((f) => (
                  <View key={f.id} style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    <Text style={[styles.fieldValue, !f.value.trim() && styles.fieldEmpty]}>
                      {f.value.trim() || "— kasada yok"}
                    </Text>
                  </View>
                ))}
            </View>
            <View style={styles.btnRow}>
              <Pressable style={[styles.closeBtn, styles.flex]} onPress={() => setPendingOffer(null)}>
                <Text style={styles.closeBtnText}>İptal</Text>
              </Pressable>
              <Pressable style={[styles.confirmBtn, styles.flex]} onPress={confirmAccept}>
                <Text style={styles.confirmBtnText}>Onayla ve QR Oluştur</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Veri QR Modalı ─────────────────────── */}
      <Modal visible={dataQR !== null} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Veri QR Kodu</Text>
            <Text style={styles.sheetSub}>Şirket temsilcisi bu kodu okusun. Okutulduğunda kapanabilirsin.</Text>
            <View style={styles.qrBox}>
              {dataQR && <QRCode value={dataQR} size={220} backgroundColor="#fff" color="#000" />}
            </View>
            <Pressable style={styles.closeBtn} onPress={() => setDataQR(null)}>
              <Text style={styles.closeBtnText}>Kapat</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Nakde Çevirme (Binance-style) ──────── */}
      <Modal visible={withdrawStep > 0} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
          <View style={[styles.sheet, { maxHeight: "88%" }]}>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Header */}
              <View style={styles.buyHeader}>
                <Text style={styles.sheetTitle}>
                  {withdrawStep === 1 ? "💳 Çekim Miktarı" : withdrawStep === 2 ? "🏦 Hesap Bilgileri" : "✅ Talep Alındı"}
                </Text>
                {withdrawStep < 3 && (
                  <Pressable onPress={() => { setWithdrawStep(0); setWithdrawAmount(""); setWithdrawIBAN(""); setWithdrawHolder(""); }} hitSlop={12}>
                    <Text style={styles.buyCloseX}>✕</Text>
                  </Pressable>
                )}
              </View>

              {/* Progress dots */}
              <View style={styles.withdrawProgress}>
                {[1, 2, 3].map((s) => (
                  <View key={s} style={[styles.withdrawDot, withdrawStep >= s && styles.withdrawDotActive]} />
                ))}
              </View>

              {/* Step 1: Amount */}
              {withdrawStep === 1 && (
                <View style={styles.withdrawBody}>
                  <View style={styles.withdrawBalanceCard}>
                    <Text style={styles.withdrawBalanceLabel}>Mevcut Bakiye</Text>
                    <Text style={styles.withdrawBalanceValue}>{props.tokenBalance} 💎</Text>
                    <Text style={styles.withdrawBalanceTL}>≈ {balanceTL} ₺</Text>
                  </View>

                  <Text style={styles.inputLabel}>Çekmek istediğiniz token miktarı</Text>
                  <TextInput
                    style={styles.cardInput}
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                    keyboardType="number-pad"
                    placeholder={`Min. ${MIN_WITHDRAWAL_TOKENS} 💎`}
                    placeholderTextColor={colors.textTertiary}
                  />
                  {withdrawAmount && !isNaN(Number(withdrawAmount)) && Number(withdrawAmount) > 0 && (
                    <View style={styles.orderSummary}>
                      <View style={styles.redeemRow}>
                        <Text style={styles.redeemLabel}>Çekilecek tutar</Text>
                        <Text style={styles.redeemValue}>{withdrawAmount} 💎</Text>
                      </View>
                      <View style={styles.redeemRow}>
                        <Text style={styles.redeemLabel}>Tahmini TL</Text>
                        <Text style={[styles.redeemValue, { color: colors.success }]}>
                          ≈ {(Number(withdrawAmount) * TOKEN_TRY_RATE).toFixed(2)} ₺
                        </Text>
                      </View>
                      <View style={styles.redeemRow}>
                        <Text style={styles.redeemLabel}>Kalan bakiye</Text>
                        <Text style={styles.redeemValue}>{props.tokenBalance - Number(withdrawAmount)} 💎</Text>
                      </View>
                    </View>
                  )}

                  <Text style={styles.secureNote}>Minimum çekim: {MIN_WITHDRAWAL_TOKENS} 💎 · 1 💎 = {TOKEN_TRY_RATE.toFixed(2)} ₺</Text>

                  <Pressable
                    style={[styles.payBtn, { marginTop: spacing.lg }]}
                    onPress={() => {
                      const amt = Number(withdrawAmount);
                      if (isNaN(amt) || amt < MIN_WITHDRAWAL_TOKENS) {
                        Alert.alert("Geçersiz Miktar", `Minimum çekim miktarı ${MIN_WITHDRAWAL_TOKENS} 💎'dir.`);
                        return;
                      }
                      if (amt > props.tokenBalance) {
                        Alert.alert("Yetersiz Bakiye", `En fazla ${props.tokenBalance} 💎 çekebilirsiniz.`);
                        return;
                      }
                      setWithdrawStep(2);
                    }}
                  >
                    <Text style={styles.payBtnText}>Devam →</Text>
                  </Pressable>
                </View>
              )}

              {/* Step 2: IBAN */}
              {withdrawStep === 2 && (
                <View style={styles.withdrawBody}>
                  <View style={styles.orderSummary}>
                    <View style={styles.redeemRow}>
                      <Text style={styles.redeemLabel}>Çekim miktarı</Text>
                      <Text style={styles.redeemValue}>{withdrawAmount} 💎</Text>
                    </View>
                    <View style={styles.redeemRow}>
                      <Text style={styles.redeemLabel}>Tahmini alacağınız</Text>
                      <Text style={[styles.redeemValue, { color: colors.success }]}>
                        ≈ {(Number(withdrawAmount) * TOKEN_TRY_RATE).toFixed(2)} ₺
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>IBAN</Text>
                  <TextInput
                    style={styles.cardInput}
                    value={withdrawIBAN}
                    onChangeText={(t) => {
                      const clean = t.replace(/[^A-Z0-9]/gi, "").toUpperCase();
                      const withTR = clean.startsWith("TR") ? clean : "TR" + clean.replace(/^TR/i, "");
                      setWithdrawIBAN(withTR.slice(0, 26));
                    }}
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="characters"
                    maxLength={26}
                  />

                  <Text style={styles.inputLabel}>Hesap Sahibi Ad Soyad</Text>
                  <TextInput
                    style={styles.cardInput}
                    value={withdrawHolder}
                    onChangeText={setWithdrawHolder}
                    placeholder="AD SOYAD"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="words"
                  />

                  <Text style={styles.secureNote}>🔒 IBAN bilgileriniz şifreli iletilir ve yalnızca bu işlem için kullanılır</Text>

                  <View style={styles.btnRow}>
                    <Pressable style={[styles.closeBtn, { flex: 1 }]} onPress={() => setWithdrawStep(1)}>
                      <Text style={styles.closeBtnText}>← Geri</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.payBtn, { flex: 2 }, withdrawLoading && styles.payBtnLoading]}
                      disabled={withdrawLoading}
                      onPress={async () => {
                        const ibanClean = withdrawIBAN.replace(/\s/g, "");
                        if (ibanClean.length !== 26) {
                          Alert.alert("Geçersiz IBAN", "IBAN 26 karakter olmalıdır (TR dahil).");
                          return;
                        }
                        if (!withdrawHolder.trim()) {
                          Alert.alert("Eksik Bilgi", "Hesap sahibi adını giriniz.");
                          return;
                        }
                        setWithdrawLoading(true);
                        try {
                          const identity = await getOrCreateDeviceIdentity();
                          const result = await pispApi.requestWithdrawal(identity.did, Number(withdrawAmount));
                          await pispApi.submitWithdrawalIban(result.requestId, ibanClean, withdrawHolder.trim());
                          setWithdrawRequestId(result.requestId);
                          props.onSendTokens(Number(withdrawAmount), "IBAN çekim talebi");
                          setWithdrawStep(3);
                        } catch (e) {
                          Alert.alert("Hata", (e as Error).message ?? "Talep oluşturulamadı.");
                        } finally {
                          setWithdrawLoading(false);
                        }
                      }}
                    >
                      <Text style={styles.payBtnText}>{withdrawLoading ? "İşleniyor..." : "Çekim Talep Et"}</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Step 3: Success */}
              {withdrawStep === 3 && (
                <View style={[styles.withdrawBody, { alignItems: "center" }]}>
                  <View style={styles.withdrawSuccessIcon}>
                    <Text style={{ fontSize: 40 }}>✅</Text>
                  </View>
                  <Text style={styles.withdrawSuccessTitle}>Talebiniz Alındı</Text>
                  <Text style={styles.withdrawSuccessDesc}>
                    {withdrawAmount} 💎 çekim talebiniz başarıyla oluşturuldu. IBAN bilgileriniz kaydedildi.
                  </Text>
                  <View style={styles.orderSummary}>
                    <View style={styles.redeemRow}>
                      <Text style={styles.redeemLabel}>Talep No</Text>
                      <Text style={[styles.redeemValue, { fontSize: 11 }]}>{withdrawRequestId.slice(0, 18)}...</Text>
                    </View>
                    <View style={styles.redeemRow}>
                      <Text style={styles.redeemLabel}>Tahmini Süre</Text>
                      <Text style={styles.redeemValue}>1–3 iş günü</Text>
                    </View>
                    <View style={styles.redeemRow}>
                      <Text style={styles.redeemLabel}>Tahmini Tutar</Text>
                      <Text style={[styles.redeemValue, { color: colors.success }]}>
                        ≈ {(Number(withdrawAmount) * TOKEN_TRY_RATE).toFixed(2)} ₺
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.secureNote}>{"Ödeme IBAN'ınıza banka havalesi olarak yapılacaktır."}</Text>
                  <Pressable
                    style={[styles.payBtn, { width: "100%", marginTop: spacing.md }]}
                    onPress={() => { setWithdrawStep(0); setWithdrawAmount(""); setWithdrawIBAN(""); setWithdrawHolder(""); setWithdrawRequestId(""); }}
                  >
                    <Text style={styles.payBtnText}>Tamam</Text>
                  </Pressable>
                </View>
              )}

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Token Satın Al — Paket Seçimi ──────── */}
      <Modal visible={showBuyTokens} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, styles.buySheet]}>
            <View style={styles.buyHeader}>
              <Text style={styles.sheetTitle}>Token Satın Al</Text>
              <Pressable onPress={() => setShowBuyTokens(false)} hitSlop={12}>
                <Text style={styles.buyCloseX}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.buySubtitle}>Paket seç — Apple Pay ile güvenle öde — tokenlar anında gelir.</Text>

            {!iapReady && (
              <View style={styles.iapErrorBox}>
                <Text style={styles.iapErrorText}>Ürünler yüklenemedi. App Store bağlantısını kontrol et ve tekrar dene.</Text>
              </View>
            )}

            <View style={styles.packageGrid}>
              {TOKEN_PACKAGES.map((pkg) => (
                <Pressable
                  key={pkg.sku}
                  style={[styles.packageCard, pkg.popular && styles.packageCardPopular, purchaseLoading === pkg.sku && styles.packageCardDim]}
                  onPress={() => { void handleIAPPurchase(pkg); }}
                  disabled={!!purchaseLoading || !iapReady}
                >
                  {pkg.popular && <View style={styles.popularBadge}><Text style={styles.popularBadgeText}>Popüler</Text></View>}
                  <Text style={styles.packageTokens}>{pkg.tokens} 💎</Text>
                  {purchaseLoading === pkg.sku
                    ? <ActivityIndicator size="small" color={colors.accent} />
                    : <Text style={styles.packagePrice}>{iapPrice(pkg.sku, pkg.fallbackPrice)}</Text>}
                  {pkg.bonus && <Text style={styles.packageBonus}>{pkg.bonus}</Text>}
                  <Text style={styles.packageLabel}>{pkg.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.secureNote}>🔒 Apple In-App Purchase · Güvenli ve korumalı ödeme</Text>
          </View>
        </View>
      </Modal>


    </ScrollView>
  );
}

function OfferCard({ offer, onAccept }: { offer: MarketplaceOffer; onAccept: () => void }) {
  const categoryColors: Record<string, string> = {
    "İK": "#3b82f6", "Sağlık": "#10b981", "Finans": "#f59e0b", "Araştırma": "#8b5cf6",
  };
  const color = categoryColors[offer.category] ?? colors.accent;
  const rewardTL = (offer.reward * TOKEN_TRY_RATE).toFixed(2);

  return (
    <View style={styles.offerCard}>
      <View style={styles.offerCardHeader}>
        <Text style={styles.offerLogo}>{offer.logo}</Text>
        <View style={styles.flex}>
          <Text style={styles.offerCompany}>{offer.company}</Text>
          <Text style={styles.offerDesc}>{offer.description}</Text>
        </View>
        <View style={styles.offerRewardBadge}>
          <Text style={styles.offerRewardText}>+{offer.reward}</Text>
          <Text style={styles.offerRewardUnit}>💎</Text>
          <Text style={styles.offerRewardTL}>{rewardTL} ₺</Text>
        </View>
      </View>
      <View style={styles.offerFields}>
        {offer.fieldIds.slice(0, 4).map((fid) => (
          <View key={fid} style={styles.fieldChip}>
            <Text style={styles.fieldChipText}>{fid}</Text>
          </View>
        ))}
        {offer.fieldIds.length > 4 && (
          <View style={styles.fieldChip}>
            <Text style={styles.fieldChipText}>+{offer.fieldIds.length - 4}</Text>
          </View>
        )}
      </View>
      <View style={styles.offerFooter}>
        <View style={[styles.categoryBadge, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
          <Text style={[styles.categoryBadgeText, { color }]}>{offer.category}</Text>
        </View>
        <Text style={styles.expiry}>⏱ {offer.expiresInHours}s</Text>
        <Pressable style={styles.acceptBtn} onPress={onAccept}>
          <Text style={styles.acceptBtnText}>Kabul et · +{offer.reward} 💎</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StepRow({ n, icon, title, desc, last }: { n: number; icon: string; title: string; desc: string; last?: boolean }) {
  return (
    <View style={[styles.stepRow, !last && styles.stepRowBorder]}>
      <View style={styles.stepLeft}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{n}</Text>
        </View>
        {!last && <View style={styles.stepLine} />}
      </View>
      <View style={styles.stepContent}>
        <View style={styles.stepTitleRow}>
          <Text style={styles.stepIcon}>{icon}</Text>
          <Text style={styles.stepTitle}>{title}</Text>
        </View>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function FAQItem({ question, answer, open, onToggle }: { question: string; answer: string; open: boolean; onToggle: () => void }) {
  return (
    <Pressable style={[styles.faqItem, open && styles.faqItemOpen]} onPress={onToggle}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Text style={[styles.faqChevron, open && styles.faqChevronOpen]}>{open ? "−" : "+"}</Text>
      </View>
      {open && <Text style={styles.faqAnswer}>{answer}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 40 },
  flex: { flex: 1 },
  rowBorder: { borderTopColor: colors.border, borderTopWidth: 1 },

  // Wallet
  walletCard: { backgroundColor: colors.accent, borderRadius: radius.lg, gap: spacing.sm, padding: spacing.xl },
  walletTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  walletLabel: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "500" },
  tlBadge: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  tlBadgeText: { color: colors.white, fontSize: 13, fontWeight: "700" },
  walletBalance: { color: colors.white, fontSize: 40, fontWeight: "900", letterSpacing: -1 },
  walletStats: { borderTopColor: "rgba(255,255,255,0.2)", borderTopWidth: 1, flexDirection: "row", paddingTop: spacing.sm },
  walletStatItem: { alignItems: "center", flex: 1, gap: 1 },
  walletStatDivider: { backgroundColor: "rgba(255,255,255,0.2)", width: 1 },
  walletStatValue: { color: colors.white, fontSize: 14, fontWeight: "800" },
  walletStatLabel: { color: "rgba(255,255,255,0.6)", fontSize: 9, textAlign: "center" },
  walletStatTL: { color: "rgba(255,255,255,0.5)", fontSize: 10 },
  earnHint: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  earnHintText: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  walletActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  walletBtn: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: radius.md, flex: 1, paddingVertical: spacing.md },
  redeemBtn: { backgroundColor: "rgba(255,255,255,0.25)" },
  walletBtnText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  buyTokensBtn: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.4)", borderRadius: radius.md, borderStyle: "dashed", borderWidth: 1, paddingVertical: spacing.sm },
  buyTokensBtnText: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
  rateNote: { color: "rgba(255,255,255,0.45)", fontSize: 10, textAlign: "center" },

  // Filters
  filterRail: { gap: spacing.sm, paddingBottom: spacing.xs },
  filterPill: { backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  filterPillActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  filterPillText: { ...typography.caption, color: colors.textSecondary },
  filterPillTextActive: { color: colors.accentLight, fontWeight: "700" },

  // Offer section header
  offerHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  offerHeaderRight: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  scanOfferBtn: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  scanOfferBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" as const },
  offerSectionEyebrow: { ...typography.overline, color: colors.textTertiary, letterSpacing: 1.5 },
  offerSectionTitle: { ...typography.heading3, color: colors.textPrimary },
  sortToggle: { backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sortToggleText: { ...typography.caption, color: colors.accentLight, fontWeight: "600" },

  // Empty / sample state
  emptyTitle: { ...typography.heading3, color: colors.textPrimary, textAlign: "center", marginBottom: spacing.xs },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginBottom: spacing.md },
  howSteps: { backgroundColor: colors.bgElevated, borderRadius: radius.md, gap: spacing.sm, padding: spacing.md, width: "100%" },
  howStep: { ...typography.caption, color: colors.textSecondary },
  sampleLabel: { ...typography.overline, color: colors.textTertiary, letterSpacing: 1.5, marginTop: spacing.md },
  sampleBtnRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center", marginTop: spacing.sm },
  sampleBtn: { alignItems: "center", backgroundColor: "rgba(99,102,241,0.10)", borderColor: colors.accent, borderRadius: radius.md, borderWidth: 1, gap: 2, paddingHorizontal: spacing.md, paddingVertical: spacing.md, width: "45%" },
  sampleBtnEmoji: { fontSize: 22 },
  sampleBtnCategory: { ...typography.caption, color: colors.textSecondary },
  sampleBtnReward: { ...typography.label, color: colors.accentLight, fontWeight: "700" },
  sampleBtnTL: { ...typography.caption, color: colors.success },

  // Offer card
  offerCard: { backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  offerCardHeader: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  offerLogo: { fontSize: 28 },
  offerCompany: { ...typography.label, color: colors.textPrimary },
  offerDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  offerRewardBadge: { alignItems: "center", backgroundColor: colors.accentDim, borderColor: colors.accent, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  offerRewardText: { color: colors.accentLight, fontSize: 16, fontWeight: "900" },
  offerRewardUnit: { fontSize: 12 },
  offerRewardTL: { color: colors.success, fontSize: 10, fontWeight: "600" },
  offerFields: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  fieldChip: { backgroundColor: colors.bgElevated, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  fieldChipText: { color: colors.textTertiary, fontSize: 11 },
  offerFooter: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  categoryBadge: { borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  categoryBadgeText: { fontSize: 11, fontWeight: "700" },
  expiry: { ...typography.caption, color: colors.textTertiary, flex: 1 },
  acceptBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  acceptBtnText: { ...typography.label, color: colors.white },

  // Education / Guide section
  stepsCard: { backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  stepRow: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  stepRowBorder: { borderBottomColor: colors.border, borderBottomWidth: 1 },
  stepLeft: { alignItems: "center", width: 28 },
  stepBadge: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.full, height: 28, justifyContent: "center", width: 28 },
  stepBadgeText: { color: colors.white, fontSize: 13, fontWeight: "800" },
  stepLine: { backgroundColor: colors.border, flex: 1, marginTop: 4, width: 1 },
  stepContent: { flex: 1, gap: 4, paddingTop: 3 },
  stepTitleRow: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  stepIcon: { fontSize: 16 },
  stepTitle: { ...typography.label, color: colors.textPrimary },
  stepDesc: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },

  // Privacy card
  privacyCard: { backgroundColor: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.25)", borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  privacyTitle: { ...typography.label, color: colors.success, fontSize: 15 },
  privacyGrid: { gap: spacing.sm },
  privacyItem: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm },
  privacyCheck: { color: colors.success, fontSize: 13, fontWeight: "800", lineHeight: 20 },
  privacyItemText: { ...typography.caption, color: colors.textSecondary, flex: 1, lineHeight: 18 },

  // Earnings examples
  earningsCard: { backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  earningsTitle: { ...typography.label, color: colors.textPrimary, fontSize: 15 },
  earningsSubtitle: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.xs },
  earningsRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, paddingVertical: spacing.xs },
  earningsIcon: { fontSize: 20, width: 28 },
  earningsLabel: { ...typography.caption, color: colors.textPrimary, fontWeight: "600" },
  earningsCategory: { ...typography.caption, color: colors.textTertiary, marginTop: 1 },
  earningsReward: { alignItems: "flex-end" },
  earningsToken: { ...typography.caption, color: colors.accentLight, fontWeight: "700" },
  earningsTL: { ...typography.caption, color: colors.success },
  earningsTotalRow: { alignItems: "center", backgroundColor: colors.bgElevated, borderRadius: radius.md, flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  earningsTotalLabel: { ...typography.caption, color: colors.textSecondary },
  earningsTotalValue: { ...typography.label, color: colors.success },

  // FAQ
  faqItem: { backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.xs, overflow: "hidden", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  faqItemOpen: { borderColor: colors.accent },
  faqHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  faqQuestion: { ...typography.label, color: colors.textPrimary, flex: 1 },
  faqChevron: { color: colors.textTertiary, fontSize: 18, fontWeight: "300", width: 20, textAlign: "center" },
  faqChevronOpen: { color: colors.accentLight },
  faqAnswer: { ...typography.caption, color: colors.textSecondary, lineHeight: 20, marginTop: spacing.sm },

  // Feature unlock card
  featureCard: { backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  featureCardHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  featureIconBox: { alignItems: "center", backgroundColor: colors.accentDim, borderColor: colors.accent, borderRadius: radius.md, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  featureIconText: { color: colors.accentLight, fontSize: 18, fontWeight: "900" },
  featureCardTitle: { ...typography.label, color: colors.textPrimary },
  featureCardDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  activeBadge: { backgroundColor: colors.successDim ?? "rgba(16,185,129,0.15)", borderColor: colors.success, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 4 },
  activeBadgeText: { color: colors.success, fontSize: 12, fontWeight: "700" },
  unlockBtn: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  unlockBtnDim: { opacity: 0.5 },
  unlockBtnText: { color: colors.white, fontSize: 13, fontWeight: "700" },
  featureProgressBar: { backgroundColor: colors.bgElevated, borderRadius: radius.full, height: 4, overflow: "hidden" },
  featureProgressFill: { backgroundColor: colors.accent, borderRadius: radius.full, height: "100%" },
  featureProgressLabel: { ...typography.caption, color: colors.textTertiary },

  // Offer confirm fields
  fieldList: { backgroundColor: colors.bgElevated, borderRadius: radius.md, gap: spacing.xs, padding: spacing.sm },
  fieldListTitle: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  fieldRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  fieldLabel: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  fieldValue: { ...typography.caption, color: colors.textPrimary, flex: 1, textAlign: "right" },
  fieldEmpty: { color: colors.textTertiary, fontStyle: "italic" },
  rewardRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "center" },
  rewardBig: { color: colors.success, fontSize: 22, fontWeight: "900" },
  rewardTL: { color: colors.success, fontSize: 16, fontWeight: "600" },

  // Completed
  completedRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm },
  completedLogo: { fontSize: 20 },
  completedCompany: { ...typography.label, color: colors.textPrimary },
  completedDesc: { ...typography.caption, color: colors.textSecondary },
  completedRewardCol: { alignItems: "flex-end" },
  completedReward: { ...typography.label, color: colors.success },
  completedTL: { ...typography.caption, color: colors.success },

  // Transactions
  txRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm },
  txIcon: { color: colors.textTertiary, fontSize: 14, width: 20 },
  txLabel: { ...typography.label, color: colors.textPrimary },
  txTime: { ...typography.caption, color: colors.textTertiary },
  txAmountCol: { alignItems: "flex-end" },
  txAmount: { ...typography.label },
  txTL: { ...typography.caption, color: colors.textTertiary },
  txPositive: { color: colors.success },
  txNegative: { color: colors.danger },

  // Token purchase modal
  buySheet: { maxHeight: "92%", paddingBottom: 0 },
  buyHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xs },
  buyCloseX: { color: colors.textTertiary, fontSize: 20, fontWeight: "300", padding: spacing.xs },
  buySubtitle: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg },
  packageGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  packageCard: { alignItems: "center", backgroundColor: colors.bgElevated, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1.5, gap: 3, paddingHorizontal: spacing.md, paddingVertical: spacing.md, width: "47%" },
  packageCardSelected: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  packageCardPopular: { borderColor: "#f59e0b" },
  packageCardDim: { opacity: 0.6 },
  popularBadge: { backgroundColor: "#f59e0b", borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  popularBadgeText: { color: "#000", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  packageTokens: { color: colors.textPrimary, fontSize: 22, fontWeight: "900" },
  packagePrice: { color: colors.success, fontSize: 16, fontWeight: "700" },
  packageBonus: { color: colors.accentLight, fontSize: 10, fontWeight: "600" },
  packageLabel: { ...typography.caption, color: colors.textTertiary },
  cardForm: { gap: spacing.sm, marginBottom: spacing.lg },
  cardFormHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xs },
  cardFormTitle: { ...typography.label, color: colors.textPrimary },
  cardBrands: { flexDirection: "row", gap: spacing.xs },
  cardBrandText: { backgroundColor: colors.bgElevated, borderColor: colors.border, borderRadius: 3, borderWidth: 1, color: colors.textTertiary, fontSize: 9, fontWeight: "700", paddingHorizontal: 5, paddingVertical: 2 },
  inputLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  cardInput: { backgroundColor: colors.bgElevated, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.textPrimary, fontSize: 16, fontWeight: "600", letterSpacing: 0.5, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  cardRow2: { flexDirection: "row" },
  orderSummary: { backgroundColor: colors.bgElevated, borderRadius: radius.md, gap: spacing.sm, marginTop: spacing.sm, padding: spacing.md },
  payBtn: { alignItems: "center", backgroundColor: colors.success, borderRadius: radius.md, paddingVertical: spacing.lg },
  payBtnLoading: { opacity: 0.7 },
  payBtnText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  secureNote: { ...typography.caption, color: colors.textTertiary, textAlign: "center" },
  iapErrorBox: { backgroundColor: colors.dangerDim, borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md },
  iapErrorText: { ...typography.caption, color: colors.danger, textAlign: "center" },

  // Modals
  overlay: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)", flex: 1, justifyContent: "center", padding: spacing.xl },
  sheet: { backgroundColor: colors.bgCard, borderRadius: radius.xl, gap: spacing.lg, padding: spacing.xl, width: "100%" },
  sheetTitle: { ...typography.heading2, color: colors.textPrimary, textAlign: "center" },
  sheetSub: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  qrBox: { alignItems: "center", backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.lg },
  deviceId: { ...typography.caption, color: colors.textTertiary, textAlign: "center" },
  closeBtn: { alignItems: "center", backgroundColor: colors.bgElevated, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, paddingVertical: spacing.lg },
  closeBtnText: { ...typography.label, color: colors.textSecondary },
  btnRow: { flexDirection: "row", gap: spacing.sm },
  confirmBtn: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing.lg },
  confirmBtnText: { ...typography.label, color: colors.white },
  amountInput: { backgroundColor: colors.bgElevated, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, color: colors.textPrimary, fontSize: 24, fontWeight: "700", paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, textAlign: "center" },

  // Redeem rows (used in withdrawal modal)
  redeemRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  redeemLabel: { ...typography.caption, color: colors.textSecondary },
  redeemValue: { ...typography.label, color: colors.textPrimary },

  // Calculator card
  calcCard: { backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  calcRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  calcLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  calcBarBg: { backgroundColor: colors.bgElevated, borderRadius: radius.full, height: 6, overflow: "hidden" },
  calcBarFill: { backgroundColor: colors.accent, borderRadius: radius.full, height: "100%" },
  calcReward: { alignItems: "flex-end", minWidth: 70 },
  calcTokens: { ...typography.caption, color: colors.accentLight, fontWeight: "700" },
  calcTL: { ...typography.caption, color: colors.success },
  calcNote: { ...typography.caption, color: colors.textTertiary, fontStyle: "italic", textAlign: "center" },

  // Withdrawal flow
  withdrawProgress: { flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: spacing.lg },
  withdrawDot: { backgroundColor: colors.border, borderRadius: radius.full, height: 8, width: 8 },
  withdrawDotActive: { backgroundColor: colors.accent, width: 24 },
  withdrawBody: { gap: spacing.md },
  withdrawBalanceCard: { alignItems: "center", backgroundColor: colors.accentDim, borderColor: colors.accent, borderRadius: radius.lg, borderWidth: 1, gap: 4, padding: spacing.lg },
  withdrawBalanceLabel: { ...typography.caption, color: colors.textSecondary },
  withdrawBalanceValue: { color: colors.white, fontSize: 32, fontWeight: "900" },
  withdrawBalanceTL: { ...typography.caption, color: colors.accentLight },
  withdrawSuccessIcon: { alignItems: "center", marginVertical: spacing.md },
  withdrawSuccessTitle: { ...typography.heading2, color: colors.textPrimary, textAlign: "center" },
  withdrawSuccessDesc: { ...typography.body, color: colors.textSecondary, textAlign: "center", lineHeight: 22 },

  // Scan
  scanShell: { backgroundColor: colors.bg, flex: 1, gap: spacing.xl, justifyContent: "center", padding: spacing.xl },
  scanTitle: { ...typography.heading2, color: colors.textPrimary, textAlign: "center" },
  camera: { borderRadius: radius.lg, height: 300 },
  permBtn: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing.xl },
  permBtnText: { ...typography.label, color: colors.white },
});
