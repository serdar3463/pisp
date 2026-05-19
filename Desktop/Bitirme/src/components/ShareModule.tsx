import { useEffect, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import QRCode from "react-native-qrcode-svg";

import { Domain, PolicyContext, PolicyState, Template, VaultValues, createDisclosurePreview, domains, getAllowedFields } from "../data/pisp";
import { ShareReceipt } from "../data/receipts";
import { QRDisclosureResponse, QRRequest, encodeQRPayload, parseQRRequest, verifyQRRequest } from "../services/qrExchange";
import { colors, radius, spacing, typography } from "../theme";
import { Button, Card, Claim, ChoiceChip, Section } from "./ui";

type Props = {
  policy: PolicyState;
  values: VaultValues;
  selectedTemplate: Template;
  allTemplates: Template[];
  customTemplates: Template[];
  context: PolicyContext;
  preview: ReturnType<typeof createDisclosurePreview>;
  lastReceipt: ShareReceipt | null;
  qrRequest: QRRequest | null;
  scannedRequest: QRRequest | null;
  disclosureResponse: QRDisclosureResponse | null;
  vaultCompleteness: number;
  onChangeContext: (c: PolicyContext) => void;
  onSelectTemplate: (id: string) => void;
  onShare: (t: Template) => void | Promise<void>;
  onSaveTemplate: (t: Template) => void;
  onDeleteTemplate: (id: string) => void;
  onRequestScanned: (r: QRRequest) => void | Promise<void>;
  onApproveScanned: () => void | Promise<void>;
  onGoToVault: () => void;
};

export function ShareModule(props: Props) {
  const [building, setBuilding] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  function openBuilder(template?: Template) {
    setEditingTemplate(template ?? null);
    setBuilding(true);
  }

  function closeBuilder() {
    setBuilding(false);
    setEditingTemplate(null);
  }

  if (building) {
    return (
      <TemplateBuilder
        initial={editingTemplate}
        onSave={(t) => { props.onSaveTemplate(t); closeBuilder(); }}
        onCancel={props.allTemplates.length === 0 ? undefined : closeBuilder}
      />
    );
  }

  if (props.allTemplates.length === 0) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={[styles.container, styles.emptyRoot]} showsVerticalScrollIndicator={false}>
        <View style={styles.firstTemplateCard}>
          <Text style={styles.firstTemplateEmoji}>📋</Text>
          <Text style={styles.firstTemplateTitle}>Henüz şablonun yok</Text>
          <Text style={styles.firstTemplateBody}>
            Paylaşmak istediğin bilgileri seçerek kendi şablonunu oluştur.
            Kimlik, iletişim, kariyer — ne kadar açarsan o kadar paylaşılır.
          </Text>
          <Pressable style={styles.firstTemplateBtn} onPress={() => openBuilder()}>
            <Text style={styles.firstTemplateBtnText}>İlk şablonumu oluştur →</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return <SharePanel {...props} onOpenBuilder={openBuilder} />;
}

// ── Template Builder ──────────────────────────────────────────────────────────

type BuilderProps = {
  initial: Template | null;
  onSave: (t: Template) => void;
  onCancel: (() => void) | undefined;
};

function TemplateBuilder({ initial, onSave, onCancel }: BuilderProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initial?.fieldIds ?? [])
  );

  function toggle(fieldId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  }

  function toggleDomain(domain: Domain) {
    const allOn = domain.fields.every((f) => selected.has(f.id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOn) domain.fields.forEach((f) => next.delete(f.id));
      else domain.fields.forEach((f) => next.add(f.id));
      return next;
    });
  }

  function save() {
    if (!name.trim() || selected.size === 0) return;
    const template: Template = {
      id: initial?.id ?? `custom-${Date.now()}`,
      name: name.trim(),
      purpose: "Özel paylaşım",
      recipient: "Karşı taraf",
      license: "—",
      royalty: "—",
      fieldIds: Array.from(selected),
      output: "JSON-LD"
    };
    onSave(template);
  }

  const canSave = name.trim().length > 0 && selected.size > 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.builderHeader}>
        <Text style={styles.builderTitle}>
          {initial ? "Şablonu Düzenle" : "Yeni Şablon Oluştur"}
        </Text>
        {onCancel && (
          <Pressable onPress={onCancel}>
            <Text style={styles.builderCancel}>İptal</Text>
          </Pressable>
        )}
      </View>

      <Card>
        <Text style={styles.condLabel}>Şablon adı</Text>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="Ör: Kiralık Ev, Okul Kaydı..."
          placeholderTextColor={colors.textTertiary}
          autoFocus
          autoCorrect={false}
        />
      </Card>

      <Text style={styles.condLabel}>Hangi bilgileri paylaşmak istiyorsun?</Text>
      <View style={styles.selectedCount}>
        <Text style={styles.selectedCountText}>{selected.size} alan seçildi</Text>
      </View>

      {domains.map((domain) => {
        const domainOn = domain.fields.every((f) => selected.has(f.id));
        const domainPartial = !domainOn && domain.fields.some((f) => selected.has(f.id));
        return (
          <Card key={domain.id}>
            <Pressable style={styles.domainRow} onPress={() => toggleDomain(domain)}>
              <View style={styles.flex}>
                <Text style={styles.domainName}>{domain.name}</Text>
                <Text style={styles.domainDesc}>{domain.description}</Text>
              </View>
              <View style={[
                styles.domainCheck,
                domainOn && styles.domainCheckOn,
                domainPartial && styles.domainCheckPartial
              ]}>
                <Text style={styles.domainCheckText}>
                  {domainOn ? "✓" : domainPartial ? "–" : ""}
                </Text>
              </View>
            </Pressable>

            {domain.fields.map((field, idx) => (
              <Pressable
                key={field.id}
                style={[styles.fieldRow, idx > 0 && styles.fieldBorder]}
                onPress={() => toggle(field.id)}
              >
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <View style={[styles.fieldCheck, selected.has(field.id) && styles.fieldCheckOn]}>
                  {selected.has(field.id) && <Text style={styles.fieldCheckMark}>✓</Text>}
                </View>
              </Pressable>
            ))}
          </Card>
        );
      })}

      <Pressable
        style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
        onPress={canSave ? save : undefined}
      >
        <Text style={styles.saveBtnText}>
          {initial ? "Değişiklikleri kaydet" : `Şablonu oluştur (${selected.size} alan)`}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

