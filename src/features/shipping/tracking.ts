import type { Shipment } from "@/lib/domain";
import trackingConfig from "@/data/demo/tracking-routes.json";

export type TrackingStageState = "completed" | "current" | "upcoming";

export type TrackingStage = {
  id: string;
  title: string;
  detail: string;
  area: string;
  time?: string;
  state: TrackingStageState;
  point: { x: number; y: number };
};

export type ShipmentTracking = {
  orderId: string;
  carrier: string;
  trackingNumber: string;
  status: Shipment["status"];
  estimatedDelivery?: string;
  currentArea: string;
  currentDetail: string;
  progress: number;
  stages: TrackingStage[];
};

type TrackingRouteStage = Omit<TrackingStage, "id" | "time" | "state">;
const routes = trackingConfig.routes as Record<string, TrackingRouteStage[]>;

function routeFor(carrier: string) {
  return routes[carrier] ?? routes.GHN;
}

function deterministicInTransitStage(orderId: string) {
  const digits = Number(orderId.replace(/\D/g, "")) || 0;
  return 2 + (digits % 2);
}

function formatStageTime(estimatedDelivery: string | undefined, index: number) {
  if (!estimatedDelivery) return undefined;
  const eta = new Date(`${estimatedDelivery}T10:00:00+07:00`);
  if (Number.isNaN(eta.getTime())) return undefined;
  eta.setHours(eta.getHours() - (trackingConfig.stageTimeOffsetsHours[index] ?? 0));
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(eta);
}

export function buildShipmentTracking(shipment: Shipment): ShipmentTracking {
  const route = routeFor(shipment.carrier);
  const currentIndex = shipment.status === "delivered"
    ? route.length - 1
    : shipment.status === "label_created"
      ? 0
      : deterministicInTransitStage(shipment.orderId);

  const stages: TrackingStage[] = route.map((stage, index) => ({
    id: `${shipment.orderId}:${index}`,
    ...stage,
    time: index <= currentIndex ? formatStageTime(shipment.estimatedDelivery, index) : undefined,
    state: index < currentIndex ? "completed" : index === currentIndex ? "current" : "upcoming",
  }));

  const current = stages[currentIndex] ?? stages[0];
  return {
    orderId: shipment.orderId,
    carrier: shipment.carrier,
    trackingNumber: shipment.trackingNumber,
    status: shipment.status,
    estimatedDelivery: shipment.estimatedDelivery,
    currentArea: current.area,
    currentDetail: current.detail,
    progress: Math.round((currentIndex / (stages.length - 1)) * 100),
    stages,
  };
}
