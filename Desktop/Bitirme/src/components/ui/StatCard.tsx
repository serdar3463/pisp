import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../../theme";

type Props = {
  label: string;
  value: string;
  sub?: string;
  tone?: "accent" | "success" | "warning" | "danger" | "neutral";
  icon?: string;
};

const TONE_COLOR: Record<NonNullable<Props["tone"]>, string> = {
  accent: colors.accent,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  neutral: colors.textSecondary
};

export function StatCard({ label, value, sub, tone = "neutral", icon }: Props) {
  const c = TONE_COLOR[tone];
  return (
    <View style={[styles.card, tone === "accent" && styles.cardAccent]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : <View style={[styles.dot, { backgroundColor: c }]} />}
      <Text style={[styles.value, { color: c }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, gap: spacing.xs, paddingVertical: spacing.lg },
  cardAccent: { borderColor: colors.accent },
  icon: { fontSize: 20 },
  dot: { borderRadius: radius.full, height: 6, width: 6 },
  value: { ...typography.heading2 },
  label: { ...typography.caption, color: colors.textSecondary, textAlign: "center" },
  sub: { ...typography.caption, color: colors.textTertiary, textAlign: "center" }
});
