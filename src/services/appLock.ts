import * as LocalAuthentication from "expo-local-authentication";

export async function unlockLocalVault() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    return {
      ok: true,
      message: "Bu cihazda biyometri/parola tanımlı değil. Kasa bu oturum için açıldı."
    };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "PISP kasasını aç",
    cancelLabel: "Vazgeç",
    disableDeviceFallback: false,
    requireConfirmation: true
  });

  return {
    ok: result.success,
    message: result.success ? "Kasa açıldı" : "Kilit açma iptal edildi"
  };
}

export async function getBiometricStatus(): Promise<{ hasHardware: boolean; isEnrolled: boolean }> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return { hasHardware, isEnrolled };
}
