import { useEffect, useState } from "react";
import { Clipboard, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AuditEvent } from "../data/pisp";
import { legalLinks } from "../data/legal";
import { ShareReceipt } from "../data/receipts";
import { trustControls, readinessScore } from "../data/productReadiness";
import { controlLayers, managementSteps } from "../data/informationArchitecture";
import { getOrCreateDeviceIdentity } from "../services/deviceIdentity";
import { LedgerBlock } from "../services/sovereigntyLedger";
import { PrivateVaultSnapshot } from "../services/privateVaultStorage";
import { createPortableBackup, restorePortableBackup } from "../services/portableBackup";
import { decisionLabel, shortHash, templateNameById } from "../utils/helpers";
import { colors, radius, spacing, typography } from "../theme";
import { Badge, Button, Card, CodeBlock, EmptyState, InfoRow, Metric, Section, Toast } from "./ui";
import { useToast } from "../hooks/useToast";

type Props = {
  ledger: LedgerBlock[];
  chainStatus: string;
  events: AuditEvent[];
  receipts: ShareReceipt[];
  backupSnapshot: PrivateVaultSnapshot;
  onRestoreBackup: (s: PrivateVaultSnapshot) => void;
  onWipe: () => void | Promise<void>;
  onRevokeReceipt: (id: string) => void;
  onLock: () => void;
};

export function SettingsModule(props: Props) {
  const [tab, setTab] = useState<"security" | "history">("security");

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <Pressable style={[styles.tab, tab === "security" && styles.tabActive]} onPress={() => setTab("security")}>
          <Text style={[styles.tabText, tab === "security" && styles.tabTextActive]}>Güvenlik</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === "history" && styles.tabActive]} onPress={() => setTab("history")}>
          <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>Geçmiş</Text>
        </Pressable>
      </View>
      {tab === "security" ? <SecurityPanel {...props} /> : <HistoryPanel ledger={props.ledger} chainStatus={props.chainStatus} events={props.events} receipts={props.receipts} onRevokeReceipt={props.onRevokeReceipt} />}
    </View>
  );
}

