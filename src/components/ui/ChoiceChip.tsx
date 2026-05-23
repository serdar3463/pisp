import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing, typography } from "../../theme";

export function ChoiceChip({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable style={[styles.chip, active && styles.active]} onPress={onPress}>
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { backgroundColor: colors.bgCard, borderColor: colors.border, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  active: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  text: { ...typography.label, color: colors.textSecondary },
  textActive: { color: colors.accentLight }
});
