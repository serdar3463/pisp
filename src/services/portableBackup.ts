import * as Crypto from "expo-crypto";
import CryptoJS from "crypto-js";

import { PrivateVaultSnapshot } from "./privateVaultStorage";

export type PortableBackupEnvelope = {
  protocol: "pisp.backup.v1";
  createdAt: string;
  checksum: string;
  ciphertext: string;
};

export async function createPortableBackup(snapshot: PrivateVaultSnapshot, passphrase: string) {
  const normalizedPassphrase = normalizePassphrase(passphrase);
  const payload = JSON.stringify({
    ...snapshot,
    updatedAt: new Date().toISOString()
  });
  const checksum = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload);
  const ciphertext = CryptoJS.AES.encrypt(payload, normalizedPassphrase).toString();
  const envelope: PortableBackupEnvelope = {
    protocol: "pisp.backup.v1",
    createdAt: new Date().toISOString(),
    checksum,
    ciphertext
  };
  return JSON.stringify(envelope);
}

export async function restorePortableBackup(serializedEnvelope: string, passphrase: string): Promise<PrivateVaultSnapshot> {
  const normalizedPassphrase = normalizePassphrase(passphrase);
  const envelope = JSON.parse(serializedEnvelope) as Partial<PortableBackupEnvelope>;
  if (envelope.protocol !== "pisp.backup.v1" || !envelope.ciphertext || !envelope.checksum) {
    throw new Error("Yedek paketi PISP formatında değil.");
  }

  const plaintext = CryptoJS.AES.decrypt(envelope.ciphertext, normalizedPassphrase).toString(CryptoJS.enc.Utf8);
  if (!plaintext) {
    throw new Error("Yedek parolası hatalı veya paket bozuk.");
  }

  const checksum = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, plaintext);
  if (checksum !== envelope.checksum) {
    throw new Error("Yedek bütünlük kontrolünden geçemedi.");
  }

  const parsed = JSON.parse(plaintext) as PrivateVaultSnapshot;
  if (!parsed.vaultValues || !parsed.policy || !parsed.shareCounts) {
    throw new Error("Yedek içinde gerekli kasa alanları yok.");
  }
  return {
    vaultValues: parsed.vaultValues,
    policy: parsed.policy,
    shareCounts: parsed.shareCounts,
    receipts: Array.isArray(parsed.receipts) ? parsed.receipts : [],
    customTemplates: Array.isArray(parsed.customTemplates) ? parsed.customTemplates : [],
    onboardingAccepted: Boolean(parsed.onboardingAccepted),
    tokenBalance: typeof parsed.tokenBalance === "number" ? parsed.tokenBalance : 0,
    isPremium: Boolean(parsed.isPremium),
    tokenHistory: Array.isArray(parsed.tokenHistory) ? parsed.tokenHistory : [],
    acceptedOfferIds: Array.isArray(parsed.acceptedOfferIds) ? parsed.acceptedOfferIds : [],
    scannedOffers: Array.isArray(parsed.scannedOffers) ? parsed.scannedOffers : [],
    documents: [],
    updatedAt: parsed.updatedAt ?? new Date().toISOString()
  };
}

function normalizePassphrase(passphrase: string) {
  const trimmed = passphrase.trim();
  if (trimmed.length < 12) {
    throw new Error("Yedek parolası en az 12 karakter olmalı.");
  }
  return trimmed;
}
