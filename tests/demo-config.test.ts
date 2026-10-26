import { describe, expect, test } from "bun:test";
import onboarding from "@/data/demo/onboarding.json";
import supportFlows from "@/data/demo/support-flows.json";
import trackingConfig from "@/data/demo/tracking-routes.json";
import signatureDemos from "@/data/demo/signature-demos.json";

describe("JSON-backed demo configuration", () => {
  test("onboarding defines the focused Store → Agent → Hub journey", () => {
    expect(onboarding.journey).toBe("refund-approval");
    expect(onboarding.steps.map((step) => step.id)).toEqual([
      "add-product",
      "checkout",
      "open-agent",
      "refund",
      "refund-flow",
      "seller-review",
    ]);
    expect(new Set(onboarding.steps.map((step) => step.target)).size).toBe(onboarding.steps.length);
  });

  test("support reason fixtures live in JSON", () => {
    expect(supportFlows.refund.reasons.some((reason) => reason.value === "damaged_item" && reason.evidence)).toBe(true);
    expect(supportFlows.return.reasons.some((reason) => reason.value === "wrong_size")).toBe(true);
  });

  test("tracking routes and signature demo ids are JSON-backed", () => {
    expect(trackingConfig.routes.GHN).toHaveLength(6);
    expect(trackingConfig.routes.GHN[2]?.area).toBe("HCM Mega SOC");
    expect(signatureDemos.orders).toEqual({ tracking: "A1001", highValueRefund: "A1002", return: "A1003" });
    expect(signatureDemos.timeMachine.simulatedAutoRefundLimit).toBe(2_000_000);
  });
});
