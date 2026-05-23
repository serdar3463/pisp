export const colors = {
  // Base
  bg: "#0a0a0f",
  bgElevated: "#111118",
  bgCard: "#16161f",
  bgCardHover: "#1c1c28",

  // Borders
  border: "#1e1e2e",
  borderLight: "#2a2a3d",

  // Brand - mavi/mor gradient
  accent: "#6366f1",
  accentLight: "#818cf8",
  accentDim: "#1e1f3a",

  // Text
  textPrimary: "#f1f1f5",
  textSecondary: "#8b8ba7",
  textTertiary: "#4a4a6a",
  textInverse: "#0a0a0f",

  // Status
  success: "#22c55e",
  successDim: "#052e16",
  warning: "#f59e0b",
  warningDim: "#1c1007",
  danger: "#ef4444",
  dangerDim: "#1c0505",

  // Special
  white: "#ffffff",
  overlay: "rgba(0,0,0,0.7)"
};

export const typography = {
  // Display
  display: { fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.5, lineHeight: 38 },
  heading1: { fontSize: 26, fontWeight: "700" as const, letterSpacing: -0.3, lineHeight: 32 },
  heading2: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.2, lineHeight: 26 },
  heading3: { fontSize: 17, fontWeight: "600" as const, letterSpacing: -0.1, lineHeight: 22 },

  // Body
  bodyLarge: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
  body: { fontSize: 14, fontWeight: "400" as const, lineHeight: 21 },
  bodySmall: { fontSize: 13, fontWeight: "400" as const, lineHeight: 19 },

  // UI
  label: { fontSize: 13, fontWeight: "600" as const, letterSpacing: 0.1 },
  caption: { fontSize: 12, fontWeight: "400" as const, lineHeight: 17 },
  overline: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.2 },
  mono: { fontSize: 12, fontWeight: "400" as const, fontFamily: "monospace" as const }
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999
};

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  elevated: {
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8
  }
};
