import { requestRefund } from "@/lib/commerce";

export async function POST(request: Request) {
  const body = (await request.json()) as { orderId?: string; amount?: number; reason?: string; customerId?: string };
  if (!body.orderId || typeof body.amount !== "number" || !body.reason || !body.customerId) {
    return Response.json({ error: "orderId, amount, reason and customerId are required" }, { status: 400 });
  }
  const result = await requestRefund(body.orderId, body.amount, body.reason, body.customerId);
  return Response.json(result, { status: result.ok ? 200 : 422 });
}
