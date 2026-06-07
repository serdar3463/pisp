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

const STORAGE_KEY = "pisp.privateVault.v1";
const KEY_ID = "pisp.localEncryptionKey.v1";
// Separate plain key so onboarding status survives encryption key changes
const ONBOARDING_FLAG_KEY = "pisp.onboarding.v1";

export async function loadPrivateVault(): Promise<PrivateVaultSnapshot> {
  const [encryptionKey, onboardingFlag] = await Promise.all([
    getOrCreateEncryptionKey(),
    AsyncStorage.getItem(ONBOARDING_FLAG_KEY),
  ]);
  const hasOnboarded = onboardingFlag === "true";

  const encrypted = await AsyncStorage.getItem(STORAGE_KEY);
  if (!encrypted) {
    return createDefaultSnapshot(false);
  }

  try {
    const json = CryptoJS.AES.decrypt(encrypted, encryptionKey).toString(CryptoJS.enc.Utf8);
    if (!json) {
      // Data exists but can't decrypt — key changed; skip onboarding anyway
      return createDefaultSnapshot(hasOnboarded);
    }
    const parsed = JSON.parse(json) as Partial<PrivateVaultSnapshot>;
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
  } catch {
    return createDefaultSnapshot(hasOnboarded);
  }
}

export async function savePrivateVault(snapshot: PrivateVaultSnapshot) {
  const encryptionKey = await getOrCreateEncryptionKey();
  const payload: PrivateVaultSnapshot = {
    ...snapshot,
    updatedAt: new Date().toISOString()
  };
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), encryptionKey).toString();
  await AsyncStorage.setItem(STORAGE_KEY, encrypted);
  // Persist onboarding flag independently — survives encryption key rotation
  if (snapshot.onboardingAccepted) {
    await AsyncStorage.setItem(ONBOARDING_FLAG_KEY, "true");
  }
}

export async function clearPrivateVault() {
  await AsyncStorage.removeItem(STORAGE_KEY);
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

async function getOrCreateEncryptionKey() {
  const existing = await SecureStore.getItemAsync(KEY_ID);
  if (existing) {
    return existing;
  }

  const random = await Crypto.getRandomBytesAsync(32);
  const key = Array.from(random)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  await SecureStore.setItemAsync(KEY_ID, key, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY
  });
  return key;
}
