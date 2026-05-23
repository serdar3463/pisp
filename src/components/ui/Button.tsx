import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, radius, typography } from "../../theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
};

export function Button({ label, onPress, variant = "primary", disabled, loading, style, fullWidth }: Props) {
  const isDisabled = disabled || loading;

  const variantStyle = {
    primary: styles.primary,
    secondary: styles.secondary,
    ghost: styles.ghost,
    danger: styles.danger
  }[variant];

  const textStyle = {
    primary: styles.textPrimary,
    secondary: styles.textSecondary,
    ghost: styles.textGhost,
    danger: styles.textDanger
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && styles.pressed,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === "primary" ? colors.white : colors.accent} />
      ) : (
        <Text style={[styles.text, textStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14
  },
  fullWidth: { width: "100%" },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.accentDim, borderColor: colors.borderLight, borderWidth: 1 },
  ghost: { backgroundColor: "transparent", borderColor: colors.border, borderWidth: 1 },
  danger: { backgroundColor: colors.dangerDim, borderColor: colors.danger, borderWidth: 1 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
  text: { ...typography.label },
  textPrimary: { color: colors.white },
  textSecondary: { color: colors.accentLight },
  textGhost: { color: colors.textSecondary },
  textDanger: { color: colors.danger }
});
