import { addAudit } from "@/lib/mock-store";
import { getRuntimePolicy, updateRuntimePolicy } from "@/lib/repository";

export async function GET() {
  return Response.json({ policy: await getRuntimePolicy() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { autoRefundLimit?: number; returnWindowDays?: number };
  if (typeof body.autoRefundLimit !== "number" || typeof body.returnWindowDays !== "number") {
    return Response.json({ error: "autoRefundLimit and returnWindowDays are required" }, { status: 400 });
  }
  try {
    const policy = await updateRuntimePolicy({ autoRefundLimit: body.autoRefundLimit, returnWindowDays: body.returnWindowDays });
    addAudit("policy_updated", `Auto-refund limit=${policy.autoRefundLimit}; return window=${policy.returnWindowDays} days.`, "warning", "policyLab");
    return Response.json({ policy });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "policy update failed" }, { status: 422 });
  }
}