// ── Share Panel ───────────────────────────────────────────────────────────────

type SharePanelProps = Props & { onOpenBuilder: (t?: Template) => void };

function SharePanel(props: SharePanelProps) {
  const [consent, setConsent] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [qrConsent, setQrConsent] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => setConsent(false), [props.context, props.selectedTemplate.id]);
  useEffect(() => setQrConsent(false), [props.scannedRequest?.requestId]);

  const disclosedCount = Object.keys(props.preview.disclosedClaims).length;
  const requestPayload = props.qrRequest ? encodeQRPayload(props.qrRequest) : "";
  const responsePayload = props.disclosureResponse ? encodeQRPayload(props.disclosureResponse) : "";
  const verification = props.scannedRequest ? verifyQRRequest(props.scannedRequest) : null;
  const allowedForScanned = props.scannedRequest
    ? getAllowedFields(
        props.allTemplates.find((t) => t.id === props.scannedRequest!.templateId) ?? props.selectedTemplate,
        props.policy,
        props.values
      ).filter((f) => props.scannedRequest!.requestedFieldIds.includes(f.id))
    : [];

  async function openCamera() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) { setScanMsg("Kamera izni gerekli."); return; }
    }
    setScanning(true);
    setScanMsg("QR kodunu çerçeve içine al.");
  }

  function handleBarcode(result: BarcodeScanningResult) {
    const parsed = parseQRRequest(result.data);
    if (!parsed) { setScanMsg("Bu QR PISP formatında değil."); setScanning(false); return; }
    setScanning(false);
    setScanMsg("QR okundu.");
    void props.onRequestScanned(parsed);
  }

  const isCustom = (id: string) => props.customTemplates.some((t) => t.id === id);

  if (props.vaultCompleteness === 0) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🗂</Text>
          <Text style={styles.emptyTitle}>Önce profilini doldur</Text>
          <Text style={styles.emptyText}>
            Paylaşım yapabilmek için Profilim sekmesine geç ve birkaç bilgi ekle.
          </Text>
          <Pressable style={styles.emptyBtn} onPress={props.onGoToVault}>
            <Text style={styles.emptyBtnText}>Profili düzenle →</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* ── Şablon Seç ───────────────────────────────────── */}
      <Text style={styles.stepLabel}>Ne paylaşmak istiyorsun?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRail}>
        {props.allTemplates.map((t) => {
          const allowed = getAllowedFields(t, props.policy, props.values);
          const selected = t.id === props.selectedTemplate.id;
          const custom = isCustom(t.id);
          return (
            <Pressable
              key={t.id}
              style={[styles.templateCard, selected && styles.templateCardActive]}
              onPress={() => props.onSelectTemplate(t.id)}
            >
              {custom && (
                <View style={styles.customBadge}>
                  <Text style={styles.customBadgeText}>Özel</Text>
                </View>
              )}
              <Text style={[styles.templateName, selected && styles.templateNameActive]}>{t.name}</Text>
              <Text style={styles.templateSub}>{allowed.length}/{t.fieldIds.length} bilgi hazır</Text>
              {custom && selected && (
                <View style={styles.templateActions}>
                  <Pressable onPress={() => props.onOpenBuilder(t)}>
                    <Text style={styles.templateActionText}>Düzenle</Text>
                  </Pressable>
                  <Text style={styles.templateActionDivider}>·</Text>
                  <Pressable onPress={() => props.onDeleteTemplate(t.id)}>
                    <Text style={[styles.templateActionText, { color: colors.danger }]}>Sil</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          );
        })}

        {/* Yeni şablon butonu */}
        <Pressable style={styles.newTemplateCard} onPress={() => props.onOpenBuilder()}>
          <Text style={styles.newTemplateIcon}>＋</Text>
          <Text style={styles.newTemplateText}>Yeni{"\n"}Şablon</Text>
        </Pressable>
      </ScrollView>

      {/* ── Amaç & Alıcı ─────────────────────────────────── */}
      <Card>
        <Text style={styles.condLabel}>Amaç</Text>
        <View style={styles.chipRow}>
          {["Kimlik doğrulama", "İşe alım", "Sağlık acil", "Seyahat"].map((p) => (
            <ChoiceChip
              key={p}
              label={p}
              active={props.context.purpose === p}
              onPress={() => props.onChangeContext({ ...props.context, purpose: p })}
            />
          ))}
        </View>
        <Text style={styles.condLabel}>Alıcı</Text>
        <View style={styles.chipRow}>
          {["Karşı taraf", "İK departmanı", "Sağlık görevlisi", "Kamu"].map((r) => (
            <ChoiceChip
              key={r}
              label={r}
              active={props.context.recipient === r}
              onPress={() => props.onChangeContext({ ...props.context, recipient: r })}
            />
          ))}
        </View>
      </Card>

      {/* ── Paylaşılacak Bilgiler ─────────────────────────── */}
      {disclosedCount > 0 ? (
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Paylaşılacak bilgiler</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{disclosedCount} alan</Text>
            </View>
          </View>
          <View style={styles.claimsGrid}>
            {Object.entries(props.preview.disclosedClaims).map(([k, v]) => (
              <Claim key={k} name={k} value={String(v)} />
            ))}
          </View>
        </Card>
      ) : (
        <Card>
          <Text style={styles.emptyTitle}>Paylaşılacak bilgi yok</Text>
          <Text style={styles.emptySubtext}>
            Bu şablona ait alanları profiline ekle veya şablonu düzenle.
          </Text>
        </Card>
      )}

      {/* ── Onay & Paylaş ────────────────────────────────── */}
      {disclosedCount > 0 && (
        <Card>
          <Text style={styles.consentText}>
            <Text style={{ color: colors.accentLight }}>{props.context.recipient}</Text>
            {" "}alıcısına{" "}
            <Text style={{ color: colors.accentLight }}>{props.context.purpose}</Text>
            {" "}amacıyla {disclosedCount} bilgi paylaşıyorsun.
          </Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Onaylıyorum</Text>
            <Switch
              value={consent}
              onValueChange={setConsent}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.white}
            />
          </View>
          <Button
            label="Paylaşımı onayla"
            onPress={() => props.onShare(props.selectedTemplate)}
            disabled={!consent}
            fullWidth
          />
        </Card>
      )}

      {/* ── QR ile Paylaş ────────────────────────────────── */}
      <Section title="QR ile paylaş" eyebrow="Alternatif" />

      {requestPayload ? (
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Paylaşım QR kodu</Text>
            <Pressable
              style={styles.shareQrBtn}
              onPress={() => void Share.share({ message: requestPayload, title: "PISP Veri Talebi" })}
            >
              <Text style={styles.shareQrBtnText}>📤 Paylaş</Text>
            </Pressable>
          </View>
          <Text style={styles.qrHint}>
            Bu kodu karşı tarafa göster — yalnızca seçtiğin bilgileri okuyabilir.
          </Text>
          <View style={styles.qrContainer}>
            <QRCode value={requestPayload} size={220} backgroundColor={colors.bgCard} color={colors.textPrimary} />
          </View>
        </Card>
      ) : null}

      {/* ── QR Tara ──────────────────────────────────────── */}
      <Card>
        <Text style={styles.cardTitle}>Karşı tarafın QR kodunu tara</Text>
        {scanMsg ? <Text style={styles.qrHint}>{scanMsg}</Text> : null}
        {scanning ? (
          <View style={styles.camera}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleBarcode}
            />
            <Pressable style={styles.cameraClose} onPress={() => setScanning(false)}>
              <Text style={styles.cameraCloseText}>✕ Kapat</Text>
            </Pressable>
          </View>
        ) : (
          <Button label="Kamerayı aç" onPress={openCamera} variant="secondary" fullWidth />
        )}
      </Card>

      {/* ── Taranan İstek ────────────────────────────────── */}
      {props.scannedRequest && (
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>İstek</Text>
            <View style={[
              styles.verifyBadge,
              { backgroundColor: verification?.valid ? colors.successDim : colors.dangerDim }
            ]}>
              <Text style={{ ...typography.caption, color: verification?.valid ? colors.success : colors.danger }}>
                {verification?.valid ? "Doğrulandı" : "Geçersiz"}
              </Text>
            </View>
          </View>
          <Text style={styles.requesterName}>{props.scannedRequest.recipient}</Text>
          <Text style={styles.requesterPurpose}>{props.scannedRequest.purpose}</Text>

          {allowedForScanned.length > 0 && (
            <View style={styles.claimsGrid}>
              {allowedForScanned.map((f) => <Claim key={f.id} name={f.label} value={f.value} />)}
            </View>
          )}

          {!props.disclosureResponse && (
            <>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Yanıt oluşturmayı onaylıyorum</Text>
                <Switch
                  value={qrConsent}
                  onValueChange={setQrConsent}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.white}
                />
              </View>
              <Button
                label="Yanıt QR kodu üret"
                onPress={props.onApproveScanned}
                disabled={!verification?.valid || !qrConsent}
                fullWidth
              />
            </>
          )}
        </Card>
      )}

      {props.disclosureResponse && responsePayload && (
        <Card elevated>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Yanıt QR kodu</Text>
            <Pressable
              style={styles.shareQrBtn}
              onPress={() => void Share.share({ message: responsePayload, title: "PISP Yanıt QR" })}
            >
              <Text style={styles.shareQrBtnText}>📤 Paylaş</Text>
            </Pressable>
          </View>
          <Text style={styles.qrHint}>Karşı taraf bu kodu okutarak yalnızca onayladığın bilgilere erişir.</Text>
          <View style={styles.qrContainer}>
            <QRCode value={responsePayload} size={220} backgroundColor={colors.bgCard} color={colors.textPrimary} />
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 40 },
  flex: { flex: 1 },
  stepLabel: { ...typography.heading3, color: colors.textPrimary },
  condLabel: { ...typography.overline, color: colors.textSecondary },
  cardTitle: { ...typography.heading3, color: colors.textPrimary },
  qrHint: { ...typography.caption, color: colors.textSecondary },
  rowBetween: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  claimsGrid: { gap: spacing.sm },
  switchRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  switchLabel: { ...typography.label, color: colors.textPrimary, flex: 1 },
  consentText: { ...typography.body, color: colors.textSecondary },

  countBadge: { backgroundColor: colors.accentDim, borderColor: colors.accent, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  countBadgeText: { ...typography.caption, color: colors.accentLight },

  templateRail: { gap: spacing.sm, paddingBottom: spacing.xs },
  templateCard: { backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.xs, padding: spacing.md, width: 150 },
  templateCardActive: { borderColor: colors.accent },
  templateName: { ...typography.label, color: colors.textSecondary },
  templateNameActive: { color: colors.textPrimary },
  templateSub: { ...typography.caption, color: colors.textTertiary },
  templateActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  templateActionText: { ...typography.caption, color: colors.accentLight },
  templateActionDivider: { ...typography.caption, color: colors.textTertiary },
  customBadge: { alignSelf: "flex-start", backgroundColor: colors.accentDim, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  customBadgeText: { ...typography.caption, color: colors.accentLight, fontSize: 10 },

  newTemplateCard: { alignItems: "center", backgroundColor: colors.bgElevated, borderColor: colors.borderLight, borderRadius: radius.md, borderStyle: "dashed", borderWidth: 1.5, gap: spacing.xs, justifyContent: "center", padding: spacing.md, width: 90 },
  newTemplateIcon: { color: colors.accent, fontSize: 22 },
  newTemplateText: { ...typography.caption, color: colors.textSecondary, textAlign: "center" },

  emptyRoot: { flex: 1, justifyContent: "center" },
  firstTemplateCard: { alignItems: "center", gap: spacing.xl, padding: spacing.xxl },
  firstTemplateEmoji: { fontSize: 56 },
  firstTemplateTitle: { ...typography.heading2, color: colors.textPrimary, textAlign: "center" },
  firstTemplateBody: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  firstTemplateBtn: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg },
  firstTemplateBtnText: { ...typography.label, color: colors.white, fontSize: 15 },

  emptyCard: { alignItems: "center", backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.lg, padding: spacing.xxl },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { ...typography.heading3, color: colors.textPrimary, textAlign: "center" },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  emptySubtext: { ...typography.body, color: colors.textTertiary },
  emptyBtn: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg },
  emptyBtnText: { ...typography.label, color: colors.white, fontSize: 15 },

  shareQrBtn: { backgroundColor: colors.accentDim, borderColor: colors.accent, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  shareQrBtnText: { ...typography.caption, color: colors.accentLight },
  qrContainer: { alignItems: "center", backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.xl },
  camera: { borderRadius: radius.md, height: 280, overflow: "hidden", position: "relative" },
  cameraClose: { backgroundColor: "rgba(0,0,0,0.6)", borderRadius: radius.sm, bottom: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, position: "absolute", right: spacing.md },
  cameraCloseText: { ...typography.label, color: colors.white },

  verifyBadge: { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  requesterName: { ...typography.label, color: colors.textPrimary },
  requesterPurpose: { ...typography.caption, color: colors.textSecondary },

  // Builder styles
  builderHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  builderTitle: { ...typography.heading2, color: colors.textPrimary },
  builderCancel: { ...typography.label, color: colors.textSecondary },

  nameInput: { backgroundColor: colors.bgElevated, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, color: colors.textPrimary, fontSize: 15, paddingHorizontal: spacing.md, paddingVertical: spacing.md },

  selectedCount: { backgroundColor: colors.accentDim, borderColor: colors.accent, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  selectedCountText: { ...typography.label, color: colors.accentLight },

  domainRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, paddingBottom: spacing.md },
  domainName: { ...typography.label, color: colors.textPrimary },
  domainDesc: { ...typography.caption, color: colors.textSecondary },
  domainCheck: { alignItems: "center", borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1.5, height: 22, justifyContent: "center", width: 22 },
  domainCheckOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  domainCheckPartial: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  domainCheckText: { color: colors.white, fontSize: 12, fontWeight: "700" },

  fieldRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm },
  fieldBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  fieldLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  fieldCheck: { alignItems: "center", borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1.5, height: 20, justifyContent: "center", width: 20 },
  fieldCheckOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  fieldCheckMark: { color: colors.white, fontSize: 11, fontWeight: "700" },

  saveBtn: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing.xl },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { ...typography.label, color: colors.white, fontSize: 15 }
});
