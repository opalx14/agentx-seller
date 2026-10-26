import { describe, expect, test } from "bun:test";
import { buildHandoffSummary } from "@/features/handoff/summary";
import type { Approval } from "@/lib/domain";
import type { RuntimeConversation } from "@/lib/repository";

const conversation: RuntimeConversation = {
  id: "CONV-TEST",
  customerId: "cus_test",
  customer: "Test Buyer",
  order: "A2001",
  channel: "web",
  status: "human_required",
  updatedAt: "2026-10-23T12:00:00.000Z",
  preview: "Refund my damaged order.",
  messages: [
    { sender: "customer", content: "Order A2001 arrived damaged. Please refund it.", createdAt: "2026-10-23T12:00:00.000Z" },
    { sender: "ai", content: "This refund needs approval.", createdAt: "2026-10-23T12:00:01.000Z" },
  ],
};

const approval: Approval = {
  id: "APR-2001",
  orderId: "A2001",
  customerName: "Test Buyer",
  amount: 1_800_000,
  reason: "AUTO_REFUND_LIMIT_EXCEEDED",
  status: "pending",
  createdAt: "2026-10-23T12:00:01.000Z",
};

describe("human handoff summary", () => {
  test("summarizes the customer issue and pending approval deterministically", () => {
    const summary = buildHandoffSummary(conversation, [approval]);
    expect(summary.issue).toContain("A2001");
    expect(summary.context).toContain("Order A2001");
    expect(summary.context.some((item) => item.includes("1.800.000₫"))).toBe(true);
    expect(summary.reason).toContain("AUTO_REFUND_LIMIT_EXCEEDED");
    expect(summary.nextStep).toContain("APR-2001");
  });

  test("describes explicit human ownership when a specialist has taken over", () => {
    const summary = buildHandoffSummary({ ...conversation, status: "human_active" }, []);
    expect(summary.reason).toContain("human agent");
    expect(summary.nextStep).toContain("return the conversation to AgentX");
  });
});
