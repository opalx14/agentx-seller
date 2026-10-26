import { evaluateRefund, type PolicyDecision } from "@/lib/policy";
import { getRuntimeOrder, getRuntimePolicy, type RuntimePolicy } from "@/lib/repository";
import signatureDemos from "@/data/demo/signature-demos.json";

export type RefundDecisionReplay = {
  orderId: string;
  customer: string;
  amount: number;
  proposal: string;
  currentPolicy: RuntimePolicy;
  simulatedPolicy: RuntimePolicy;
  currentDecision: PolicyDecision;
  simulatedDecision: PolicyDecision;
  changed: boolean;
  explanation: string;
};

export async function replayA1002Refund(simulatedAutoRefundLimit = signatureDemos.timeMachine.simulatedAutoRefundLimit): Promise<RefundDecisionReplay> {
  if (!Number.isFinite(simulatedAutoRefundLimit) || simulatedAutoRefundLimit < 0) {
    throw new Error("INVALID_SIMULATED_REFUND_LIMIT");
  }

  const [order, currentPolicy] = await Promise.all([
    getRuntimeOrder(signatureDemos.orders.highValueRefund),
    getRuntimePolicy(),
  ]);
  if (!order) throw new Error(`${signatureDemos.orders.highValueRefund}_NOT_FOUND`);

  const simulatedPolicy: RuntimePolicy = {
    ...currentPolicy,
    autoRefundLimit: simulatedAutoRefundLimit,
  };
  const currentDecision = evaluateRefund(order, order.totalAmount, {
    autoRefundLimit: currentPolicy.autoRefundLimit,
  });
  const simulatedDecision = evaluateRefund(order, order.totalAmount, {
    autoRefundLimit: simulatedPolicy.autoRefundLimit,
  });
  const changed = currentDecision.decision !== simulatedDecision.decision
    || currentDecision.reason !== simulatedDecision.reason;

  return {
    orderId: order.id,
    customer: order.customerName,
    amount: order.totalAmount,
    proposal: `requestRefund(${order.id}, ${order.totalAmount})`,
    currentPolicy,
    simulatedPolicy,
    currentDecision,
    simulatedDecision,
    changed,
    explanation: changed
      ? "AI proposal unchanged. Business policy changed the outcome."
      : "The simulated policy produces the same deterministic outcome.",
  };
}
