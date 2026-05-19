const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json() as T & { error?: string; message?: string };
  if (!res.ok) throw new Error((data as { error?: string; message?: string }).error ?? (data as { message?: string }).message ?? `HTTP ${res.status}`);
  return data;
}

export interface OfferValidation {
  valid: boolean;
  remainingSlots: number;
  error?: string;
}

export interface AcceptanceResult {
  success: boolean;
  reward: number;
  error?: string;
}

export interface WithdrawalResult {
  requestId: string;
  error?: string;
}

export interface WithdrawalStatus {
  status: "pending" | "processing" | "completed" | "rejected";
  requestedAt: string;
  processedAt?: string;
  notes?: string;
}

export const pispApi = {
  validateOffer(offerId: string): Promise<OfferValidation> {
    return request<OfferValidation>("GET", `/api/offers/${offerId}/validate`);
  },

  acceptOffer(offerId: string, deviceId: string): Promise<AcceptanceResult> {
    return request<AcceptanceResult>("POST", `/api/offers/${offerId}/accept`, { deviceId });
  },

  requestWithdrawal(deviceId: string, tokenAmount: number): Promise<WithdrawalResult> {
    return request<WithdrawalResult>("POST", "/api/withdrawals", { deviceId, tokenAmount });
  },

  getWithdrawalStatus(requestId: string): Promise<WithdrawalStatus> {
    return request<WithdrawalStatus>("GET", `/api/withdrawals/${requestId}/status`);
  },
};
