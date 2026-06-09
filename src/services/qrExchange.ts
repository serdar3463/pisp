import * as Crypto from "expo-crypto";

import {
  PolicyContext,
  PolicyState,
  Template,
  VaultValues,
  createDisclosurePreview,
  getAllowedFields
} from "../data/pisp";
import { getOrCreateDeviceIdentity, omitSignature, signPayload, verifyPayloadSignature } from "./deviceIdentity";

export type QRRequest = {
  protocol: "pisp.exchange.request.v1";
  requestId: string;
  requesterPublicKey: string;
  templateId: string;
  purpose: string;
  recipient: string;
  requestedFieldIds: string[];
  expiresAt: string;
  signature: string;
};

export type QRDisclosureResponse = {
  protocol: "pisp.exchange.response.v1";
  requestId: string;
  holderPublicKey: string;
  disclosureHash: string;
  disclosedClaims: Record<string, string>;
  withheldCount: number;
  signature: string;
};

export async function createQRRequest(template: Template, context: PolicyContext): Promise<QRRequest> {
  const now = Date.now();
  const identity = await getOrCreateDeviceIdentity();

  const unsigned: Omit<QRRequest, "signature"> = {
    protocol: "pisp.exchange.request.v1",
    requestId: `r${now}`,
    requesterPublicKey: identity.publicKey,
    templateId: template.id,
    purpose: context.purpose,
    recipient: context.recipient,
    requestedFieldIds: template.fieldIds,
    expiresAt: new Date(now + context.expiryDays * 24 * 60 * 60 * 1000).toISOString(),
  };
  return {
    ...unsigned,
    signature: await signPayload(unsigned)
  };
}

export function encodeQRPayload(payload: QRRequest | QRDisclosureResponse) {
  return JSON.stringify(payload);
}

export function parseQRRequest(value: string): QRRequest | null {
  try {
    const parsed = JSON.parse(value) as Partial<QRRequest>;
    if (
      parsed.protocol === "pisp.exchange.request.v1" &&
      typeof parsed.requestId === "string" &&
      typeof parsed.templateId === "string" &&
      typeof parsed.requesterPublicKey === "string" &&
      typeof parsed.signature === "string" &&
      Array.isArray(parsed.requestedFieldIds)
    ) {
      return parsed as QRRequest;
    }
    return null;
  } catch {
    return null;
  }
}


export function verifyQRRequest(request: QRRequest) {
  const isSigned = verifyPayloadSignature(omitSignature(request), request.signature, request.requesterPublicKey);
  const isExpired = Number.isNaN(Date.parse(request.expiresAt)) || Date.parse(request.expiresAt) < Date.now();
  return {
    valid: isSigned && !isExpired,
    isSigned,
    isExpired,
    message: !isSigned ? "İstek imzası doğrulanamadı" : isExpired ? "İsteğin süresi doldu" : "Doğrulanmış istek"
  };
}

export async function createDisclosureResponse(params: {
  request: QRRequest;
  template: Template;
  policy: PolicyState;
  values: VaultValues;
  context: PolicyContext;
}): Promise<QRDisclosureResponse> {
  const { request, template, policy, values, context } = params;
  const identity = await getOrCreateDeviceIdentity();
  const allowed = getAllowedFields(template, policy, values).filter((field) => request.requestedFieldIds.includes(field.id));
  const preview = createDisclosurePreview(template, policy, values, {
    ...context,
    purpose: request.purpose,
    recipient: request.recipient
  });
  const disclosedClaims = Object.fromEntries(allowed.map((field) => [field.id, field.value]));
  const disclosureHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify({
      requestId: request.requestId,
      disclosedClaimKeys: Object.keys(disclosedClaims).sort(),
      withheldCount: preview.withheldClaims,
      purpose: request.purpose,
      recipient: request.recipient
    })
  );

  const unsigned: Omit<QRDisclosureResponse, "signature"> = {
    protocol: "pisp.exchange.response.v1",
    requestId: request.requestId,
    holderPublicKey: identity.publicKey,
    disclosureHash,
    disclosedClaims,
    withheldCount: preview.withheldClaims,
  };
  return {
    ...unsigned,
    signature: await signPayload(unsigned)
  };
}
