import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { ShareReceipt } from "../data/receipts";
import { PrivateVaultSnapshot } from "../services/privateVaultStorage";
import { createPortableBackup, restorePortableBackup } from "../services/portableBackup";
import { colors, radius, spacing, typography } from "../theme";

type Props = {
  receipts: ShareReceipt[];
  backupSnapshot: PrivateVaultSnapshot;
  onRevoke: (id: string) => void;
  onRestoreBackup: (s: PrivateVaultSnapshot) => void;
  onLock: () => void;
  onWipe: () => void | Promise<void>;
};

type Filter = "all" | "active" | "revoked";

export function HistoryModule({ receipts, backupSnapshot, onRevoke, onRestoreBackup, onLock, onWipe }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [passphrase, setPassphrase] = useState("");
  const [backupText, setBackupText] = useState("");
  const [restoreText, setRestoreText] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [wipeConfirm, setWipeConfirm] = useState(false);
  const [showRestore, setShowRestore] = useState(false);

  const totalCount = receipts.length;
  const activeCount = receipts.filter((r) => !r.revoked).length;
  const revokedCount = receipts.filter((r) => r.revoked).length;

  const mostUsedTemplate = (() => {
    const counts: Record<string, number> = {};
    for (const r of receipts) counts[r.templateName] = (counts[r.templateName] ?? 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : null;
  })();

  const filtered = receipts.filter((r) => {
    if (filter === "active") return !r.revoked;
    if (filter === "revoked") return r.revoked;
    return true;
  });

  async function handleBackup() {
    setMsg(null);
    if (passphrase.length < 12) { setMsg({ text: "Parola en az 12 karakter olmalı.", ok: false }); return; }
    try {
      const backup = await createPortableBackup(backupSnapshot, passphrase);
      setBackupText(backup);
      setMsg({ text: "Yedek oluşturuldu.", ok: true });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Yedek oluşturulamadı.", ok: false });
    }
  }

  async function handleShareBackup() {
    if (!backupText) { setMsg({ text: "Önce yedek oluştur.", ok: false }); return; }
    try {
      const uri = `${FileSystem.cacheDirectory ?? ""}pisp_backup_${Date.now()}.pisp`;
      await FileSystem.writeAsStringAsync(uri, backupText, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: "application/octet-stream", dialogTitle: "PISP Yedek Dosyası" });
      } else {
        setMsg({ text: "Bu cihazda paylaşım desteklenmiyor.", ok: false });
      }
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Paylaşım başarısız.", ok: false });
    }
  }

  async function handleRestore() {
    setMsg(null);
    if (!restoreText.trim()) { setMsg({ text: "Yedek metnini yapıştır.", ok: false }); return; }
    try {
      const snapshot = await restorePortableBackup(restoreText, passphrase);
      onRestoreBackup(snapshot);
      setMsg({ text: "Yedek başarıyla geri yüklendi.", ok: true });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Geri yükleme başarısız.", ok: false });
    }
  }

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Tümü", count: totalCount },
    { key: "active", label: "Aktif", count: activeCount },
    { key: "revoked", label: "İptal", count: revokedCount }
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* ── Analitik Kartlar ─────────────────────────────── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalCount}</Text>
          <Text style={styles.statLabel}>Toplam</Text>
        </View>
        <View style={[styles.statCard, styles.statCardAccent]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Aktif</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, revokedCount > 0 ? { color: colors.warning } : {}]}>{revokedCount}</Text>
          <Text style={styles.statLabel}>İptal</Text>
        </View>
      </View>

      {mostUsedTemplate && (
        <View style={styles.insightCard}>
          <Text style={styles.insightIcon}>📊</Text>
          <View style={styles.insightBody}>
            <Text style={styles.insightTitle}>En çok paylaşılan şablon</Text>
            <Text style={styles.insightValue}>{mostUsedTemplate}</Text>
          </View>
        </View>
      )}

      {/* ── Paylaşım Geçmişi ─────────────────────────────── */}
      <Text style={styles.sectionLabel}>PAYLAŞIM GEÇMİŞİ</Text>

      {/* Filter tabs */}
      <View style={styles.filterBar}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
              {f.label}
            </Text>
            {f.count > 0 && (
              <View style={[styles.filterBadge, filter === f.key && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, filter === f.key && styles.filterBadgeTextActive]}>
                  {f.count}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>{totalCount === 0 ? "📭" : "🔍"}</Text>
          <Text style={styles.emptyTitle}>{totalCount === 0 ? "Henüz paylaşım yok" : "Bu filtrede kayıt yok"}</Text>
          <Text style={styles.emptyText}>
            {totalCount === 0 ? "Paylaş sekmesinden ilk paylaşımını yapabilirsin." : "Başka bir filtre dene."}
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          {filtered.map((r, idx) => (
            <ReceiptRow key={r.id} receipt={r} isFirst={idx === 0} onRevoke={() => onRevoke(r.id)} />
          ))}
        </View>
      )}

      {/* ── Yedek ───────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>YEDEK</Text>
      <View style={styles.card}>
        <Text style={styles.cardHint}>
          Kasanı şifreli olarak yedekle. Yalnızca sen açabilirsin.
        </Text>
        <TextInput
          style={styles.input}
          value={passphrase}
          onChangeText={setPassphrase}
          placeholder="Yedek parolası (en az 12 karakter)"
          placeholderTextColor={colors.textTertiary}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.btnRow}>
          <Pressable style={[styles.btnOutline, { flex: 1 }]} onPress={handleBackup}>
            <Text style={styles.btnOutlineText}>Yedek oluştur</Text>
          </Pressable>
          {backupText ? (
            <Pressable style={[styles.btnAccent, { flex: 1 }]} onPress={handleShareBackup}>
              <Text style={styles.btnAccentText}>📤 Paylaş</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.btnGhost, { flex: 1 }]} onPress={() => setShowRestore((v) => !v)}>
              <Text style={styles.btnGhostText}>{showRestore ? "Gizle" : "Geri yükle"}</Text>
            </Pressable>
          )}
        </View>

        {msg ? (
          <View style={[styles.msgBox, { backgroundColor: msg.ok ? colors.successDim : colors.dangerDim }]}>
            <Text style={{ ...typography.caption, color: msg.ok ? colors.success : colors.danger }}>
              {msg.text}
            </Text>
          </View>
        ) : null}

        {backupText ? (
          <>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={backupText}
              editable={false}
              multiline
              selectTextOnFocus
            />
            <Pressable style={styles.btnGhost} onPress={() => setShowRestore((v) => !v)}>
              <Text style={styles.btnGhostText}>{showRestore ? "Geri yüklemeyi gizle" : "Geri yükle"}</Text>
            </Pressable>
          </>
        ) : null}

        {showRestore && (
          <>
            <Text style={styles.cardHint}>Geri yüklemek için yedek metnini yapıştır:</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={restoreText}
              onChangeText={setRestoreText}
              placeholder="Yedek kodunu buraya yapıştır"
              placeholderTextColor={colors.textTertiary}
              multiline
            />
            <Pressable style={styles.btnOutline} onPress={handleRestore}>
              <Text style={styles.btnOutlineText}>Geri yükle</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* ── Kasa Yönetimi ────────────────────────────────── */}
      <Text style={styles.sectionLabel}>KASA YÖNETİMİ</Text>
      <Pressable style={styles.btnGhost} onPress={onLock}>
        <Text style={styles.btnGhostText}>🔒  Kasayı kilitle</Text>
      </Pressable>
      <Pressable
        style={wipeConfirm ? styles.btnDanger : styles.btnDangerOutline}
        onPress={() => {
          if (wipeConfirm) { void onWipe(); setWipeConfirm(false); }
          else setWipeConfirm(true);
        }}
      >
        <Text style={[styles.btnGhostText, { color: wipeConfirm ? colors.white : colors.danger }]}>
          {wipeConfirm ? "⚠️  Emin misin? Tekrar bas — geri dönemezsin" : "🗑  Kasayı sıfırla"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function ReceiptRow({ receipt: r, isFirst, onRevoke }: { receipt: ShareReceipt; isFirst: boolean; onRevoke: () => void }) {
  const riskColor = r.riskScore > 60 ? colors.danger : r.riskScore > 30 ? colors.warning : colors.success;
  const modeIcon = r.mode === "qr" ? "📱" : "📤";

  return (
    <View style={[styles.receiptItem, !isFirst && styles.receiptBorder]}>
      <View style={styles.receiptRow}>
        <Text style={styles.receiptModeIcon}>{modeIcon}</Text>
        <View style={styles.flex}>
          <Text style={[styles.receiptName, r.revoked && styles.strikethrough]}>
            {r.templateName}
          </Text>
          <Text style={styles.receiptMeta}>{r.recipient} · {r.timestamp}</Text>
          {r.disclosedLabels.length > 0 && (
            <Text style={styles.receiptFields} numberOfLines={1}>
              {r.disclosedLabels.slice(0, 3).join(", ")}
              {r.disclosedLabels.length > 3 ? ` +${r.disclosedLabels.length - 3} alan` : ""}
            </Text>
          )}
        </View>
        <View style={styles.receiptRight}>
          {r.revoked ? (
            <View style={styles.revokedBadge}>
              <Text style={styles.revokedBadgeText}>İptal</Text>
            </View>
          ) : (
            <>
              <View style={[styles.riskDot, { backgroundColor: riskColor }]} />
              <Pressable style={styles.revokeBtn} onPress={onRevoke}>
                <Text style={styles.revokeBtnText}>Geri çek</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
      {r.revokedAt ? (
        <Text style={styles.revokedAt}>↩ {r.revokedAt} tarihinde iptal edildi</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 40 },
  flex: { flex: 1 },

  // Stats
  statsRow: { flexDirection: "row", gap: spacing.sm },
  statCard: {
    alignItems: "center",
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    paddingVertical: spacing.lg
  },
  statCardAccent: { borderColor: colors.borderLight },
  statValue: { ...typography.heading2, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textSecondary },

  insightCard: {
    alignItems: "center",
    backgroundColor: colors.accentDim,
    borderColor: colors.accent,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  insightIcon: { fontSize: 20 },
  insightBody: { flex: 1 },
  insightTitle: { ...typography.caption, color: colors.accentLight },
  insightValue: { ...typography.label, color: colors.textPrimary },

  sectionLabel: { ...typography.overline, color: colors.textTertiary, letterSpacing: 1.5 },

  // Filter tabs
  filterBar: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: 4
  },
  filterTab: {
    alignItems: "center",
    borderRadius: radius.sm,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    paddingVertical: spacing.sm
  },
  filterTabActive: { backgroundColor: colors.accent },
  filterTabText: { ...typography.label, color: colors.textSecondary },
  filterTabTextActive: { color: colors.white },
  filterBadge: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1
  },
  filterBadgeActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  filterBadgeText: { ...typography.caption, color: colors.textTertiary, fontSize: 10, textAlign: "center" },
  filterBadgeTextActive: { color: colors.white },

  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xxl
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { ...typography.heading3, color: colors.textPrimary },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: "center" },

  card: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  cardHint: { ...typography.caption, color: colors.textSecondary },

  receiptItem: { gap: spacing.xs, paddingVertical: spacing.sm },
  receiptBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  receiptRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm },
  receiptModeIcon: { fontSize: 14, marginTop: 2 },
  receiptName: { ...typography.label, color: colors.textPrimary },
  strikethrough: { textDecorationLine: "line-through" as const },
  receiptMeta: { ...typography.caption, color: colors.textSecondary },
  receiptFields: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  receiptRight: { alignItems: "flex-end", gap: spacing.xs },
  riskDot: { borderRadius: radius.full, height: 8, width: 8 },

  revokedBadge: {
    backgroundColor: colors.dangerDim,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  revokedBadgeText: { ...typography.caption, color: colors.danger },
  revokeBtn: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  revokeBtnText: { ...typography.caption, color: colors.textSecondary },
  revokedAt: { ...typography.caption, color: colors.warning },

  input: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  inputMulti: { height: 80, textAlignVertical: "top" as const },

  btnRow: { flexDirection: "row", gap: spacing.sm },
  btnOutline: {
    alignItems: "center",
    backgroundColor: colors.bgElevated,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.lg
  },
  btnOutlineText: { ...typography.label, color: colors.textPrimary },
  btnAccent: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg
  },
  btnAccentText: { ...typography.label, color: colors.white },
  btnGhost: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.lg
  },
  btnGhostText: { ...typography.label, color: colors.textSecondary },
  btnDanger: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.lg
  },
  btnDangerOutline: {
    alignItems: "center",
    backgroundColor: colors.dangerDim,
    borderColor: colors.danger,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.lg
  },
  msgBox: { borderRadius: radius.sm, padding: spacing.md }
});
