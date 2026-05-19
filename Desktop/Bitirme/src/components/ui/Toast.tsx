import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { colors, radius, spacing, typography } from "../../theme";

type Tone = "success" | "danger" | "warning" | "neutral";

type Props = {
  message: string;
  tone?: Tone;
  visible: boolean;
};

const TONE_COLORS: Record<Tone, { bg: string; text: string; border: string }> = {
  success: { bg: colors.successDim, text: colors.success, border: colors.success },
  danger: { bg: colors.dangerDim, text: colors.danger, border: colors.danger },
  warning: { bg: colors.warningDim, text: colors.warning, border: colors.warning },
  neutral: { bg: colors.bgElevated, text: colors.textSecondary, border: colors.border }
};

const TONE_ICONS: Record<Tone, string> = {
  success: "✓",
  danger: "✕",
  warning: "⚠",
  neutral: "ℹ"
};

export function Toast({ message, tone = "neutral", visible }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 120, friction: 8 })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -8, duration: 200, useNativeDriver: true })
      ]).start();
    }
  }, [visible, opacity, translateY]);

  const c = TONE_COLORS[tone];

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }], backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.icon, { color: c.text }]}>{TONE_ICONS[tone]}</Text>
      <Text style={[styles.message, { color: c.text }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md, paddingHorizontal: spacing.lg },
  icon: { ...typography.label, fontSize: 14 },
  message: { ...typography.label, flex: 1 }
});
