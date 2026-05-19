import { StyleSheet, View } from "react-native";
import { colors, radius } from "../../theme";

export function Progress({ value, accent = false }: { value: number; accent?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  const fillColor = accent ? colors.accent : pct > 70 ? colors.success : pct > 40 ? colors.warning : colors.danger;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: fillColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.border, borderRadius: radius.full, height: 4, overflow: "hidden", width: "100%" },
  fill: { borderRadius: radius.full, height: 4 }
});
