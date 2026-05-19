import * as Crypto from "expo-crypto";

import { PolicyContext, PolicyState, Template, createOdrlPolicy, getAllowedFields } from "../data/pisp";

export type LedgerAction = "GENESIS" | "CONSENT_GRANTED" | "CONSENT_REVOKED" | "SHARE_COMMITTED";

export type LedgerBlock = {
  index: number;
  timestamp: string;
  action: LedgerAction;
  actorDid: string;
  templateId?: string;
  policyHash: string;
  payloadHash: string;
  previousHash: string;
  blockHash: string;
  publicProof: {
    purpose?: string;
    recipient?: string;
    disclosedFieldIds: string[];
    withheldCount: number;
    note: string;
  };
};

const DEVICE_DID = "did:key:z6Mk-pisp-local-sovereign-device";
const GENESIS_PREVIOUS_HASH = "0".repeat(64);

export async function createGenesisBlock(): Promise<LedgerBlock> {
  const timestamp = new Date().toISOString();
  const payload = {
    product: "PISP",
    principle: "Zincire kişisel veri yazılmaz",
    custody: "yalnızca-kullanıcı-cihazı"
  };
  const payloadHash = await sha256(stableStringify(payload));
  const policyHash = await sha256("pisp:genesis-policy");
  const blockHash = await sha256(
    stableStringify({
      index: 0,
      timestamp,
      action: "GENESIS",
      actorDid: DEVICE_DID,
      policyHash,
      payloadHash,
      previousHash: GENESIS_PREVIOUS_HASH
    })
  );

  return {
    index: 0,
    timestamp,
    action: "GENESIS",
    actorDid: DEVICE_DID,
    policyHash,
    payloadHash,
    previousHash: GENESIS_PREVIOUS_HASH,
    blockHash,
    publicProof: {
      disclosedFieldIds: [],
      withheldCount: 0,
      note: "Başlangıç kaydı yerel egemenlik zincirini başlatır. Kişisel veri içermez."
    }
  };
}

export async function createShareBlock(params: {
  chain: LedgerBlock[];
  template: Template;
  policy: PolicyState;
  context: PolicyContext;
}): Promise<LedgerBlock> {
  const { chain, template, policy, context } = params;
  const allowed = getAllowedFields(template, policy);
  const odrlPolicy = createOdrlPolicy(template, policy, context);
  const previous = chain[chain.length - 1];
  const timestamp = new Date().toISOString();
  const disclosedFieldIds = allowed.map((field) => field.id);

  const privatePayloadFingerprint = {
    templateId: template.id,
    output: template.output,
    disclosedFieldIds,
    withheldCount: template.fieldIds.length - allowed.length,
    purpose: context.purpose,
    recipient: context.recipient,
    expiryDays: context.expiryDays,
    usageLimit: context.usageLimit,
    retentionDays: context.retentionDays
  };

  const payloadHash = await sha256(stableStringify(privatePayloadFingerprint));
  const policyHash = await sha256(stableStringify(odrlPolicy));
  const previousHash = previous?.blockHash ?? GENESIS_PREVIOUS_HASH;
  const index = previous ? previous.index + 1 : 0;
  const action: LedgerAction = allowed.length > 0 ? "SHARE_COMMITTED" : "CONSENT_REVOKED";

  const blockHash = await sha256(
    stableStringify({
      index,
      timestamp,
      action,
      actorDid: DEVICE_DID,
      templateId: template.id,
      policyHash,
      payloadHash,
      previousHash
    })
  );

  return {
    index,
    timestamp,
    action,
    actorDid: DEVICE_DID,
    templateId: template.id,
    policyHash,
    payloadHash,
    previousHash,
    blockHash,
    publicProof: {
      purpose: context.purpose,
      recipient: context.recipient,
      disclosedFieldIds,
      withheldCount: template.fieldIds.length - allowed.length,
      note: "Yalnızca hash ve politika metaverisi kayda girer. Alan değerleri kullanıcının cihazında kalır."
    }
  };
}

export async function verifyChain(chain: LedgerBlock[]) {
  if (chain.length === 0) {
    return { valid: true, message: "Henüz kayıt yok" };
  }

  for (let index = 0; index < chain.length; index += 1) {
    const block = chain[index];
    if (!block) {
      return { valid: false, message: `${index}. kayıt eksik` };
    }
    const expectedPreviousHash = index === 0 ? GENESIS_PREVIOUS_HASH : chain[index - 1]?.blockHash;
    if (block.previousHash !== expectedPreviousHash) {
      return { valid: false, message: `${index}. kayıtta önceki hash kırık` };
    }
  }

  return { valid: true, message: `${chain.length} kayıt bağlantılı` };
}

async function sha256(value: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

function stableStringify(value: unknown): string {
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
