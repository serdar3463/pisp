import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../../theme";

export function Metric({ label, value, danger, accent }: { label: string; value: string; danger?: boolean; accent?: boolean }) {
  const valueColor = danger ? colors.danger : accent ? colors.accent : colors.textPrimary;
  return (
    <View style={styles.metric}>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metric: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  value: { ...typography.heading2 },
  label: { ...typography.caption, color: colors.textSecondary }
});
