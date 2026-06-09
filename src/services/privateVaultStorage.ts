import AsyncStorage from "@react-native-async-storage/async-storage";
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

// v2 = plain JSON (reliable). v1 = legacy encrypted (migration only).
const STORAGE_KEY = "pisp.privateVault.v2";
const LEGACY_KEY = "pisp.privateVault.v1";
const LEGACY_ENC_KEY_ID = "pisp.localEncryptionKey.v1";
const ONBOARDING_FLAG_KEY = "pisp.onboarding.v1";

export async function loadPrivateVault(): Promise<PrivateVaultSnapshot> {
  const onboardingFlag = await AsyncStorage.getItem(ONBOARDING_FLAG_KEY);
  const hasOnboarded = onboardingFlag === "true";

  // Try v2 (plain JSON) first
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<PrivateVaultSnapshot>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return mergeSnapshot(parsed, hasOnboarded);
      }
    } catch { /* corrupted, fall through */ }
  }

  // Try v1 migration (legacy encrypted)
  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (legacy) {
    try {
      const encKey = await SecureStore.getItemAsync(LEGACY_ENC_KEY_ID);
      if (encKey) {
        const json = CryptoJS.AES.decrypt(legacy, encKey).toString(CryptoJS.enc.Utf8);
        if (json) {
          const parsed = JSON.parse(json) as Partial<PrivateVaultSnapshot>;
          const snapshot = mergeSnapshot(parsed, hasOnboarded);
          // Migrate to v2
          await savePrivateVault(snapshot);
          await AsyncStorage.removeItem(LEGACY_KEY);
          return snapshot;
        }
      }
    } catch { /* legacy unreadable, ignore */ }
  }

  return createDefaultSnapshot(hasOnboarded);
}

export async function savePrivateVault(snapshot: PrivateVaultSnapshot) {
  const payload: PrivateVaultSnapshot = { ...snapshot, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  if (snapshot.onboardingAccepted) {
    await AsyncStorage.setItem(ONBOARDING_FLAG_KEY, "true");
  }
}

export async function clearPrivateVault() {
  await AsyncStorage.multiRemove([STORAGE_KEY, LEGACY_KEY]);
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
