import { useEffect, useState } from "react";
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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

const CATEGORY_FILTERS = ["Tümü", "İK", "Sağlık", "Finans", "Araştırma"] as const;

const REDEEM_URL = "https://pisp.app/odemeler";

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
  const [showRedemption, setShowRedemption] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanningOffer, setScanningOffer] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<MarketplaceOffer | null>(null);
  const [dataQR, setDataQR] = useState<string | null>(null);
  const [sendAmount, setSendAmount] = useState("");
  const [scannedTarget, setScannedTarget] = useState<TokenQRPayload | null>(null);
  const [deviceShortId, setDeviceShortId] = useState("——");
  const [sortByReward, setSortByReward] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    getOrCreateDeviceIdentity()
      .then((id) => setDeviceShortId(id.did.slice(-8)))
      .catch(() => setDeviceShortId("——"));
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
          <Pressable style={[styles.walletBtn, styles.redeemBtn]} onPress={() => setShowRedemption(true)}>
            <Text style={styles.walletBtnText}>💳 Çevir</Text>
          </Pressable>
        </View>
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
                <Text style={styles.howStep}>2 · "Teklif Tara" ile okut</Text>
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

      {/* ── Nakde Çevirme Bilgi Modalı ───────────── */}
      <Modal visible={showRedemption} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>💳 Nakde Çevir</Text>

            <View style={styles.redeemInfoCard}>
              <View style={styles.redeemRow}>
                <Text style={styles.redeemLabel}>Mevcut bakiyeniz</Text>
                <Text style={styles.redeemValue}>{props.tokenBalance} 💎</Text>
              </View>
              <View style={styles.redeemRow}>
                <Text style={styles.redeemLabel}>Tahmini değer</Text>
                <Text style={[styles.redeemValue, { color: colors.success }]}>≈ {balanceTL} ₺</Text>
              </View>
              <View style={styles.redeemDivider} />
              <View style={styles.redeemRow}>
                <Text style={styles.redeemLabel}>Minimum çekim</Text>
                <Text style={styles.redeemValue}>{MIN_WITHDRAWAL_TOKENS} 💎</Text>
              </View>
              <View style={styles.redeemRow}>
                <Text style={styles.redeemLabel}>Dönüşüm kuru</Text>
                <Text style={styles.redeemValue}>1 💎 = {TOKEN_TRY_RATE.toFixed(2)} ₺</Text>
              </View>
            </View>

            <View style={styles.redeemWebCard}>
              <Text style={styles.redeemWebTitle}>Nasıl nakde çevrilir?</Text>
              <Text style={styles.redeemWebBody}>
                Puanlarını Türk Lirası'na çevirmek için web sitemizi ziyaret et. Hesabını doğrulayıp IBAN'ını ekledikten sonra çekim talebini oluşturabilirsin.
              </Text>
              <Pressable
                style={styles.redeemWebBtn}
                onPress={() => void Linking.openURL(REDEEM_URL)}
              >
                <Text style={styles.redeemWebBtnText}>🌐 pisp.app/odemeler</Text>
              </Pressable>
            </View>

            <Pressable style={styles.closeBtn} onPress={() => setShowRedemption(false)}>
              <Text style={styles.closeBtnText}>Kapat</Text>
            </Pressable>
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

  // Redeem info modal
  redeemInfoCard: { backgroundColor: colors.bgElevated, borderRadius: radius.md, gap: spacing.sm, padding: spacing.lg },
  redeemRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  redeemLabel: { ...typography.caption, color: colors.textSecondary },
  redeemValue: { ...typography.label, color: colors.textPrimary },
  redeemDivider: { backgroundColor: colors.border, height: 1 },
  redeemWebCard: { backgroundColor: colors.accentDim, borderColor: colors.accent, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  redeemWebTitle: { ...typography.label, color: colors.accentLight },
  redeemWebBody: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  redeemWebBtn: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing.md },
  redeemWebBtnText: { ...typography.label, color: colors.white },

  // Scan
  scanShell: { backgroundColor: colors.bg, flex: 1, gap: spacing.xl, justifyContent: "center", padding: spacing.xl },
  scanTitle: { ...typography.heading2, color: colors.textPrimary, textAlign: "center" },
  camera: { borderRadius: radius.lg, height: 300 },
  permBtn: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing.xl },
  permBtnText: { ...typography.label, color: colors.white },
});
