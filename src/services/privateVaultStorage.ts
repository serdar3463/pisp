import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import CryptoJS from "crypto-js";

import { PolicyState, ShareCounts, Template, VaultValues, initialPolicy, initialShareCounts, initialVaultValues } from "../data/pisp";
import { ShareReceipt } from "../data/receipts";
import { MarketplaceOffer, StoredDocument, TokenTransaction } from "../data/marketplace";

export type PrivateVaultSnapshot = {
  vaultValues: VaultValues;
  policy: PolicyState;
  shareCounts: ShareCounts;
  receipts: ShareReceipt[];
  customTemplates: Template[];
  onboardingAccepted: boolean;
  tokenBalance: number;
  isPremium: boolean;
  tokenHistory: TokenTransaction[];
  acceptedOfferIds: string[];
  scannedOffers: MarketplaceOffer[];
  documents: StoredDocument[];
  updatedAt: string;
};

// v3 = AES-256 şifreli (güvenli)
// v2 = plain JSON (geçiş kaynağı)
// v1 = eski AES (geçiş kaynağı)
const STORAGE_KEY       = "pisp.privateVault.v3";
const LEGACY_V2_KEY     = "pisp.privateVault.v2";
const LEGACY_V1_KEY     = "pisp.privateVault.v1";
const ENC_KEY_ID        = "pisp.encKey.v3";
const LEGACY_ENC_KEY_ID = "pisp.localEncryptionKey.v1";
const ONBOARDING_FLAG_KEY = "pisp.onboarding.v1";

export class VaultKeyUnavailableError extends Error {
  constructor() {
    super("vault_key_unavailable");
    this.name = "VaultKeyUnavailableError";
  }
}

export async function loadPrivateVault(): Promise<PrivateVaultSnapshot> {
  const onboardingFlag = await AsyncStorage.getItem(ONBOARDING_FLAG_KEY);
  const hasOnboarded = onboardingFlag === "true";

  const encKey = await getEncryptionKeyWithRetry();
  const hasV3Data = !!(await AsyncStorage.getItem(STORAGE_KEY));

  // Anahtar yok ama şifreli veri var → sessizce sıfırlama, throw et
  if (hasV3Data && !encKey) {
    throw new VaultKeyUnavailableError();
  }

  // v3 okuma (şifreli)
  if (encKey && hasV3Data) {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    try {
      const json = CryptoJS.AES.decrypt(stored!, encKey).toString(CryptoJS.enc.Utf8);
      if (json) {
        const parsed = JSON.parse(json) as Partial<PrivateVaultSnapshot>;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return mergeSnapshot(parsed, hasOnboarded);
        }
      }
    } catch { /* bozuk veri, migrasyona geç */ }
  }

  // v2 → v3 migrasyonu (plain JSON → şifreli)
  const v2 = await AsyncStorage.getItem(LEGACY_V2_KEY);
  if (v2) {
    try {
      const parsed = JSON.parse(v2) as Partial<PrivateVaultSnapshot>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const snapshot = mergeSnapshot(parsed, hasOnboarded);
        const key = await getOrCreateEncryptionKey();
        await encryptAndSave(snapshot, key);
        await AsyncStorage.removeItem(LEGACY_V2_KEY);
        return snapshot;
      }
    } catch { /* bozuk */ }
  }

  // v1 → v3 migrasyonu (eski şifreli)
  const v1 = await AsyncStorage.getItem(LEGACY_V1_KEY);
  if (v1) {
    try {
      const legacyKey = await SecureStore.getItemAsync(LEGACY_ENC_KEY_ID);
      if (legacyKey) {
        const json = CryptoJS.AES.decrypt(v1, legacyKey).toString(CryptoJS.enc.Utf8);
        if (json) {
          const parsed = JSON.parse(json) as Partial<PrivateVaultSnapshot>;
          const snapshot = mergeSnapshot(parsed, hasOnboarded);
          const key = await getOrCreateEncryptionKey();
          await encryptAndSave(snapshot, key);
          await AsyncStorage.removeItem(LEGACY_V1_KEY);
          return snapshot;
        }
      }
    } catch { /* eski veri okunamadı */ }
  }

  return createDefaultSnapshot(hasOnboarded);
}

