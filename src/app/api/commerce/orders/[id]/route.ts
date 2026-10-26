import { getOrder } from "@/lib/commerce";

export async function GET(_request: Request, context: RouteContext<"/api/commerce/orders/[id]">) {
  const { id } = await context.params;
  const order = await getOrder(id);
  if (!order) return Response.json({ error: "order not found" }, { status: 404 });
  return Response.json({ order });
}
