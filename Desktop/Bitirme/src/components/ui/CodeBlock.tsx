import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../../theme";

export function CodeBlock({ value }: { value: string }) {
  return (
    <View style={styles.block}>
      <Text selectable style={styles.text}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.bg, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, padding: spacing.md },
  text: { ...typography.mono, color: colors.accentLight }
});
