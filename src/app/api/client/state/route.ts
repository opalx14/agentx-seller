import { getRuntimeConversationForCustomer, getRuntimeShipment, listRuntimeOrders } from "@/lib/repository";

export async function GET(request: Request) {
  const customerId = new URL(request.url).searchParams.get("customerId")?.trim();
  if (!customerId) return Response.json({ error: "customerId is required" }, { status: 400 });

  const orders = (await listRuntimeOrders()).filter((order) => order.customerId === customerId);
  if (orders.length === 0) return Response.json({ error: "customer not found" }, { status: 404 });

  const shipments = Object.fromEntries(
    await Promise.all(orders.map(async (order) => [order.id, await getRuntimeShipment(order.id)] as const)),
  );
  const conversation = await getRuntimeConversationForCustomer(customerId);
  const first = orders[0];

  return Response.json({
    customer: { id: customerId, name: first.customerName, phone: first.customerPhone },
    orders,
    shipments,
    conversation,
  });
}
