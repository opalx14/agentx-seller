import { getRuntimeOrder, getRuntimeShipment } from "@/lib/repository";
import signatureDemos from "@/data/demo/signature-demos.json";

export type IncidentSimulation = {
  event: string;
  orderId: string;
  matched: boolean;
  customer?: { id: string; name: string };
  shipment?: { carrier: string; status: string; trackingNumber: string; estimatedDelivery?: string };
  proposedMessage?: string;
  controlOutcome: "PROPOSE_OUTREACH" | "FAIL_CLOSED";
  reason: string;
  pipeline: string[];
};

export async function simulateCarrierDelay(orderId = signatureDemos.orders.tracking): Promise<IncidentSimulation> {
  const normalized = orderId.trim().toUpperCase();
  const [order, shipment] = await Promise.all([
    getRuntimeOrder(normalized),
    getRuntimeShipment(normalized),
  ]);

  if (!order || !shipment) {
    return {
      event: "CARRIER_DELAY",
      orderId: normalized,
      matched: false,
      controlOutcome: "FAIL_CLOSED",
      reason: !order ? "ORDER_NOT_FOUND" : "SHIPMENT_NOT_FOUND",
      pipeline: ["carrier event received", `order=${normalized}`, !order ? "order lookup failed" : "shipment lookup failed", "no outreach produced"],
    };
  }

  const proposedMessage = shipment.estimatedDelivery
    ? `We detected a delay affecting ${order.id} with ${shipment.carrier}. We are monitoring the shipment and its current estimated delivery is ${shipment.estimatedDelivery}.`
    : `We detected a delay affecting ${order.id} with ${shipment.carrier}. We are monitoring the shipment and will share the next verified delivery update.`;

  return {
    event: "CARRIER_DELAY",
    orderId: order.id,
    matched: true,
    customer: { id: order.customerId, name: order.customerName },
    shipment: {
      carrier: shipment.carrier,
      status: shipment.status,
      trackingNumber: shipment.trackingNumber,
      estimatedDelivery: shipment.estimatedDelivery,
    },
    proposedMessage,
    controlOutcome: "PROPOSE_OUTREACH",
    reason: "VERIFIED_AFFECTED_ORDER",
    pipeline: [
      "carrier event received",
      `shipment matched=${shipment.trackingNumber}`,
      `order verified=${order.id}`,
      `customer verified=${order.customerId}`,
      "proactive outreach proposed",
      "no refund or compensation executed",
    ],
  };
}
