import { StyleSheet, Text, View } from "react-native";
import { colors, radius, typography } from "../../theme";

type Tone = "accent" | "success" | "warning" | "danger" | "neutral";

const toneMap: Record<Tone, { bg: string; fg: string }> = {
  accent: { bg: colors.accentDim, fg: colors.accentLight },
  success: { bg: colors.successDim, fg: colors.success },
  warning: { bg: colors.warningDim, fg: colors.warning },
  danger: { bg: colors.dangerDim, fg: colors.danger },
  neutral: { bg: colors.bgCard, fg: colors.textSecondary }
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const { bg, fg } = toneMap[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  text: { ...typography.overline }
});
