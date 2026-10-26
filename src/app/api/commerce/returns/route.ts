import { createReturn } from "@/lib/commerce";

export async function POST(request: Request) {
  const body = (await request.json()) as { orderId?: string; reason?: string; customerId?: string };
  if (!body.orderId || !body.reason || !body.customerId) return Response.json({ error: "orderId, reason and customerId are required" }, { status: 400 });
  const result = await createReturn(body.orderId, body.reason, body.customerId);
  return Response.json(result, { status: result.ok ? 201 : 422 });
}
