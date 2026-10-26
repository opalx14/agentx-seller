import { getOwnedShipment } from "@/lib/commerce";
import { buildShipmentTracking } from "@/features/shipping/tracking";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customerId = new URL(request.url).searchParams.get("customerId")?.trim();
  if (!customerId) return Response.json({ error: "CUSTOMER_ID_REQUIRED" }, { status: 400 });

  const owned = await getOwnedShipment(id.trim().toUpperCase(), customerId);
  if (!owned.ok) {
    return Response.json({ error: owned.reason }, { status: owned.reason === "ORDER_NOT_FOUND" ? 404 : 403 });
  }
  if (!owned.shipment) return Response.json({ error: "SHIPMENT_NOT_FOUND" }, { status: 404 });

  return Response.json({ tracking: buildShipmentTracking(owned.shipment) });
}
