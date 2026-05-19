import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../theme";

export function Section({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) {
  return (
    <View style={styles.section}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {text ? <Text style={styles.body}>{text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.xs },
  eyebrow: { ...typography.overline, color: colors.accent },
  title: { ...typography.heading2, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary }
});
