export type StoredDocument = {
  id: string;
  name: string;
  localUri: string;
  size: number;
  mimeType: string;
  addedAt: string;
};

export type TokenTransaction = {
  id: string;
  type: "earned" | "sent" | "received" | "spent";
  amount: number;
  label: string;
  timestamp: string;
};

export type MarketplaceOffer = {
  id: string;
  company: string;
  logo: string;
  category: "İK" | "Sağlık" | "Finans" | "Araştırma";
  description: string;
  fieldIds: string[];
  reward: number;
  expiresInHours: number;
};

export const PREMIUM_TEMPLATE_LIMIT = 3;
export const PREMIUM_TOKEN_COST = 500;

export const TOKEN_TRY_RATE = 0.10;
export const WITHDRAWAL_FEE_PERCENT = 10;
export const MIN_WITHDRAWAL_TOKENS = 500;

export type CompanyOfferQR = {
  protocol: "pisp.offer.v1";
  id: string;
  company: string;
  logo: string;
  category: "İK" | "Sağlık" | "Finans" | "Araştırma";
  description: string;
  fieldIds: string[];
  reward: number;
  expiresInHours: number;
};
