import { Component, ReactNode } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";
import { captureError } from "../services/errorTracking";

type State = { error: Error | null; errorId: string | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, errorId: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, errorId: `err-${Date.now()}` };
  }

  componentDidCatch(error: Error) {
    captureError(error, { source: "ErrorBoundary", errorId: this.state.errorId ?? "unknown" });
  }

  handleReset = () => {
    this.setState({ error: null, errorId: null });
  };

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.shell}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PISP</Text>
            </View>
            <Text style={styles.headline}>Bir şey dikkat istiyor.</Text>
            <Text style={styles.body}>
              PISP daha fazla veri göstermeden veya paylaşmadan bu oturumu durdurdu. Uygulamayı yeniden açıp kasanı
              tekrar kilitten çıkar.
            </Text>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Hata detayı</Text>
              <Text style={styles.body}>{this.state.error.message}</Text>
              {this.state.errorId ? <Text style={styles.errorId}>ID: {this.state.errorId}</Text> : null}
            </View>
            <Pressable style={styles.resetButton} onPress={this.handleReset}>
              <Text style={styles.resetText}>Yeniden dene</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.bg,
    flex: 1
  },
  shell: {
    flex: 1,
    gap: 18,
    justifyContent: "center",
    paddingHorizontal: 24
  },
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    borderRadius: 8,
    height: 54,
    justifyContent: "center",
    width: 84
  },
  badgeText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900"
  },
  headline: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  panel: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14
  },
  panelTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4
  },
  errorId: {
    color: colors.textTertiary,
    fontFamily: "monospace",
    fontSize: 11,
    marginTop: 4
  },
  resetButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 14
  },
  resetText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900"
  }
});
