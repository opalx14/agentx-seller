import { getShipment } from "@/lib/commerce";

export async function GET(_request: Request, context: RouteContext<"/api/commerce/orders/[id]/shipment">) {
  const { id } = await context.params;
  const shipment = await getShipment(id);
  if (!shipment) return Response.json({ error: "shipment not found" }, { status: 404 });
  return Response.json({ shipment });
}
