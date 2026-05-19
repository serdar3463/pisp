import { StyleSheet, View, ViewStyle } from "react-native";
import { colors, radius, shadow, spacing } from "../../theme";

type Props = { children: React.ReactNode; style?: ViewStyle; elevated?: boolean };

export function Card({ children, style, elevated }: Props) {
  return (
    <View style={[styles.card, elevated && styles.elevated, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  elevated: {
    ...shadow.card,
    borderColor: colors.borderLight
  }
});