function SecurityPanel({ backupSnapshot, onRestoreBackup, onWipe, onLock }: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [backupText, setBackupText] = useState("");
  const [restoreText, setRestoreText] = useState("");
  const [selectedLegalId, setSelectedLegalId] = useState(legalLinks[0]?.id ?? "privacy");
  const [did, setDid] = useState<string | null>(null);
  const [didCopied, setDidCopied] = useState(false);
  const selectedLegal = legalLinks.find((l) => l.id === selectedLegalId) ?? legalLinks[0]!;
  const trustScore = readinessScore(trustControls);
  const strength = getStrength(passphrase);
  const toast = useToast();

  useEffect(() => {
    void getOrCreateDeviceIdentity().then((identity) => setDid(identity.did));
  }, []);

  function copyDid() {
    if (!did) return;
    Clipboard.setString(did);
    setDidCopied(true);
    setTimeout(() => setDidCopied(false), 2000);
  }

  async function handleBackup() {
    if (passphrase.length < 12) { toast.show("Parola en az 12 karakter olmalı.", "danger"); return; }
    try {
      const backup = await createPortableBackup(backupSnapshot, passphrase);
      setBackupText(backup);
      toast.show("Yedek oluşturuldu. Güvenli bir yere kaydet.", "success");
    } catch (e) { toast.show(e instanceof Error ? e.message : "Yedek oluşturulamadı.", "danger"); }
  }

  async function handleRestore() {
    if (!restoreText.trim()) { toast.show("Yedek metnini yapıştır.", "danger"); return; }
    try {
      const snapshot = await restorePortableBackup(restoreText, passphrase);
      onRestoreBackup(snapshot);
      toast.show("Yedek başarıyla geri yüklendi.", "success");
    } catch (e) { toast.show(e instanceof Error ? e.message : "Geri yükleme başarısız.", "danger"); }
  }

  return (
    <View style={styles.container}>
      {/* Toast feedback */}
      <Toast message={toast.message} tone={toast.tone} visible={toast.visible} />

      {/* Cihaz Kimliği */}
      <Card>
        <Section title="Cihaz kimliği" eyebrow="Kriptografik Kimlik" />
        <View style={styles.didRow}>
          <Text style={styles.didValue} numberOfLines={1} ellipsizeMode="middle">
            {did ?? "Yükleniyor..."}
          </Text>
          <Pressable style={styles.didCopyBtn} onPress={copyDid}>
            <Text style={styles.didCopyText}>{didCopied ? "✓" : "Kopyala"}</Text>
          </Pressable>
        </View>
        <Text style={styles.didCaption}>Ed25519 imzalama anahtarına dayalı, yalnızca bu cihaza özgü. QR paylaşımları bu kimlikle imzalanır.</Text>
      </Card>

      {/* Güven Skoru */}
      <View style={styles.metricsRow}>
        <Metric label="Güven skoru" value={`${trustScore}%`} accent />
        <Metric label="Sunucuya giden" value="0 alan" />
        <Metric label="Açık kayıt" value="0" />
      </View>

      {/* Güvenlik kontrolleri */}
      <Card>
        <Section title="Koruma durumu" eyebrow="Güvenlik" />
        {trustControls.map((c) => (
          <InfoRow key={c.id} title={c.title} text={c.description} tone="neutral" />
        ))}
      </Card>

      {/* Şifreli yedek */}
      <Card>
        <Section title="Şifreli yedek" eyebrow="Yedekleme" text="Parolanla şifrelenir. Sadece sen açabilirsin." />
        <TextInput
          value={passphrase}
          onChangeText={setPassphrase}
          placeholder="Yedek parolası (min. 12 karakter)"
          placeholderTextColor={colors.textTertiary}
          secureTextEntry
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {passphrase.length > 0 && (
          <View style={styles.strengthBar}>
            <View style={[styles.strengthFill, { width: `${strength.pct}%`, backgroundColor: strength.color }]} />
            <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
          </View>
        )}
        <View style={styles.buttonRow}>
          <Button label="Yedek oluştur" onPress={handleBackup} variant="secondary" style={{ flex: 1 }} />
          <Button label="Geri yükle" onPress={handleRestore} variant="ghost" style={{ flex: 1 }} />
        </View>
        {backupText ? <CodeBlock value={backupText} /> : null}
        <TextInput
          value={restoreText}
          onChangeText={setRestoreText}
          placeholder="Yedek kodunu buraya yapıştır"
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, styles.inputMulti]}
          multiline
        />
      </Card>

      {/* Hesap kontrolleri */}
      <Card>
        <Text style={styles.sectionTitle}>Hesap kontrolleri</Text>
        <Button label="Kasayı kilitle" onPress={onLock} variant="ghost" fullWidth />
        <Button label="Yerel kasayı tamamen sil" onPress={onWipe} variant="danger" fullWidth />
      </Card>

      {/* Yasal */}
      <Card>
        <Text style={styles.sectionTitle}>Yasal merkez</Text>
        <View style={styles.legalList}>
          {legalLinks.map((link) => (
            <Pressable key={link.id} style={[styles.legalItem, selectedLegalId === link.id && styles.legalItemActive]} onPress={() => setSelectedLegalId(link.id)}>
              <View style={styles.flex}>
                <Text style={styles.legalTitle}>{link.title}</Text>
                <Text style={styles.legalDesc}>{link.description}</Text>
              </View>
              <Text style={styles.legalChevron}>{selectedLegalId === link.id ? "▾" : "›"}</Text>
            </Pressable>
          ))}
        </View>
        {selectedLegal && (
          <View style={styles.legalDetail}>
            <Text style={styles.legalDetailTitle}>{selectedLegal.title}</Text>
            {selectedLegal.body.map((line) => (
              <Text key={line} style={styles.legalDetailText}>· {line}</Text>
            ))}
            <Pressable onPress={() => void Linking.openURL(selectedLegal.url)}>
              <Text style={styles.legalLink}>
                {selectedLegal.url.startsWith("mailto:") ? "E-posta ile ilet →" : "Tam metni oku →"}
              </Text>
            </Pressable>
          </View>
        )}
      </Card>

      {/* Nasıl çalışır */}
      <Card>
        <Section title="Nasıl çalışır?" eyebrow="Rehber" />
        {managementSteps.map((step, i) => (
          <InfoRow key={step} title={`${i + 1}. Adım`} text={step} />
        ))}
        {controlLayers.map((layer) => (
          <InfoRow key={layer.title} title={layer.title} text={layer.text} />
        ))}
      </Card>
    </View>
  );
}

