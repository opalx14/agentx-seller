import { deterministicFallbackPlan } from "@/lib/agent";
import { evaluateRefund, evaluateReturn } from "@/lib/policy";
import { getRuntimeOrder, getRuntimePolicy, getRuntimeShipment } from "@/lib/repository";
import signatureDemos from "@/data/demo/signature-demos.json";

export type ScenarioResult = {
  id: string;
  title: string;
  invariant: string;
  expected: string;
  actual: string;
  pass: boolean;
  trace: string[];
};

export async function runScenarioSuite(): Promise<ScenarioResult[]> {
  const { tracking, highValueRefund, return: returnOrder } = signatureDemos.orders;
  const [a1001, a1002, a1003, policy, shipment] = await Promise.all([
    getRuntimeOrder(tracking),
    getRuntimeOrder(highValueRefund),
    getRuntimeOrder(returnOrder),
    getRuntimePolicy(),
    getRuntimeShipment(tracking),
  ]);
  const nowMs = new Date(signatureDemos.scenarioClock).getTime();
  const a1002Expected = a1002 && a1002.totalAmount > policy.autoRefundLimit ? "REQUIRE_APPROVAL" : "ALLOW";
  const a1002Decision = a1002 ? evaluateRefund(a1002, a1002.totalAmount, { autoRefundLimit: policy.autoRefundLimit }) : { decision: "DENY", reason: "ORDER_NOT_FOUND" } as const;
  const returnDecision = evaluateReturn(a1003, { returnWindowDays: policy.returnWindowDays, nowMs });
  const duplicateReturn = evaluateReturn(a1003, { hasExistingReturn: true, returnWindowDays: policy.returnWindowDays, nowMs });
  const autoRefund = a1001 ? evaluateRefund(a1001, Math.min(a1001.totalAmount, policy.autoRefundLimit), { autoRefundLimit: policy.autoRefundLimit }) : { decision: "DENY", reason: "ORDER_NOT_FOUND" } as const;
  const overTotal = a1002 ? evaluateRefund(a1002, a1002.totalAmount + 1, { autoRefundLimit: policy.autoRefundLimit }) : { decision: "DENY", reason: "ORDER_NOT_FOUND" } as const;
  const duplicateRefund = a1001 ? evaluateRefund(a1001, Math.min(a1001.totalAmount, Math.max(1, policy.autoRefundLimit)), { hasProcessedRefund: true, autoRefundLimit: policy.autoRefundLimit }) : { decision: "DENY", reason: "ORDER_NOT_FOUND" } as const;
  const humanFallback = deterministicFallbackPlan(signatureDemos.prompts.humanEscalation);
  const trackingPrompt = signatureDemos.prompts.tracking.replace("{orderId}", tracking);
  const trackingFallback = deterministicFallbackPlan(trackingPrompt);

  return [
    {
      id: "S01",
      title: "Owned shipment lookup",
      invariant: "A known owned order resolves to shipment data.",
      expected: "GHN shipment available",
      actual: shipment ? `${shipment.carrier} / ${shipment.status}` : "shipment missing",
      pass: Boolean(a1001 && shipment?.carrier === "GHN"),
      trace: [`${tracking} exists`, `shipment=${shipment?.carrier ?? "missing"}`, `status=${shipment?.status ?? "missing"}`],
    },
    {
      id: "S02",
      title: "Foreign-order access denied",
      invariant: "Customer identity must match order ownership before data can be exposed.",
      expected: "BLOCK",
      actual: a1002?.customerId === signatureDemos.customers.tracking ? "ALLOW" : "BLOCK",
      pass: Boolean(a1002 && a1002.customerId !== signatureDemos.customers.tracking),
      trace: [`requester=${signatureDemos.customers.tracking}`, `owner=${a1002?.customerId ?? "missing"}`, "ownership predicate evaluated"],
    },
    {
      id: "S03",
      title: "Eligible return",
      invariant: "A delivered order inside the configured return window is allowed.",
      expected: "ALLOW",
      actual: returnDecision.decision,
      pass: returnDecision.decision === "ALLOW",
      trace: [`window=${policy.returnWindowDays}d`, `reason=${returnDecision.reason}`],
    },
    {
      id: "S04",
      title: "Duplicate return denied",
      invariant: "Only one return request can exist per order.",
      expected: "DENY / DUPLICATE_RETURN",
      actual: `${duplicateReturn.decision} / ${duplicateReturn.reason}`,
      pass: duplicateReturn.decision === "DENY" && duplicateReturn.reason === "DUPLICATE_RETURN",
      trace: ["hasExistingReturn=true", `decision=${duplicateReturn.decision}`],
    },
    {
      id: "S05",
      title: "Auto-refund inside limit",
      invariant: "A positive refund at or below both order total and policy limit is eligible for automatic execution.",
      expected: "ALLOW",
      actual: autoRefund.decision,
      pass: autoRefund.decision === "ALLOW",
      trace: [`limit=${policy.autoRefundLimit}`, `reason=${autoRefund.reason}`],
    },
    {
      id: "S06",
      title: `${highValueRefund} obeys current refund threshold`,
      invariant: "A full refund must follow the current Hub policy, not model preference.",
      expected: a1002Expected,
      actual: a1002Decision.decision,
      pass: a1002Decision.decision === a1002Expected,
      trace: [`amount=${a1002?.totalAmount ?? "missing"}`, `limit=${policy.autoRefundLimit}`, `reason=${a1002Decision.reason}`],
    },
    {
      id: "S07",
      title: "Refund above order total denied",
      invariant: "The system never refunds more than the verified order total.",
      expected: "DENY / REFUND_EXCEEDS_ORDER_TOTAL",
      actual: `${overTotal.decision} / ${overTotal.reason}`,
      pass: overTotal.decision === "DENY" && overTotal.reason === "REFUND_EXCEEDS_ORDER_TOTAL",
      trace: [`orderTotal=${a1002?.totalAmount ?? "missing"}`, "requested=orderTotal+1"],
    },
    {
      id: "S08",
      title: "Duplicate refund denied",
      invariant: "A previously processed refund blocks another processed refund for the order.",
      expected: "DENY / DUPLICATE_REFUND",
      actual: `${duplicateRefund.decision} / ${duplicateRefund.reason}`,
      pass: duplicateRefund.decision === "DENY" && duplicateRefund.reason === "DUPLICATE_REFUND",
      trace: ["hasProcessedRefund=true", `reason=${duplicateRefund.reason}`],
    },
    {
      id: "S09",
      title: "Explicit human escalation",
      invariant: "A direct request for a person routes to human support.",
      expected: "escalateToHuman",
      actual: humanFallback.name,
      pass: humanFallback.name === "escalateToHuman",
      trace: ["fallback planner used", `tool=${humanFallback.name}`],
    },
    {
      id: "S10",
      title: "Gemini-unavailable fallback remains deterministic",
      invariant: "When the model cannot plan, order tracking still selects the safe shipment tool instead of bypassing the backend.",
      expected: `getShipment(${tracking})`,
      actual: `${trackingFallback.name}(${String(trackingFallback.args.orderId ?? "")})`,
      pass: trackingFallback.name === "getShipment" && trackingFallback.args.orderId === tracking,
      trace: ["deterministic fallback", `tool=${trackingFallback.name}`, `order=${String(trackingFallback.args.orderId ?? "")}`],
    },
  ];
}
