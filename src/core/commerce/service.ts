import { addAudit, demoStore } from "@/lib/mock-store";
import { evaluateRefund, evaluateReturn, type PolicyDecision } from "@/lib/policy";
import { persistApproval, persistRefund, persistReturn } from "@/lib/persistence";
import {
  getRuntimeApproval,
  getRuntimeOrder,
  getRuntimePolicy,
  getRuntimeShipment,
  hasProcessedRuntimeRefund,
  hasRuntimeReturn,
  listRuntimeApprovals,
} from "@/lib/repository";
import { hasSupabasePersistence } from "@/lib/supabase-admin";

function businessId(prefix: "RET" | "REF" | "APR", localLength: number) {
  if (!hasSupabasePersistence()) return `${prefix}-${String(localLength + 1).padStart(4, "0")}`;
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function verifyOrderOwnership(orderId: string, customerId?: string) {
  const order = await getRuntimeOrder(orderId);
  if (!order) return { ok: false as const, reason: "ORDER_NOT_FOUND", order: undefined };
  if (!customerId || order.customerId !== customerId) {
    addAudit("ownership_denied", `${customerId ?? "unknown customer"} attempted to access ${orderId}.`, "warning", "verifyOwnership");
    return { ok: false as const, reason: "CUSTOMER_OWNERSHIP_MISMATCH", order: undefined };
  }
  addAudit("ownership_verified", `${customerId} owns ${orderId}.`, "success", "verifyOwnership");
  return { ok: true as const, reason: "CUSTOMER_VERIFIED", order };
}

export async function getOwnedOrder(orderId: string, customerId?: string) {
  const ownership = await verifyOrderOwnership(orderId, customerId);
  if (!ownership.ok) return ownership;
  addAudit("tool_executed", `Fetched order ${ownership.order.id}.`, "success", "getOrder");
  return ownership;
}

export async function getOwnedShipment(orderId: string, customerId?: string) {
  const ownership = await verifyOrderOwnership(orderId, customerId);
  if (!ownership.ok) return { ...ownership, shipment: undefined };
  const shipment = await getRuntimeShipment(orderId);
  addAudit("tool_executed", shipment ? `Fetched shipment for ${orderId}.` : `Shipment for ${orderId} not found.`, shipment ? "success" : "error", "getShipment");
  return { ...ownership, shipment };
}

export async function getOrder(orderId: string) {
  const order = await getRuntimeOrder(orderId);
  addAudit("tool_executed", order ? `Fetched order ${order.id}.` : `Order ${orderId} not found.`, order ? "success" : "error", "getOrder");
  return order;
}

export async function getShipment(orderId: string) {
  const shipment = await getRuntimeShipment(orderId);
  addAudit("tool_executed", shipment ? `Fetched shipment for ${orderId}.` : `Shipment for ${orderId} not found.`, shipment ? "success" : "error", "getShipment");
  return shipment;
}

export async function createReturn(orderId: string, reason: string, customerId?: string) {
  const ownership = await verifyOrderOwnership(orderId, customerId);
  if (!ownership.ok) {
    const policy: PolicyDecision = { decision: "DENY", reason: ownership.reason };
    addAudit("policy_checked", `${orderId}: ${policy.reason}`, "warning");
    return { ok: false as const, policy };
  }

  const [runtimePolicy, hasExistingReturn] = await Promise.all([
    getRuntimePolicy(),
    hasRuntimeReturn(orderId),
  ]);
  const policy = evaluateReturn(ownership.order, {
    hasExistingReturn,
    returnWindowDays: runtimePolicy.returnWindowDays,
  });
  addAudit("policy_checked", `${orderId}: ${policy.reason}`, policy.decision === "ALLOW" ? "success" : "warning");
  if (policy.decision !== "ALLOW") return { ok: false as const, policy };

  const request = {
    id: businessId("RET", demoStore.returns.length),
    orderId: ownership.order.id,
    reason,
    status: "created" as const,
    createdAt: new Date().toISOString(),
  };
  demoStore.returns.push(request);
  await persistReturn(request);
  addAudit("return_created", `${request.id} created for ${orderId}.`, "success", "createReturn");
  return { ok: true as const, request, policy };
}

export async function requestRefund(orderId: string, amount: number | undefined, reason: string, customerId?: string) {
  const ownership = await verifyOrderOwnership(orderId, customerId);
  if (!ownership.ok) {
    const policy: PolicyDecision = { decision: "DENY", reason: ownership.reason };
    addAudit("policy_checked", `${orderId}: ${policy.reason}`, "warning");
    return { ok: false as const, policy };
  }

  const order = ownership.order;
  const resolvedAmount = typeof amount === "number" && amount > 0 ? amount : order.totalAmount;
  const [runtimePolicy, hasProcessedRefund] = await Promise.all([
    getRuntimePolicy(),
    hasProcessedRuntimeRefund(orderId),
  ]);
  const policy = evaluateRefund(order, resolvedAmount, {
    hasProcessedRefund,
    autoRefundLimit: runtimePolicy.autoRefundLimit,
  });
  addAudit("policy_checked", `${orderId}: ${policy.reason}`, policy.decision === "DENY" ? "warning" : "success");

  if (policy.decision === "DENY") return { ok: false as const, policy };

  if (policy.decision === "REQUIRE_APPROVAL") {
    const approvals = await listRuntimeApprovals();
    const existing = approvals.find((approval) => approval.orderId === order.id && approval.status === "pending");
    const approval = existing ?? {
      id: businessId("APR", demoStore.approvals.length),
      orderId: order.id,
      customerName: order.customerName,
      amount: resolvedAmount,
      reason,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };
    if (!existing) demoStore.approvals.unshift(approval);
    await persistApproval(approval);
    addAudit("approval_created", `${approval.id} for ${order.id} (${resolvedAmount} VND).`, "warning", "requestRefund");
    return { ok: true as const, policy, approval };
  }

  const idempotencyKey = `refund:${order.id}:${resolvedAmount}`;
  const localExisting = demoStore.refunds.find((refund) => refund.idempotencyKey === idempotencyKey);
  if (localExisting) return { ok: true as const, policy, refund: localExisting };

  const refund = {
    id: businessId("REF", demoStore.refunds.length),
    orderId: order.id,
    amount: resolvedAmount,
    reason,
    status: "processed" as const,
    idempotencyKey,
    createdAt: new Date().toISOString(),
  };
  demoStore.refunds.push(refund);
  await persistRefund(refund);
  addAudit("refund_processed", `${refund.id} processed for ${order.id}.`, "success", "requestRefund");
  return { ok: true as const, policy, refund };
}

export async function resolveApproval(id: string, action: "approve" | "reject") {
  const approval = await getRuntimeApproval(id);
  if (!approval || approval.status !== "pending") return null;

  if (action === "reject") {
    approval.status = "rejected";
    const local = demoStore.approvals.find((item) => item.id === id);
    if (local) local.status = "rejected";
    await persistApproval(approval);
    addAudit("approval_rejected", `${approval.id} rejected.`, "warning");
    return approval;
  }

  approval.status = "approved";
  const local = demoStore.approvals.find((item) => item.id === id);
  if (local) local.status = "approved";
  await persistApproval(approval);

  const alreadyProcessed = await hasProcessedRuntimeRefund(approval.orderId);
  if (!alreadyProcessed) {
    const idempotencyKey = `refund:${approval.orderId}:${approval.amount}`;
    const refund = {
      id: businessId("REF", demoStore.refunds.length),
      orderId: approval.orderId,
      amount: approval.amount,
      reason: approval.reason,
      status: "processed" as const,
      idempotencyKey,
      createdAt: new Date().toISOString(),
    };
    demoStore.refunds.push(refund);
    await persistRefund(refund);
  }
  addAudit("refund_processed", `Approved refund processed for ${approval.orderId}.`, "success");
  return approval;
}
