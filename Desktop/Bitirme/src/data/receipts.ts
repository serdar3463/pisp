export type ShareReceipt = {
  id: string;
  mode: "direct" | "qr";
  templateName: string;
  recipient: string;
  purpose: string;
  disclosedLabels: string[];
  withheldCount: number;
  riskScore: number;
  proof: string;
  timestamp: string;
  revoked?: boolean;
  revokedAt?: string;
};