function HistoryPanel({ ledger, chainStatus, events, receipts, onRevokeReceipt }: { ledger: LedgerBlock[]; chainStatus: string; events: AuditEvent[]; receipts: ShareReceipt[]; onRevokeReceipt: (id: string) => void }) {
  const visibleBlocks = ledger.filter((b) => b.templateId);
  const chainOk = !chainStatus.includes("kırık");
  const activeCount = receipts.filter((r) => !r.revoked).length;

  return (
    <View style={styles.container}>
      <View style={styles.metricsRow}>
        <Metric label="Zincir" value={chainOk ? "Geçerli" : "Hatalı"} danger={!chainOk} />
        <Metric label="Toplam" value={`${receipts.length}`} accent />
        <Metric label="Aktif paylaşım" value={`${activeCount}`} danger={activeCount > 0} />
      </View>

      {receipts.length === 0 && visibleBlocks.length === 0 && events.length === 0 ? (
        <Card>
          <EmptyState
            icon="📭"
            title="Henüz geçmiş yok"
            text="Bir paylaşım yaptıktan sonra makbuzlar ve zincir kayıtları burada görünür. Kişisel veriler hiçbir zaman bu kayıtta açık yazılmaz."
          />
        </Card>
      ) : null}

      {receipts.length > 0 && (
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Paylaşım makbuzları</Text>
            <Badge label={`${receipts.length} adet`} tone="accent" />
          </View>
          {receipts.map((r, idx) => (
            <View key={r.id} style={[styles.receiptItem, idx > 0 && styles.receiptBorder, r.revoked && styles.receiptRevoked]}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Text style={[styles.receiptName, r.revoked && styles.receiptNameRevoked]}>{r.templateName}</Text>
                  <Text style={styles.receiptMeta}>{r.recipient} · {r.purpose}</Text>
                </View>
                {r.revoked
                  ? <Badge label="Geri çekildi" tone="warning" />
                  : <Badge label={`${r.riskScore}/100`} tone={r.riskScore > 50 ? "warning" : "success"} />
                }
              </View>
              <Text style={styles.receiptFields} numberOfLines={1}>
                {r.disclosedLabels.length > 0 ? r.disclosedLabels.join(", ") : "Bilgi açılmadı"}
              </Text>
              <Text style={styles.receiptProof}>{r.proof} · {r.timestamp}</Text>
              {r.revoked
                ? <Text style={styles.receiptRevokedAt}>↩ {r.revokedAt} tarihinde geri çekildi</Text>
                : (
                  <Pressable style={styles.revokeBtn} onPress={() => onRevokeReceipt(r.id)}>
                    <Text style={styles.revokeBtnText}>Geri çek (KVKK Md. 11)</Text>
                  </Pressable>
                )
              }
            </View>
          ))}
        </Card>
      )}

      {visibleBlocks.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Egemenlik zinciri</Text>
          {visibleBlocks.map((block) => (
            <View key={block.blockHash} style={styles.blockItem}>
              <View style={styles.blockDot} />
              <View style={styles.flex}>
                <Text style={styles.blockName}>{templateNameById(block.templateId)}</Text>
                <Text style={styles.blockProof}>{shortHash(block.blockHash)}</Text>
              </View>
              <Badge label={block.action} tone="neutral" />
            </View>
          ))}
        </Card>
      )}

      {events.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Denetim günlüğü</Text>
          {events.slice(0, 20).map((event) => (
            <View key={event.id} style={styles.eventItem}>
              <View style={styles.rowBetween}>
                <Text style={styles.eventAction}>{event.action}</Text>
                <Badge
                  label={decisionLabel(event.decision)}
                  tone={event.decision === "deny" ? "danger" : event.decision === "revoke" ? "warning" : "success"}
                />
              </View>
              <Text style={styles.eventSummary}>{event.summary}</Text>
              <Text style={styles.eventTime}>{event.timestamp}</Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

function getStrength(p: string) {
  const len = p.length;
  const score = (len >= 12 ? 1 : 0) + (len >= 16 ? 1 : 0) + (/[A-Z]/.test(p) ? 1 : 0) + (/[0-9]/.test(p) ? 1 : 0) + (/[^A-Za-z0-9]/.test(p) ? 1 : 0);
  if (score >= 4) return { pct: 100, color: colors.success, label: "Güçlü" };
  if (score >= 2) return { pct: 60, color: colors.warning, label: "Orta" };
  return { pct: 30, color: colors.danger, label: "Zayıf" };
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  flex: { flex: 1 },
  tabBar: { backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", padding: 4 },
  tab: { alignItems: "center", borderRadius: radius.sm, flex: 1, paddingVertical: 10 },
  tabActive: { backgroundColor: colors.accent },
  tabText: { ...typography.label, color: colors.textSecondary },
  tabTextActive: { color: colors.white },
  metricsRow: { flexDirection: "row", gap: spacing.sm },
  sectionTitle: { ...typography.heading3, color: colors.textPrimary },
  input: { backgroundColor: colors.bgElevated, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, color: colors.textPrimary, fontSize: 14, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  inputMulti: { height: 80, textAlignVertical: "top" },
  strengthBar: { backgroundColor: colors.border, borderRadius: radius.full, height: 4, overflow: "hidden" },
  strengthFill: { borderRadius: radius.full, height: 4 },
  strengthLabel: { ...typography.caption, marginTop: spacing.xs },
  msgBox: { borderRadius: radius.sm, padding: spacing.md },
  msgText: { ...typography.caption },
  buttonRow: { flexDirection: "row", gap: spacing.sm },
  legalList: { gap: spacing.xs },
  legalItem: { borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  legalItemActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  legalTitle: { ...typography.label, color: colors.textPrimary },
  legalDesc: { ...typography.caption, color: colors.textSecondary },
  legalChevron: { color: colors.textSecondary, fontSize: 16 },
  legalDetail: { backgroundColor: colors.bgElevated, borderRadius: radius.sm, gap: spacing.sm, padding: spacing.md },
  legalDetailTitle: { ...typography.label, color: colors.textPrimary },
  legalDetailText: { ...typography.caption, color: colors.textSecondary },
  legalLink: { ...typography.label, color: colors.accent },
  rowBetween: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  emptyTitle: { ...typography.heading3, color: colors.textSecondary },
  emptyText: { ...typography.body, color: colors.textTertiary },
  receiptItem: { gap: spacing.xs, paddingVertical: spacing.md },
  receiptBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  receiptRevoked: { opacity: 0.5 },
  receiptName: { ...typography.label, color: colors.textPrimary },
  receiptNameRevoked: { textDecorationLine: "line-through" as const },
  receiptMeta: { ...typography.caption, color: colors.textSecondary },
  receiptFields: { ...typography.caption, color: colors.textSecondary },
  receiptProof: { ...typography.mono, color: colors.textTertiary, fontSize: 10 },
  receiptRevokedAt: { ...typography.caption, color: colors.warning },
  revokeBtn: { alignSelf: "flex-start" as const, borderBottomColor: colors.danger, borderBottomWidth: 1 },
  revokeBtnText: { ...typography.caption, color: colors.danger },
  didRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  didValue: { ...typography.mono, color: colors.accentLight, flex: 1, fontSize: 11 },
  didCopyBtn: { backgroundColor: colors.accentDim, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  didCopyText: { ...typography.caption, color: colors.accentLight },
  didCaption: { ...typography.caption, color: colors.textSecondary },
  blockItem: { alignItems: "center", flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm },
  blockDot: { backgroundColor: colors.accent, borderRadius: radius.full, height: 8, width: 8 },
  blockName: { ...typography.label, color: colors.textPrimary },
  blockProof: { ...typography.mono, color: colors.textTertiary, fontSize: 10 },
  eventItem: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing.xs, paddingTop: spacing.md },
  eventAction: { ...typography.label, color: colors.textPrimary, flex: 1 },
  eventSummary: { ...typography.caption, color: colors.textSecondary },
  eventTime: { ...typography.caption, color: colors.textTertiary }
});
