import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../../theme";

export function Claim({ name, value }: { name: string; value: string }) {
  return (
    <View style={styles.claim}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  claim: { backgroundColor: colors.bgElevated, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, gap: 2, padding: spacing.md },
  name: { ...typography.caption, color: colors.textSecondary },
  value: { ...typography.label, color: colors.textPrimary }
});
