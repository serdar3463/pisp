const SENTRY_DSN = process.env["EXPO_PUBLIC_SENTRY_DSN"];
const isDev = process.env["NODE_ENV"] === "development";

type ErrorContext = Record<string, string | number | boolean>;

function sanitize(context?: ErrorContext): ErrorContext {
  if (!context) return {};
  const safe: ErrorContext = {};
  for (const [key, value] of Object.entries(context)) {
    // Strip keys that might contain personal data
    const lower = key.toLowerCase();
    if (lower.includes("name") || lower.includes("email") || lower.includes("phone") || lower.includes("value")) {
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

export function captureError(error: unknown, context?: ErrorContext): void {
  const message = error instanceof Error ? error.message : String(error);
  const safeContext = sanitize(context);

  if (isDev) {
    console.error("[PISP Error]", message, safeContext);
    return;
  }

  if (!SENTRY_DSN) {
    return;
  }

  // Sentry SDK çağrısı — sentry-expo paketi kurulunca bu kısım devreye girer
  // Şimdilik console.error ile fallback yapıyoruz
  console.error("[PISP Error]", message, safeContext);
}

export function captureMessage(message: string, level: "info" | "warning" = "info"): void {
  if (isDev) {
    console.warn(`[PISP ${level.toUpperCase()}]`, message);
    return;
  }

  if (!SENTRY_DSN) return;

  console.warn(`[PISP ${level.toUpperCase()}]`, message);
}

export function setUserContext(userId: string): void {
  // Hiçbir zaman kişisel bilgi göndermiyoruz; sadece cihaz DID hash'ini kullanıyoruz
  if (isDev) {
    console.warn("[PISP] User context set:", userId.slice(0, 12) + "...");
  }
}
