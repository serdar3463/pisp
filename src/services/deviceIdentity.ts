import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import nacl from "tweetnacl";

const IDENTITY_SEED_KEY = "pisp.deviceIdentity.seed.v1";

export type DeviceIdentity = {
  did: string;
  publicKey: string;
};

export async function getOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  const seed = await getOrCreateSeed();
  const keyPair = nacl.sign.keyPair.fromSeed(hexToBytes(seed));
  const publicKey = bytesToBase64(keyPair.publicKey);
  return {
    did: `did:pisp:${bytesToHex(keyPair.publicKey).slice(0, 32)}`,
    publicKey
  };
}

export async function signPayload(payload: unknown) {
  const seed = await getOrCreateSeed();
  const keyPair = nacl.sign.keyPair.fromSeed(hexToBytes(seed));
  const message = stringToBytes(canonicalStringify(payload));
  return bytesToBase64(nacl.sign.detached(message, keyPair.secretKey));
}

export function verifyPayloadSignature(payload: unknown, signature: string, publicKey: string) {
  try {
    return nacl.sign.detached.verify(
      stringToBytes(canonicalStringify(payload)),
      base64ToBytes(signature),
      base64ToBytes(publicKey)
    );
  } catch {
    return false;
  }
}

export function omitSignature<T extends { signature?: string }>(payload: T): Omit<T, "signature"> {
  const { signature: _signature, ...rest } = payload;
  return rest;
}

async function getOrCreateSeed() {
  const existing = await SecureStore.getItemAsync(IDENTITY_SEED_KEY);
  if (existing) {
    return existing;
  }
  const random = await Crypto.getRandomBytesAsync(32);
  const seed = bytesToHex(random);
  await SecureStore.setItemAsync(IDENTITY_SEED_KEY, seed, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY
  });
  return seed;
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortObject(value));
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObject((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

function stringToBytes(value: string) {
  return new TextEncoder().encode(value);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
