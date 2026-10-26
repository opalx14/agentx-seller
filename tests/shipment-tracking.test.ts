import { describe, expect, test } from "bun:test";
import { buildShipmentTracking } from "@/features/shipping/tracking";

describe("shipment tracking factory", () => {
  test("builds a deterministic in-transit route with a current hub", () => {
    const tracking = buildShipmentTracking({
      orderId: "A1005",
      carrier: "GHN",
      trackingNumber: "GHN-A1005",
      status: "in_transit",
      estimatedDelivery: "2026-10-25",
    });

    expect(tracking.orderId).toBe("A1005");
    expect(tracking.stages).toHaveLength(6);
    expect(tracking.stages.filter((stage) => stage.state === "current")).toHaveLength(1);
    expect(tracking.currentArea.length).toBeGreaterThan(3);
    expect(tracking.progress).toBeGreaterThan(0);
    expect(tracking.progress).toBeLessThan(100);
    expect(tracking.stages.some((stage) => stage.area.includes("Bình Thạnh") || stage.area.includes("HCM"))).toBe(true);
  });

  test("marks delivery as complete without inventing a future current stage", () => {
    const tracking = buildShipmentTracking({
      orderId: "A1002",
      carrier: "GHTK",
      trackingNumber: "GHTK-A1002",
      status: "delivered",
      estimatedDelivery: "2026-10-21",
    });

    expect(tracking.progress).toBe(100);
    expect(tracking.currentArea).toBe("Delivery address");
    expect(tracking.stages.at(-1)?.state).toBe("current");
    expect(tracking.stages.slice(0, -1).every((stage) => stage.state === "completed")).toBe(true);
  });
});
