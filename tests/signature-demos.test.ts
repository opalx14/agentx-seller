import { beforeEach, describe, expect, test } from "bun:test";
import { replayA1002Refund } from "@/lib/decision-replay";
import { simulateCarrierDelay } from "@/lib/incidents";
import { demoStore } from "@/lib/mock-store";
import { runRedTeamSuite } from "@/lib/red-team";

beforeEach(() => {
  demoStore.policy.autoRefundLimit = 500000;
  demoStore.policy.returnWindowDays = 7;
});

function mutableSnapshot() {
  return {
    returns: demoStore.returns.length,
    refunds: demoStore.refunds.length,
    approvals: demoStore.approvals.length,
    conversations: demoStore.conversations.map((item) => ({ id: item.id, status: item.status, messages: item.messages.length })),
    policy: { ...demoStore.policy },
  };
}

describe("signature demo surfaces", () => {
  test("decision time machine replays the same A1002 request without mutating policy", async () => {
    const before = mutableSnapshot();
    const replay = await replayA1002Refund(2_000_000);
    const after = mutableSnapshot();

    expect(replay.proposal).toBe("requestRefund(A1002, 1800000)");
    expect(replay.currentDecision.decision).toBe("REQUIRE_APPROVAL");
    expect(replay.simulatedDecision.decision).toBe("ALLOW");
    expect(replay.changed).toBe(true);
    expect(after).toEqual(before);
  });

  test("red team suite survives every attack without mutable business effects", async () => {
    const before = mutableSnapshot();
    const results = await runRedTeamSuite();
    const after = mutableSnapshot();

    expect(results).toHaveLength(6);
    expect(results.every((result) => result.pass)).toBe(true);
    expect(results.every((result) => result.moneyMoved === 0)).toBe(true);
    expect(after).toEqual(before);
  });

  test("proactive incident simulator matches A1001 and fails closed for unknown orders", async () => {
    const before = mutableSnapshot();
    const matched = await simulateCarrierDelay("A1001");
    const unknown = await simulateCarrierDelay("A9999");
    const after = mutableSnapshot();

    expect(matched.matched).toBe(true);
    expect(matched.customer?.id).toBe("cus_001");
    expect(matched.shipment?.carrier).toBe("GHN");
    expect(matched.controlOutcome).toBe("PROPOSE_OUTREACH");
    expect(unknown.matched).toBe(false);
    expect(unknown.controlOutcome).toBe("FAIL_CLOSED");
    expect(after).toEqual(before);
  });
});
