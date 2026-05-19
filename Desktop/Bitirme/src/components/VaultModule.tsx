import { useEffect, useRef, useState } from "react";
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Contacts from "expo-contacts";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { PolicyState, VaultValues, domains } from "../data/pisp";
import { StoredDocument } from "../data/marketplace";
import { colors, radius, spacing, typography } from "../theme";
import { keyboardTypeForField, placeholderForField, validateFieldValue, validateTCKimlikNo } from "../utils/helpers";
import { Badge, Card, Progress, Section } from "./ui";

type Props = {
  values: VaultValues;
  policy: PolicyState;
  completeness: number;
  activeSharesCount: number;
  documents: StoredDocument[];
  onChangeValue: (id: string, value: string) => void;
  onToggle: (id: string, value: boolean) => void;
  onPanicClose: () => void;
  onAddDocument: (doc: StoredDocument) => void;
  onDeleteDocument: (id: string) => void;
};

const SOCIAL_FIELD_URLS: Record<string, (v: string) => string> = {
  linkedin:  (v) => v.startsWith("http") ? v : `https://linkedin.com/in/${v.replace("@", "")}`,
  github:    (v) => v.startsWith("http") ? v : `https://github.com/${v.replace("@", "")}`,
  twitter:   (v) => v.startsWith("http") ? v : `https://x.com/${v.replace("@", "")}`,
  instagram: (v) => v.startsWith("http") ? v : `https://instagram.com/${v.replace("@", "")}`
};

const GENDER_OPTIONS = ["Erkek", "Kadın", "Belirtmek İstemiyorum"] as const;
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "0+", "0-"] as const;

type ContactItem = { id: string; name: string; phone?: string; email?: string };

