import type { Order } from "@/lib/domain";

export const AUTO_REFUND_LIMIT = 500000;
export const RETURN_WINDOW_DAYS = 7;

export type PolicyDecision =
  | { decision: "ALLOW"; reason: string }
  | { decision: "REQUIRE_APPROVAL"; reason: string }
  | { decision: "DENY"; reason: string };

export function evaluateRefund(
  order: Order | undefined,
  amount: number,
  options: { hasProcessedRefund?: boolean; autoRefundLimit?: number } = {},
): PolicyDecision {
  const autoRefundLimit = options.autoRefundLimit ?? AUTO_REFUND_LIMIT;
  if (!order) return { decision: "DENY", reason: "ORDER_NOT_FOUND" };
  if (amount <= 0) return { decision: "DENY", reason: "INVALID_AMOUNT" };
  if (amount > order.totalAmount) return { decision: "DENY", reason: "REFUND_EXCEEDS_ORDER_TOTAL" };
  if (options.hasProcessedRefund) return { decision: "DENY", reason: "DUPLICATE_REFUND" };
  if (amount > autoRefundLimit) {
    return { decision: "REQUIRE_APPROVAL", reason: "AUTO_REFUND_LIMIT_EXCEEDED" };
  }
  return { decision: "ALLOW", reason: "WITHIN_AUTO_REFUND_LIMIT" };
}

export function evaluateReturn(
  order: Order | undefined,
  options: { hasExistingReturn?: boolean; returnWindowDays?: number; nowMs?: number } = {},
): PolicyDecision {
  const returnWindowDays = options.returnWindowDays ?? RETURN_WINDOW_DAYS;
  if (!order) return { decision: "DENY", reason: "ORDER_NOT_FOUND" };
  if (order.status !== "delivered" || !order.deliveredAt) return { decision: "DENY", reason: "ORDER_NOT_DELIVERED" };
  if (options.hasExistingReturn) return { decision: "DENY", reason: "DUPLICATE_RETURN" };

  const delivered = new Date(order.deliveredAt).getTime();
  const now = options.nowMs ?? Date.now();
  const ageDays = (now - delivered) / 86400000;
  if (ageDays > returnWindowDays) return { decision: "DENY", reason: "RETURN_WINDOW_EXPIRED" };
  return { decision: "ALLOW", reason: "WITHIN_RETURN_WINDOW" };
}
