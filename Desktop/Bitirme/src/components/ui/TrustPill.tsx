import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../../theme";

type Tone = "safe" | "warning" | "danger";

const toneMap: Record<Tone, { bg: string; fg: string; dot: string }> = {
  safe: { bg: colors.successDim, fg: colors.success, dot: colors.success },
  warning: { bg: colors.warningDim, fg: colors.warning, dot: colors.warning },
  danger: { bg: colors.dangerDim, fg: colors.danger, dot: colors.danger }
};

export function TrustPill({ title, value, tone }: { title: string; value: string; tone: Tone }) {
  const { bg, fg, dot } = toneMap[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <View>
        <Text style={[styles.value, { color: fg }]}>{value}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignItems: "center", borderRadius: radius.md, flex: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  dot: { borderRadius: radius.full, height: 8, width: 8 },
  value: { ...typography.label },
  title: { ...typography.caption, color: colors.textSecondary }
});
