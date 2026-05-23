import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AgentMessage, sendAgentMessage } from "../services/aiAgent";
import { colors, radius, spacing, typography } from "../theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  vaultCompleteness: number;
  filledFields: number;
  totalFields: number;
  activeModule: string;
  tokenBalance: number;
  pendingOffers: number;
};

const SUGGESTIONS = [
  "Kasama ne girmeliyim?",
  "Pazar nasıl çalışıyor?",
  "Verilerim güvende mi?",
  "Token nasıl kazanırım?",
];

export function AgentModal(props: Props) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const context = {
    vaultCompleteness: props.vaultCompleteness,
    filledFields: props.filledFields,
    totalFields: props.totalFields,
    activeModule: props.activeModule,
    tokenBalance: props.tokenBalance,
    pendingOffers: props.pendingOffers,
  };

  async function send(text?: string) {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;

    const userMsg: AgentMessage = { role: "user", content: userText };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const reply = await sendAgentMessage(updated, context);
      setMessages([...updated, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...updated, { role: "assistant", content: "Bağlantı hatası. Tekrar dene." }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  function handleClose() {
    setMessages([]);
    setInput("");
    props.onClose();
  }

  return (
    <Modal visible={props.visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.agentAvatar}><Text style={styles.agentAvatarText}>✦</Text></View>
            <View>
              <Text style={styles.headerTitle}>PISP Asistan</Text>
              <Text style={styles.headerSub}>Sana nasıl yardımcı olabilirim?</Text>
            </View>
          </View>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        {/* Mesaj listesi */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✦</Text>
              <Text style={styles.emptyTitle}>PISP Asistan</Text>
              <Text style={styles.emptyBody}>Kasa doldurma, pazar teklifleri veya gizlilik hakkında soru sorabilirsin.</Text>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <Pressable key={s} style={styles.suggestionChip} onPress={() => void send(s)}>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.agentBubble]}>
              {item.role === "assistant" && (
                <View style={styles.agentBadge}><Text style={styles.agentBadgeText}>✦</Text></View>
              )}
              <Text style={[styles.bubbleText, item.role === "user" ? styles.userBubbleText : styles.agentBubbleText]}>
                {item.content}
              </Text>
            </View>
          )}
        />

        {/* Yükleniyor */}
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.loadingText}>Yanıtlanıyor...</Text>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Bir şey sor..."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={500}
            onSubmitEditing={() => void send()}
            returnKeyType="send"
          />
          <Pressable
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => void send()}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg, flex: 1 },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerLeft: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  agentAvatar: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  agentAvatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerTitle: { ...typography.heading3, color: colors.textPrimary },
  headerSub: { ...typography.caption, color: colors.textTertiary },
  closeBtn: { padding: spacing.sm },
  closeBtnText: { color: colors.textSecondary, fontSize: 18 },

  messageList: { flexGrow: 1, gap: spacing.sm, padding: spacing.md },

  emptyState: { alignItems: "center", flex: 1, gap: spacing.sm, marginTop: spacing.xl * 2, padding: spacing.lg },
  emptyIcon: { color: colors.accent, fontSize: 40 },
  emptyTitle: { ...typography.heading2, color: colors.textPrimary },
  emptyBody: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, justifyContent: "center", marginTop: spacing.sm },
  suggestionChip: {
    backgroundColor: "rgba(99,102,241,0.12)",
    borderColor: colors.accent,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  suggestionText: { ...typography.caption, color: colors.accent },

  bubble: { alignItems: "flex-start", flexDirection: "row", gap: spacing.xs, maxWidth: "85%" },
  userBubble: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  agentBubble: { alignSelf: "flex-start" },
  agentBadge: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    marginTop: 2,
    width: 24,
  },
  agentBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  bubbleText: { ...typography.body, borderRadius: radius.md, overflow: "hidden", padding: spacing.sm },
  userBubbleText: { backgroundColor: colors.accent, color: "#fff" },
  agentBubbleText: { backgroundColor: colors.bgCard, color: colors.textPrimary },

  loadingRow: { alignItems: "center", flexDirection: "row", gap: spacing.xs, padding: spacing.sm, paddingHorizontal: spacing.lg },
  loadingText: { ...typography.caption, color: colors.textTertiary },

  inputRow: {
    alignItems: "flex-end",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.textPrimary,
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendBtn: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#fff", fontSize: 20, fontWeight: "800" },
});
