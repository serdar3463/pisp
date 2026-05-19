import { useMemo } from "react";
import { PolicyState, VaultValues, domains, templates } from "../data/pisp";
import { ShareReceipt } from "../data/receipts";
import { getTemplateReadiness } from "../utils/helpers";

export function useVaultStats(values: VaultValues, policy: PolicyState, receipts: ShareReceipt[]) {
  return useMemo(() => {
    const filledCount = Object.values(values).filter((v) => v.trim().length > 0).length;
    const totalFields = Object.values(values).length;
    const enabledDomains = domains.filter((d) => policy[d.id]).length;
    const sensitiveOpen = domains.filter((d) =>
      d.gdpr.includes("Art. 9") && policy[d.id]
    ).length;
    const readinessItems = templates.map((t) => getTemplateReadiness(t, policy, values));
    const readyTemplates = readinessItems.filter((r) => r.percent >= 80).length;
    const last7Days = receipts.filter((r) => {
      const ts = parseInt(r.id.split("-")[0] ?? "0", 10);
      return Date.now() - ts < 7 * 24 * 60 * 60 * 1000;
    }).length;
    const avgRisk = receipts.length > 0
      ? Math.round(receipts.reduce((sum, r) => sum + r.riskScore, 0) / receipts.length)
      : 0;

    return { filledCount, totalFields, enabledDomains, sensitiveOpen, readyTemplates, last7Days, avgRisk };
  }, [values, policy, receipts]);
}
