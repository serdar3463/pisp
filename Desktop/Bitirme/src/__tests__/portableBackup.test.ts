import { createPortableBackup, restorePortableBackup } from "../services/portableBackup";
import { initialVaultValues, initialPolicy, initialShareCounts } from "../data/pisp";
import { PrivateVaultSnapshot } from "../services/privateVaultStorage";

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: jest.fn().mockResolvedValue("mock-checksum-abc123def456")
}));

const mockSnapshot: PrivateVaultSnapshot = {
  vaultValues: initialVaultValues,
  policy: initialPolicy,
  shareCounts: initialShareCounts,
  receipts: [],
  customTemplates: [],
  onboardingAccepted: true,
  tokenBalance: 100,
  isPremium: false,
  tokenHistory: [],
  acceptedOfferIds: [],
  scannedOffers: [],
  documents: [],
  updatedAt: "2026-01-01T00:00:00.000Z"
};

describe("createPortableBackup", () => {
  it("geçerli passphrase ile yedek oluşturur", async () => {
    const backup = await createPortableBackup(mockSnapshot, "güçlü-parola-12345");
    expect(backup).toBeTruthy();
    const parsed = JSON.parse(backup);
    expect(parsed.protocol).toBe("pisp.backup.v1");
    expect(parsed.ciphertext).toBeTruthy();
    expect(parsed.checksum).toBeTruthy();
  });

  it("10 karakterden kısa passphrase ile hata fırlatır", async () => {
    await expect(createPortableBackup(mockSnapshot, "kısa")).rejects.toThrow();
  });

  it("boş passphrase ile hata fırlatır", async () => {
    await expect(createPortableBackup(mockSnapshot, "")).rejects.toThrow();
  });
});

describe("restorePortableBackup", () => {
  it("oluşturulan yedeği geri yükler", async () => {
    const passphrase = "güçlü-parola-12345";
    const backup = await createPortableBackup(mockSnapshot, passphrase);
    const restored = await restorePortableBackup(backup, passphrase);
    expect(restored.vaultValues).toEqual(mockSnapshot.vaultValues);
    expect(restored.policy).toEqual(mockSnapshot.policy);
    expect(restored.onboardingAccepted).toBe(true);
  });

  it("yanlış passphrase ile hata fırlatır", async () => {
    const backup = await createPortableBackup(mockSnapshot, "doğru-parola-12345");
    await expect(restorePortableBackup(backup, "yanlış-parola-xyz")).rejects.toThrow();
  });

  it("geçersiz JSON ile hata fırlatır", async () => {
    await expect(restorePortableBackup("bu geçerli json değil", "parola")).rejects.toThrow();
  });

  it("yanlış protokol ile hata fırlatır", async () => {
    const fake = JSON.stringify({ protocol: "other.v1", ciphertext: "x", checksum: "y" });
    await expect(restorePortableBackup(fake, "parola-12345")).rejects.toThrow("PISP formatında değil");
  });
});
