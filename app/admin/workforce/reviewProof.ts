import { apiRequest } from "@/lib/api";

export async function approveWorkerProof(proofId: string, projectId?: string, amount = 0) {
  await apiRequest(`/api/admin/proofs/${proofId}/approve`, "PUT", {}, true);
  if (!projectId || amount <= 0) return { message: "Proof approved. No earnings were credited.", type: "success" } as const;
  try {
    await apiRequest(`/api/admin/workspace/project/${projectId}/credit`, "PUT", { amount }, true);
    return { message: `Proof approved and $${amount.toFixed(2)} credited.`, type: "success" } as const;
  } catch {
    return { message: "Proof approved. Earnings credit could not be confirmed. Check the project’s payment status before retrying.", type: "error" } as const;
  }
}