export async function savePrivateVault(snapshot: PrivateVaultSnapshot) {
  const key = await getOrCreateEncryptionKey();
  await encryptAndSave(snapshot, key);
  if (snapshot.onboardingAccepted) {
    await AsyncStorage.setItem(ONBOARDING_FLAG_KEY, "true");
  }
}

export async function clearPrivateVault() {
  await AsyncStorage.multiRemove([STORAGE_KEY, LEGACY_V2_KEY, LEGACY_V1_KEY, ONBOARDING_FLAG_KEY]);
  try { await SecureStore.deleteItemAsync(ENC_KEY_ID); } catch { /* yok sayılabilir */ }
}

async function encryptAndSave(snapshot: PrivateVaultSnapshot, key: string) {
  const payload = { ...snapshot, updatedAt: new Date().toISOString() };
  const cipher = CryptoJS.AES.encrypt(JSON.stringify(payload), key).toString();
  await AsyncStorage.setItem(STORAGE_KEY, cipher);
}

// 3 deneme, artan bekleme süresi ile
async function getEncryptionKeyWithRetry(maxAttempts = 3): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const key = await SecureStore.getItemAsync(ENC_KEY_ID);
      if (key) return key;
    } catch { /* devam et */ }
    if (i < maxAttempts - 1) {
      await new Promise(r => setTimeout(r, 150 * (i + 1)));
    }
  }
  return null;
}

async function getOrCreateEncryptionKey(): Promise<string> {
  const existing = await getEncryptionKeyWithRetry();
  if (existing) return existing;
  const random = await Crypto.getRandomBytesAsync(32);
  const key = Array.from(random as Uint8Array).map(b => b.toString(16).padStart(2, "0")).join("");
  await SecureStore.setItemAsync(ENC_KEY_ID, key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}

function mergeSnapshot(parsed: Partial<PrivateVaultSnapshot>, hasOnboarded: boolean): PrivateVaultSnapshot {
  return {
    vaultValues: { ...initialVaultValues, ...parsed.vaultValues },
    policy: { ...initialPolicy, ...parsed.policy },
    shareCounts: { ...initialShareCounts, ...parsed.shareCounts },
    receipts: Array.isArray(parsed.receipts) ? parsed.receipts : [],
    customTemplates: Array.isArray(parsed.customTemplates) ? parsed.customTemplates : [],
    onboardingAccepted: hasOnboarded || Boolean(parsed.onboardingAccepted),
    tokenBalance: typeof parsed.tokenBalance === "number" ? parsed.tokenBalance : 0,
    isPremium: Boolean(parsed.isPremium),
    tokenHistory: Array.isArray(parsed.tokenHistory) ? parsed.tokenHistory : [],
    acceptedOfferIds: Array.isArray(parsed.acceptedOfferIds) ? parsed.acceptedOfferIds : [],
    scannedOffers: Array.isArray(parsed.scannedOffers) ? parsed.scannedOffers : [],
    documents: Array.isArray(parsed.documents) ? parsed.documents : [],
    updatedAt: parsed.updatedAt ?? new Date().toISOString()
  };
}

function createDefaultSnapshot(onboardingAccepted: boolean): PrivateVaultSnapshot {
  return {
    vaultValues: initialVaultValues,
    policy: initialPolicy,
    shareCounts: initialShareCounts,
    receipts: [],
    customTemplates: [],
    onboardingAccepted,
    tokenBalance: 0,
    isPremium: false,
    tokenHistory: [],
    acceptedOfferIds: [],
    scannedOffers: [],
    documents: [],
    updatedAt: new Date().toISOString()
  };
}
