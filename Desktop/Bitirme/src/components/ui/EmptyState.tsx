import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../theme";
import { Button } from "./Button";

type Props = {
  icon?: string;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon = "📭", title, text, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} variant="secondary" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxxl },
  icon: { fontSize: 40 },
  title: { ...typography.heading3, color: colors.textPrimary, textAlign: "center" },
  text: { ...typography.body, color: colors.textSecondary, textAlign: "center" }
});
