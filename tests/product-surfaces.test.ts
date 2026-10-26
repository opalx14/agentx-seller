import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { processCustomerMessage } from "@/lib/agent";
import { demoStore } from "@/lib/mock-store";
import {
  appendRuntimeConversationMessage,
  getRuntimeConversation,
  setRuntimeConversationStatus,
  updateRuntimePolicy,
} from "@/lib/repository";
import { runScenarioSuite } from "@/lib/scenarios";

let originalGeminiKey: string | undefined;
let originalPolicy: { autoRefundLimit: number; returnWindowDays: number };

beforeEach(() => {
  originalGeminiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  originalPolicy = { ...demoStore.policy };
  const conversation = demoStore.conversations.find((item) => item.id === "CONV-1002");
  if (conversation) {
    conversation.status = "human_required";
    conversation.assignedTo = undefined;
    conversation.messages = conversation.messages.filter((message) => message.sender !== "human" && !message.content.includes("joined the conversation"));
  }
});

afterEach(() => {
  if (originalGeminiKey) process.env.GEMINI_API_KEY = originalGeminiKey;
  else delete process.env.GEMINI_API_KEY;
  demoStore.policy.autoRefundLimit = originalPolicy.autoRefundLimit;
  demoStore.policy.returnWindowDays = originalPolicy.returnWindowDays;
});

describe("product surface state machine", () => {
  test("human takeover pauses AI and release restores AI", async () => {
    await setRuntimeConversationStatus("CONV-1002", "human_active", "Shop agent");
    const paused = await processCustomerMessage("Are you still there?", { customerId: "cus_002", channel: "web" });
    expect(paused.trace.some((item) => item.label.includes("AI execution skipped"))).toBe(true);
    expect(paused.reply).toContain("support agent");

    await appendRuntimeConversationMessage("CONV-1002", "human", "Yes. I am reviewing the refund for you now.");
    const duringHuman = await getRuntimeConversation("CONV-1002");
    expect(duringHuman?.status).toBe("human_active");
    expect(duringHuman?.messages.at(-1)?.sender).toBe("human");

    await setRuntimeConversationStatus("CONV-1002", "ai_active");
    const resumed = await processCustomerMessage("Where is my order A1002?", { customerId: "cus_002", channel: "web" });
    expect(resumed.trace.some((item) => item.label === "tool selected: getShipment")).toBe(true);
    expect(resumed.trace.some((item) => item.label.includes("AI execution skipped"))).toBe(false);
  });

  test("hub policy mutations change deterministic scenario expectations", async () => {
    await updateRuntimePolicy({ autoRefundLimit: 500000, returnWindowDays: 7 });
    const baseline = await runScenarioSuite();
    expect(baseline.every((scenario) => scenario.pass)).toBe(true);

    await updateRuntimePolicy({ autoRefundLimit: 2000000, returnWindowDays: 7 });
    const changed = await runScenarioSuite();
    const thresholdScenario = changed.find((scenario) => scenario.id === "S06");
    expect(thresholdScenario?.expected).toBe("ALLOW");
    expect(thresholdScenario?.actual).toBe("ALLOW");
    expect(thresholdScenario?.pass).toBe(true);
  });
});
