import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../theme";

export function InfoRow({ title, text, tone = "neutral" }: { title: string; text: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const dotColor = { neutral: colors.accent, success: colors.success, warning: colors.warning, danger: colors.danger }[tone];
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <View style={styles.flex}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  dot: { borderRadius: 3, height: 6, marginTop: 6, width: 6 },
  flex: { flex: 1, gap: 2 },
  title: { ...typography.label, color: colors.textPrimary },
  text: { ...typography.caption, color: colors.textSecondary }
});