export function VaultModule({ values, policy, completeness, activeSharesCount, documents, onChangeValue, onToggle, onPanicClose, onAddDocument, onDeleteDocument }: Props) {
  const [selectedDomainId, setSelectedDomainId] = useState(domains[0]?.id ?? "D-01");
  const selectedDomain = domains.find((d) => d.id === selectedDomainId) ?? domains[0]!;
  const enabledCount = domains.filter((d) => policy[d.id]).length;

  // Camera
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [idPhotoUri, setIdPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // Contacts
  const [contactsModalVisible, setContactsModalVisible] = useState(false);
  const [contactsList, setContactsList] = useState<ContactItem[]>([]);
  const [contactsQuery, setContactsQuery] = useState("");

  async function openIdCamera() {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) return;
    }
    setCameraModalVisible(true);
  }

  async function captureIdPhoto() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
    if (photo?.uri) setIdPhotoUri(photo.uri);
    setCameraModalVisible(false);
  }

  async function openContactsPicker() {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") return;
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Name]
    });
    const items: ContactItem[] = data
      .filter((c) => c.name)
      .map((c) => ({
        id: c.id ?? Math.random().toString(),
        name: c.name ?? "",
        phone: c.phoneNumbers?.[0]?.number ?? undefined,
        email: c.emails?.[0]?.email ?? undefined
      }));
    setContactsList(items);
    setContactsModalVisible(true);
  }

  function importContact(contact: ContactItem) {
    if (contact.phone) onChangeValue("phone", contact.phone);
    if (contact.email) onChangeValue("email", contact.email);
    setContactsModalVisible(false);
    setContactsQuery("");
  }

  const filteredContacts = contactsQuery.trim()
    ? contactsList.filter((c) => c.name.toLowerCase().includes(contactsQuery.toLowerCase()))
    : contactsList;

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const destUri = `${FileSystem.documentDirectory}pisp_docs/${Date.now()}_${asset.name}`;
    await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}pisp_docs/`, { intermediates: true });
    await FileSystem.copyAsync({ from: asset.uri, to: destUri });
    onAddDocument({
      id: `doc-${Date.now()}`,
      name: asset.name,
      localUri: destUri,
      size: asset.size ?? 0,
      mimeType: asset.mimeType ?? "application/octet-stream",
      addedAt: new Date().toISOString()
    });
  }

  async function openDocument(doc: StoredDocument) {
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) await Sharing.shareAsync(doc.localUri);
  }

  const completenessColor = completeness > 70 ? colors.success : completeness > 40 ? colors.warning : colors.danger;
  const completenessLabel = completeness > 70 ? "Hazır" : completeness > 40 ? "Gelişiyor" : "Başlangıç";

  const expiryWarnings = getExpiryWarnings(values);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Kasa Durumu */}
      <Card>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>Kasa doluluk oranı</Text>
            <Text style={styles.caption}>{enabledCount}/14 grup aktif · {activeSharesCount} paylaşım</Text>
          </View>
          <View style={[styles.percentBadge, { borderColor: completenessColor }]}>
            <Text style={[styles.percentText, { color: completenessColor }]}>{completeness}%</Text>
          </View>
        </View>
        <Progress value={completeness} />
        <View style={styles.row}>
          <View style={[styles.statusDot, { backgroundColor: completenessColor }]} />
          <Text style={[styles.statusLabel, { color: completenessColor }]}>{completenessLabel}</Text>
          <Text style={styles.caption}> · Boş alanlar paylaşıma dahil edilmez</Text>
        </View>
      </Card>

      {/* Sona Erme Uyarıları */}
      {expiryWarnings.length > 0 && (
        <View style={styles.expiryBanner}>
          <Text style={styles.expiryBannerIcon}>⚠️</Text>
          <View style={styles.flex}>
            <Text style={styles.expiryBannerTitle}>Belgelerinizde güncelleme gerekebilir</Text>
            {expiryWarnings.map((w) => (
              <Text key={w.fieldId} style={styles.expiryBannerItem}>· {w.label}: {w.message}</Text>
            ))}
          </View>
        </View>
      )}

      {/* Domain Seçici */}
      <Section title="Bilgi grupları" eyebrow="Kategoriler" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.domainRail}>
        {domains.map((domain) => {
          const selected = domain.id === selectedDomain.id;
          const openCount = domain.fields.filter((f) => policy[f.id]).length;
          const hasAll = openCount === domain.fields.length;
          return (
            <Pressable
              key={domain.id}
              style={[styles.domainPill, selected && styles.domainPillActive]}
              onPress={() => setSelectedDomainId(domain.id)}
            >
              <Text style={[styles.domainPillText, selected && styles.domainPillTextActive]}>{domain.shortName}</Text>
              {openCount > 0 && (
                <View style={[styles.domainBadge, hasAll ? styles.domainBadgeFull : styles.domainBadgePartial]}>
                  <Text style={styles.domainBadgeText}>{openCount}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Seçili Domain */}
      <Card>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{selectedDomain.name}</Text>
            <Text style={styles.caption}>{selectedDomain.description}</Text>
          </View>
          <Switch
            value={Boolean(policy[selectedDomain.id])}
            onValueChange={(v) => onToggle(selectedDomain.id, v)}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.white}
          />
        </View>
        <View style={styles.tagsRow}>
          <Badge label={selectedDomain.gdpr.includes("Art. 9") ? "Hassas Veri" : "Standart"} tone={selectedDomain.gdpr.includes("Art. 9") ? "warning" : "neutral"} />
          <Badge label={`${selectedDomain.fields.length} alan`} tone="neutral" />
          {selectedDomain.id === "D-01" && (
            <Pressable style={styles.scanBtn} onPress={openIdCamera}>
              <Text style={styles.scanBtnText}>📷 Kimliği Tara</Text>
            </Pressable>
          )}
          {selectedDomain.id === "D-02" && (
            <Pressable style={styles.scanBtn} onPress={openContactsPicker}>
              <Text style={styles.scanBtnText}>👤 Kişiden Aktar</Text>
            </Pressable>
          )}
        </View>

        {/* ID Photo Reference */}
        {selectedDomain.id === "D-01" && idPhotoUri && (
          <View style={styles.idPhotoCard}>
            <Image source={{ uri: idPhotoUri }} style={styles.idPhoto} resizeMode="contain" />
            <View style={styles.idPhotoActions}>
              <Text style={styles.idPhotoLabel}>📎 Referans fotoğraf</Text>
              <Pressable onPress={() => setIdPhotoUri(null)}>
                <Text style={styles.idPhotoDelete}>Kaldır</Text>
              </Pressable>
            </View>
          </View>
        )}

        {selectedDomain.fields.map((field, idx) => {
          const value = values[field.id] ?? field.value;
          const error = value.trim() ? validateFieldValue(field, value) : null;
          const isLast = idx === selectedDomain.fields.length - 1;
          return (
            <FieldRow
              key={field.id}
              field={field}
              value={value}
              error={error}
              isLast={isLast}
              policyOn={Boolean(policy[field.id])}
              onToggle={(v) => onToggle(field.id, v)}
              onChangeValue={(v) => onChangeValue(field.id, v)}
            />
          );
        })}
      </Card>

      {/* Belgelerim */}
      <Section title="Belgelerim" eyebrow="Dosyalar" />
      <Card>
        {documents.length === 0 ? (
          <Text style={styles.docEmpty}>Henüz belge eklenmedi. CV, diploma veya sertifikanı yükle.</Text>
        ) : (
          documents.map((doc, idx) => (
            <View key={doc.id} style={[styles.docRow, idx > 0 && styles.docBorder]}>
              <Text style={styles.docIcon}>{mimeTypeIcon(doc.mimeType)}</Text>
              <View style={styles.flex}>
                <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                <Text style={styles.docMeta}>{formatSize(doc.size)} · {new Date(doc.addedAt).toLocaleDateString("tr-TR")}</Text>
              </View>
              <Pressable style={styles.docBtn} onPress={() => openDocument(doc)}>
                <Text style={styles.docBtnText}>Aç</Text>
              </Pressable>
              <Pressable style={styles.docDeleteBtn} onPress={() => onDeleteDocument(doc.id)}>
                <Text style={styles.docDeleteText}>✕</Text>
              </Pressable>
            </View>
          ))
        )}
        <Pressable style={styles.addDocBtn} onPress={pickDocument}>
          <Text style={styles.addDocBtnText}>＋ Belge Ekle</Text>
        </Pressable>
      </Card>

      {/* Acil Kapatma */}
      <Pressable style={styles.panicButton} onPress={onPanicClose}>
        <Text style={styles.panicIcon}>⚠</Text>
        <View>
          <Text style={styles.panicTitle}>Tüm paylaşımları kapat</Text>
          <Text style={styles.panicSub}>Tüm izinleri anında devre dışı bırakır</Text>
        </View>
      </Pressable>

      {/* Camera Modal */}
      <Modal visible={cameraModalVisible} animationType="slide" onRequestClose={() => setCameraModalVisible(false)}>
        <View style={styles.cameraModal}>
          <CameraView ref={cameraRef} style={styles.cameraView} facing="back" />
          <View style={styles.cameraControls}>
            <Pressable style={styles.cameraCancel} onPress={() => setCameraModalVisible(false)}>
              <Text style={styles.cameraCancelText}>İptal</Text>
            </Pressable>
            <Pressable style={styles.cameraCapture} onPress={captureIdPhoto}>
              <View style={styles.cameraCaptureInner} />
            </Pressable>
            <View style={styles.cameraSpacer} />
          </View>
          <Text style={styles.cameraHint}>Kimliğini çerçeveye hizala ve çek</Text>
        </View>
      </Modal>

      {/* Contacts Modal */}
      <Modal visible={contactsModalVisible} animationType="slide" onRequestClose={() => { setContactsModalVisible(false); setContactsQuery(""); }}>
        <View style={styles.contactsModal}>
          <View style={styles.contactsHeader}>
            <Text style={styles.contactsTitle}>Kişi Seç</Text>
            <Pressable onPress={() => { setContactsModalVisible(false); setContactsQuery(""); }}>
              <Text style={styles.contactsClose}>Kapat</Text>
            </Pressable>
          </View>
          <TextInput
            value={contactsQuery}
            onChangeText={setContactsQuery}
            placeholder="İsim ara..."
            placeholderTextColor={colors.textTertiary}
            style={styles.contactsSearch}
            autoCorrect={false}
          />
          <ScrollView keyboardShouldPersistTaps="handled">
            {filteredContacts.map((contact) => (
              <Pressable key={contact.id} style={styles.contactItem} onPress={() => importContact(contact)}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>{contact.name[0]?.toUpperCase() ?? "?"}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  {contact.phone && <Text style={styles.contactSub}>{contact.phone}</Text>}
                  {contact.email && <Text style={styles.contactSub}>{contact.email}</Text>}
                </View>
              </Pressable>
            ))}
            {filteredContacts.length === 0 && (
              <Text style={styles.contactsEmpty}>Kişi bulunamadı</Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 40 },
  flex: { flex: 1 },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  cardTitle: { ...typography.heading3, color: colors.textPrimary },
  caption: { ...typography.caption, color: colors.textSecondary },

  percentBadge: { alignItems: "center", borderRadius: radius.sm, borderWidth: 1.5, height: 44, justifyContent: "center", width: 52 },
  percentText: { ...typography.heading3 },
  statusDot: { borderRadius: radius.full, height: 6, width: 6 },
  statusLabel: { ...typography.label },
  domainRail: { gap: spacing.sm, paddingBottom: spacing.xs },
  domainPill: { alignItems: "center", backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.full, borderWidth: 1, flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  domainPillActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  domainPillText: { ...typography.label, color: colors.textSecondary },
  domainPillTextActive: { color: colors.accentLight },
  domainBadge: { alignItems: "center", borderRadius: radius.full, height: 16, justifyContent: "center", width: 16 },
  domainBadgeFull: { backgroundColor: colors.success },
  domainBadgePartial: { backgroundColor: colors.warning },
  domainBadgeText: { color: colors.white, fontSize: 9, fontWeight: "700" },
  tagsRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },

  // Scan / import button in domain header
  scanBtn: { alignItems: "center", backgroundColor: colors.accentDim, borderColor: colors.accent, borderRadius: radius.sm, borderWidth: 1, flexDirection: "row", paddingHorizontal: spacing.sm, paddingVertical: 4 },
  scanBtnText: { color: colors.accentLight, fontSize: 12, fontWeight: "600" },

  // ID photo reference
  idPhotoCard: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.md, overflow: "hidden" },
  idPhoto: { height: 150, width: "100%" },
  idPhotoActions: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", padding: spacing.sm },
  idPhotoLabel: { ...typography.caption, color: colors.textSecondary },
  idPhotoDelete: { ...typography.caption, color: colors.danger },

  // Field rows
  fieldBlock: { gap: spacing.sm, paddingTop: spacing.md },
  fieldBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  fieldLabel: { ...typography.label, color: colors.textPrimary },
  fieldSwitch: { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] },
  copyBtn: { backgroundColor: colors.bgElevated, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  copyBtnText: { ...typography.caption, color: colors.textSecondary, fontSize: 11 },
  copyBtnCopied: { color: colors.success },
  openBtn: { backgroundColor: colors.accentDim, borderColor: colors.accent, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  openBtnText: { color: colors.accentLight, fontSize: 11, fontWeight: "600" },
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
  inputError: { borderColor: colors.danger },
  error: { ...typography.caption, color: colors.danger },

  // TC Kimlik
  tcRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  tcCounter: { ...typography.caption, color: colors.textTertiary },
  tcStatus: { ...typography.caption, fontWeight: "600" },
  tcValid: { color: colors.success },
  tcInvalid: { color: colors.danger },

  // Gender select
  genderRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  genderBtn: { borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  genderBtnActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  genderBtnText: { ...typography.label, color: colors.textSecondary },
  genderBtnTextActive: { color: colors.accentLight },

  // Blood type picker
  bloodGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  bloodBtn: { alignItems: "center", borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, minWidth: 52, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bloodBtnActive: { backgroundColor: colors.dangerDim, borderColor: colors.danger },
  bloodBtnText: { ...typography.label, color: colors.textSecondary },
  bloodBtnTextActive: { color: colors.danger, fontWeight: "700" },

  // Birth / date input
  birthDateRow: { flexDirection: "row", gap: spacing.sm },
  birthDatePartNarrow: { flex: 1 },
  birthDatePartWide: { flex: 2 },
  birthDateLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },

  // Documents
  docEmpty: { ...typography.caption, color: colors.textSecondary, textAlign: "center", paddingVertical: spacing.sm },
  docRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm },
  docBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  docIcon: { fontSize: 24 },
  docName: { ...typography.label, color: colors.textPrimary },
  docMeta: { ...typography.caption, color: colors.textTertiary },
  docBtn: { backgroundColor: colors.bgElevated, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  docBtnText: { ...typography.caption, color: colors.accentLight, fontWeight: "600" },
  docDeleteBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  docDeleteText: { color: colors.textTertiary, fontSize: 14 },
  addDocBtn: { alignItems: "center", borderColor: colors.border, borderRadius: radius.sm, borderStyle: "dashed" as const, borderWidth: 1, marginTop: spacing.sm, paddingVertical: spacing.md },
  addDocBtnText: { ...typography.label, color: colors.accent },

  // Expiry warnings
  expiryBanner: {
    alignItems: "flex-start",
    backgroundColor: colors.warningDim,
    borderColor: colors.warning,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  expiryBannerIcon: { fontSize: 16, marginTop: 1 },
  expiryBannerTitle: { ...typography.label, color: colors.warning, marginBottom: spacing.xs },
  expiryBannerItem: { ...typography.caption, color: colors.warning },

  // Panic button
  panicButton: {
    alignItems: "center",
    backgroundColor: colors.dangerDim,
    borderColor: colors.danger,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg
  },
  panicIcon: { fontSize: 20 },
  panicTitle: { ...typography.label, color: colors.danger },
  panicSub: { ...typography.caption, color: colors.textSecondary },

  // Camera modal
  cameraModal: { backgroundColor: "#000", flex: 1 },
  cameraView: { flex: 1 },
  cameraControls: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.85)", flexDirection: "row", justifyContent: "space-between", paddingBottom: 48, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  cameraCancel: { padding: spacing.md },
  cameraCancelText: { color: colors.white, fontSize: 16 },
  cameraCapture: { alignItems: "center", borderColor: colors.white, borderRadius: 36, borderWidth: 3, height: 72, justifyContent: "center", width: 72 },
  cameraCaptureInner: { backgroundColor: colors.white, borderRadius: 28, height: 56, width: 56 },
  cameraSpacer: { width: 60 },
  cameraHint: { backgroundColor: "rgba(0,0,0,0.85)", color: colors.textSecondary, fontSize: 12, paddingBottom: spacing.lg, paddingTop: spacing.xs, textAlign: "center" },

  // Contacts modal
  contactsModal: { backgroundColor: colors.bgCard, flex: 1 },
  contactsHeader: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: spacing.lg },
  contactsTitle: { ...typography.heading3, color: colors.textPrimary },
  contactsClose: { ...typography.label, color: colors.accent },
  contactsSearch: { backgroundColor: colors.bgElevated, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, color: colors.textPrimary, fontSize: 14, margin: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  contactItem: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  contactAvatar: { alignItems: "center", backgroundColor: colors.accentDim, borderRadius: radius.full, height: 40, justifyContent: "center", width: 40 },
  contactAvatarText: { color: colors.accentLight, fontSize: 16, fontWeight: "700" },
  contactName: { ...typography.label, color: colors.textPrimary },
  contactSub: { ...typography.caption, color: colors.textSecondary },
  contactsEmpty: { ...typography.caption, color: colors.textTertiary, padding: spacing.xl, textAlign: "center" }
});

type FieldRowProps = {
  field: { id: string; label: string; type: string; risk: string };
  value: string;
  error: string | null;
  isLast: boolean;
  policyOn: boolean;
  onToggle: (v: boolean) => void;
  onChangeValue: (v: string) => void;
};

function FieldRow({ field, value, error, isLast, policyOn, onToggle, onChangeValue }: FieldRowProps) {
  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    if (!value.trim()) return;
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const socialUrlBuilder = SOCIAL_FIELD_URLS[field.id];

  function renderInput() {
    if (field.id === "tcKimlikNo") {
      return <TCKimlikInput value={value} onChange={onChangeValue} hasError={Boolean(error)} />;
    }
    if (field.id === "gender") {
      return <GenderSelect value={value} onChange={onChangeValue} />;
    }
    if (field.id === "bloodType") {
      return <BloodTypeSelect value={value} onChange={onChangeValue} />;
    }
    if (field.type === "date") {
      return <DateInput value={value} onChange={onChangeValue} hasError={Boolean(error)} />;
    }
    return (
      <TextInput
        value={value}
        onChangeText={onChangeValue}
        style={[styles.input, error ? styles.inputError : null]}
        keyboardType={keyboardTypeForField(field as Parameters<typeof keyboardTypeForField>[0])}
        placeholder={placeholderForField(field as Parameters<typeof placeholderForField>[0])}
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
      />
    );
  }

  return (
    <View style={[styles.fieldBlock, !isLast && styles.fieldBorder]}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
        </View>
        {value.trim().length > 0 && socialUrlBuilder && (
          <Pressable style={styles.openBtn} onPress={() => Linking.openURL(socialUrlBuilder(value))}>
            <Text style={styles.openBtnText}>Profili Aç ↗</Text>
          </Pressable>
        )}
        {value.trim().length > 0 && (
          <Pressable style={styles.copyBtn} onPress={copyToClipboard}>
            <Text style={[styles.copyBtnText, copied && styles.copyBtnCopied]}>
              {copied ? "✓" : "Kopyala"}
            </Text>
          </Pressable>
        )}
        <Switch
          value={policyOn}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.white}
          style={styles.fieldSwitch}
        />
      </View>
      {renderInput()}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function TCKimlikInput({ value, onChange, hasError }: { value: string; onChange: (v: string) => void; hasError: boolean }) {
  const isValid = value.length === 11 && validateTCKimlikNo(value);
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, "").slice(0, 11))}
        keyboardType="number-pad"
        maxLength={11}
        style={[styles.input, hasError ? styles.inputError : null]}
        placeholder="00000000000"
        placeholderTextColor={colors.textTertiary}
        autoCorrect={false}
      />
      <View style={styles.tcRow}>
        <Text style={styles.tcCounter}>{value.length}/11 hane</Text>
        {value.length > 0 && (
          <Text style={[styles.tcStatus, isValid ? styles.tcValid : styles.tcInvalid]}>
            {isValid ? "✓ Geçerli numara" : "✗ Geçersiz numara"}
          </Text>
        )}
      </View>
    </View>
  );
}

function GenderSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.genderRow}>
      {GENDER_OPTIONS.map((opt) => (
        <Pressable
          key={opt}
          style={[styles.genderBtn, value === opt && styles.genderBtnActive]}
          onPress={() => onChange(value === opt ? "" : opt)}
        >
          <Text style={[styles.genderBtnText, value === opt && styles.genderBtnTextActive]}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function BloodTypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.bloodGrid}>
      {BLOOD_TYPES.map((bt) => (
        <Pressable
          key={bt}
          style={[styles.bloodBtn, value === bt && styles.bloodBtnActive]}
          onPress={() => onChange(value === bt ? "" : bt)}
        >
          <Text style={[styles.bloodBtnText, value === bt && styles.bloodBtnTextActive]}>{bt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function parseDateParts(v: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return {
      day: String(parseInt(v.slice(8, 10), 10)),
      month: String(parseInt(v.slice(5, 7), 10)),
      year: v.slice(0, 4)
    };
  }
  return { day: "", month: "", year: "" };
}

function DateInput({ value, onChange, hasError }: { value: string; onChange: (v: string) => void; hasError: boolean }) {
  const [day, setDay] = useState(() => parseDateParts(value).day);
  const [month, setMonth] = useState(() => parseDateParts(value).month);
  const [year, setYear] = useState(() => parseDateParts(value).year);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value === prevRef.current) return;
    prevRef.current = value;
    const p = parseDateParts(value);
    setDay(p.day);
    setMonth(p.month);
    setYear(p.year);
  }, [value]);

  function emit(d: string, m: string, y: string) {
    if (y.length === 4 && m.length >= 1 && d.length >= 1) {
      onChange(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    } else {
      onChange("");
    }
  }

  const inputStyle = [styles.input, hasError ? styles.inputError : undefined];

  return (
    <View style={styles.birthDateRow}>
      <View style={styles.birthDatePartNarrow}>
        <Text style={styles.birthDateLabel}>Gün</Text>
        <TextInput value={day} onChangeText={(v) => { setDay(v); emit(v, month, year); }} keyboardType="number-pad" maxLength={2} placeholder="GG" placeholderTextColor={colors.textTertiary} style={inputStyle} autoCorrect={false} />
      </View>
      <View style={styles.birthDatePartNarrow}>
        <Text style={styles.birthDateLabel}>Ay</Text>
        <TextInput value={month} onChangeText={(v) => { setMonth(v); emit(day, v, year); }} keyboardType="number-pad" maxLength={2} placeholder="AA" placeholderTextColor={colors.textTertiary} style={inputStyle} autoCorrect={false} />
      </View>
      <View style={styles.birthDatePartWide}>
        <Text style={styles.birthDateLabel}>Yıl</Text>
        <TextInput value={year} onChangeText={(v) => { setYear(v); emit(day, month, v); }} keyboardType="number-pad" maxLength={4} placeholder="YYYY" placeholderTextColor={colors.textTertiary} style={inputStyle} autoCorrect={false} />
      </View>
    </View>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeTypeIcon(mime: string) {
  if (mime.includes("pdf")) return "📄";
  if (mime.includes("word") || mime.includes("document")) return "📝";
  if (mime.includes("image")) return "🖼";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "📊";
  return "📎";
}

type ExpiryWarning = { fieldId: string; label: string; message: string };

const DATE_FIELD_LABELS: Record<string, string> = {
  idExpiry: "Kimlik / Pasaport geçerlilik",
  birthDate: "Doğum tarihi",
  driverLicenseExpiry: "Sürücü belgesi"
};

function getExpiryWarnings(values: VaultValues): ExpiryWarning[] {
  const warnings: ExpiryWarning[] = [];
  const now = new Date();
  const sixtyDays = 60 * 24 * 60 * 60 * 1000;

  for (const [fieldId, label] of Object.entries(DATE_FIELD_LABELS)) {
    const raw = values[fieldId];
    if (!raw || !raw.match(/^\d{4}-\d{2}-\d{2}$/)) continue;
    const date = new Date(raw);
    if (isNaN(date.getTime())) continue;
    const diff = date.getTime() - now.getTime();
    if (diff < 0) {
      warnings.push({ fieldId, label, message: "Süresi doldu" });
    } else if (diff < sixtyDays) {
      const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
      warnings.push({ fieldId, label, message: `${days} gün içinde sona eriyor` });
    }
  }
  return warnings;
}
