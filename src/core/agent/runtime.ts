import { FunctionCallingConfigMode, GoogleGenAI, type FunctionDeclaration } from "@google/genai";
import type { AgentContext, AgentResult } from "@/lib/domain";
import { addAudit } from "@/lib/mock-store";
import { createReturn, getOwnedOrder, getOwnedShipment, requestRefund } from "@/lib/commerce";
import { persistConversationExchange } from "@/lib/persistence";
import { appendRuntimeConversationMessage, getRuntimeConversationForCustomer, setRuntimeConversationStatus } from "@/lib/repository";
import { localizeAgentReply } from "@/features/support/localize-reply";

const MODEL_DEFAULT = "gemini-3.1-flash-lite";
const MAX_TOOL_ROUNDS = 6;
const GEMINI_PLANNER_TIMEOUT_MS = 12_000;
const GEMINI_FINAL_TIMEOUT_MS = 8_000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const SYSTEM_PROMPT = `You are AgentX, a professional autonomous support agent for an online seller.

You handle order status, delivery tracking, returns, refunds, and human escalation. You may converse naturally, but every store-specific fact and every business action must come from tools.

Conversation rules:
- Reply in the customer's language. If a locale is provided by the channel, follow it.
- Be concise, calm, specific, and action-oriented. Ask at most one clarification at a time.
- Never invent order, shipment, ownership, policy, approval, refund, return, or monetary information.
- Never expose internal policy codes or raw backend errors to the customer.
- Never reveal order data after an ownership or verification failure.
- Use business tools before answering anything that depends on store data.
- Never bypass backend policy decisions. The model proposes; deterministic backend policy decides.

Order and delivery:
- For tracking, call getShipment and use only the verified shipment result.

Return/refund workflow:
- Follow a professional guided sequence similar to a modern marketplace: identify the order, understand whether the customer received the parcel, capture the complaint reason, ask for supporting evidence when the issue is damage/wrong/missing item, then perform the requested action only when the request is clear enough.
- If the order ID is missing, ask for it instead of guessing.
- If a return/refund reason is missing or ambiguous, ask one short question before taking the action.
- Action tools already verify ownership and policy. Once order + reason are clear, prefer createReturn/requestRefund directly; getOrder is only an intermediate read when genuinely needed.
- For a full refund without an exact customer-stated amount, omit amount. The backend derives the verified order total.
- If a refund requires approval, state that the request is pending human review; never claim money was refunded.
- If a return/refund is denied by policy, explain the customer-safe reason and offer human support where useful.
- If the customer explicitly asks for a person, use escalateToHuman.

After a tool finishes, do not add unverified facts. Use the structured tool result to produce the final customer response.`;

const FINAL_RESPONSE_PROMPT = `You write the final customer-facing reply for AgentX after a verified backend tool has already run.

You do NOT make business decisions and you do NOT call tools. You only explain the structured result provided to you.

Rules:
- Use only facts in toolOutput and safeFallback. Never invent anything.
- Follow locale exactly: vi = Vietnamese, en = English, hi = Hindi. If locale is absent, follow the user's language.
- Preserve exact order IDs, tracking numbers, carrier names, return/refund/approval IDs, amounts and ETA values.
- Never expose raw policy enum names, snake_case reason codes, internal traces, or implementation details.
- Keep the reply professional and concise: usually 2-5 short lines or sentences.
- For shipment: state current verified status, carrier, ETA if present, and tell the customer they can view delivery details when appropriate.
- For successful return: confirm the return request ID and the next step; do not claim the refund is already complete.
- For processed refund: confirm the verified amount and order.
- For approval-required refund: say the request is created and pending human review. Never say it has been refunded.
- For denied return/refund: explain the customer-safe reason plainly and offer human support if useful.
- For ownership failure: say you cannot verify the order belongs to this account and do not reveal any order details.
- For human escalation: confirm the handoff and say the conversation context will be available to the support agent.
- Do not use marketing language. At most one status emoji is allowed.`;

const declarations: FunctionDeclaration[] = [
  {
    name: "getOrder",
    description: "Read a verified customer's order. Use this when order context is needed before another action. Do not stop after this tool if the original request asks for a refund or return.",
    parametersJsonSchema: {
      type: "object",
      properties: { orderId: { type: "string" } },
      required: ["orderId"],
    },
  },
  {
    name: "getShipment",
    description: "Read shipping and delivery information for a verified customer's order.",
    parametersJsonSchema: {
      type: "object",
      properties: { orderId: { type: "string" } },
      required: ["orderId"],
    },
  },
  {
    name: "createReturn",
    description: "Call this directly when the customer asks to return an item. Backend verifies ownership, delivery state, return window, and duplicate returns, so getOrder is not required first.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        orderId: { type: "string" },
        reason: { type: "string" },
      },
      required: ["orderId", "reason"],
    },
  },
  {
    name: "requestRefund",
    description: "Call this directly when the customer asks for a refund. Backend verifies ownership and decides ALLOW, REQUIRE_APPROVAL, or DENY, so getOrder is not required first. Omit amount for a full refund when no exact amount was stated.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        orderId: { type: "string" },
        amount: {
          type: "number",
          description: "Only an exact amount explicitly stated by the customer. Omit for an unspecified full refund.",
        },
        reason: { type: "string" },
      },
      required: ["orderId", "reason"],
    },
  },
  {
    name: "escalateToHuman",
    description: "Escalate the conversation when the customer asks for a human or the case needs human handling.",
    parametersJsonSchema: {
      type: "object",
      properties: { reason: { type: "string" } },
      required: ["reason"],
    },
  },
];

function extractOrderId(message: string) {
  return message.toUpperCase().match(/A\d{4}/)?.[0];
}

export function deterministicFallbackPlan(message: string): { name: string; args: Record<string, unknown> } {
  const lower = message.toLowerCase();
  const orderId = extractOrderId(message) ?? "";

  if (/nhân viên|human|agent|người thật|bực|angry|không muốn nói chuyện với bot/.test(lower)) {
    return { name: "escalateToHuman", args: { reason: "Customer requested human support" } };
  }
  if (/refund|hoàn tiền|hoàn lại|hoàn toàn bộ|hỏng|bị bể|damaged/.test(lower)) {
    return {
      name: "requestRefund",
      args: { orderId, reason: /hỏng|bị bể|damaged/.test(lower) ? "damaged_item" : "customer_request" },
    };
  }
  if (/return|trả hàng|trả lại|sai size|sai kích cỡ|kích cỡ|không vừa|mặc chật|doesn't fit|doesnt fit/.test(lower)) {
    return {
      name: "createReturn",
      args: { orderId, reason: /size|fit|vừa|kích cỡ|chật/.test(lower) ? "wrong_size" : "customer_request" },
    };
  }
  if (/where|đâu|shipping|shipment|giao|vận chuyển|tracking|tới đâu/.test(lower)) {
    return { name: "getShipment", args: { orderId } };
  }
  return { name: "getOrder", args: { orderId } };
}

type ToolExecution = {
  output: Record<string, unknown>;
  safeReply: string;
  terminal?: boolean;
};

function normalizeOrderId(args: Record<string, unknown>) {
  return String(args.orderId ?? "").trim().toUpperCase();
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: AgentContext,
  trace: AgentResult["trace"],
): Promise<ToolExecution> {
  const orderId = normalizeOrderId(args);
  const requiresOrder = ["getOrder", "getShipment", "createReturn", "requestRefund"].includes(name);

  addAudit("tool_requested", `${name} ${JSON.stringify(args)}`, "success", name);

  if (requiresOrder && !orderId) {
    trace.push({ label: "order ID missing", state: "warning" });
    return {
      output: { ok: false, error: "ORDER_ID_REQUIRED" },
      safeReply: "Please provide your order number, for example A1001, so I can check it safely.",
      terminal: true,
    };
  }

  if (name === "escalateToHuman") {
    const reason = String(args.reason ?? "Customer requested human support");
    addAudit("human_escalated", reason, "warning", "escalateToHuman");
    trace.push({ label: "conversation escalated", state: "warning" });
    return {
      output: { ok: true, escalated: true, reason },
      safeReply: "I’ve escalated this conversation to a human support agent with the context from our chat.",
      terminal: true,
    };
  }

  if (name === "getOrder") {
    const owned = await getOwnedOrder(orderId, context.customerId);
    trace.push({ label: `ownership: ${owned.reason}`, state: owned.ok ? "success" : "warning" });
    if (!owned.ok) {
      return {
        output: { ok: false, error: owned.reason },
        safeReply: "I can’t verify that this order belongs to you, so I can’t expose its details. I can escalate this to a human agent.",
        terminal: true,
      };
    }
    const order = owned.order;
    trace.push({ label: `getOrder(${orderId})`, state: "success" });
    return {
      output: {
        ok: true,
        order: {
          id: order.id,
          status: order.status,
          totalAmount: order.totalAmount,
          currency: order.currency,
          deliveredAt: order.deliveredAt ?? null,
        },
      },
      safeReply: `Order ${order.id} is currently ${order.status}. Total: ${order.totalAmount.toLocaleString("vi-VN")}₫.`,
    };
  }

  if (name === "getShipment") {
    const owned = await getOwnedShipment(orderId, context.customerId);
    trace.push({ label: `ownership: ${owned.reason}`, state: owned.ok ? "success" : "warning" });
    if (!owned.ok) {
      return {
        output: { ok: false, error: owned.reason },
        safeReply: "I can’t verify that this order belongs to you, so I can’t expose its details. I can escalate this to a human agent.",
        terminal: true,
      };
    }
    const shipment = owned.shipment;
    trace.push({ label: `getShipment(${orderId})`, state: shipment ? "success" : "error" });
    if (!shipment) {
      return {
        output: { ok: false, error: "SHIPMENT_NOT_FOUND" },
        safeReply: `I verified ${orderId}, but shipment data is unavailable. I’ll need human support to verify it.`,
        terminal: true,
      };
    }
    return {
      output: {
        ok: true,
        shipment: {
          orderId: shipment.orderId,
          carrier: shipment.carrier,
          trackingNumber: shipment.trackingNumber,
          status: shipment.status,
          estimatedDelivery: shipment.estimatedDelivery ?? null,
        },
      },
      safeReply:
        shipment.status === "delivered"
          ? `Order ${orderId} was delivered via ${shipment.carrier}.`
          : `Order ${orderId} is ${shipment.status.replace("_", " ")} with ${shipment.carrier}. Estimated delivery: ${shipment.estimatedDelivery ?? "not available yet"}.`,
      terminal: true,
    };
  }

  if (name === "createReturn") {
    const reason = String(args.reason ?? "customer_request");
    const result = await createReturn(orderId, reason, context.customerId);
    if (result.policy.reason === "CUSTOMER_OWNERSHIP_MISMATCH") {
      trace.push({ label: "ownership: CUSTOMER_OWNERSHIP_MISMATCH", state: "warning" });
    } else if (result.policy.reason !== "ORDER_NOT_FOUND") {
      trace.push({ label: "ownership: CUSTOMER_VERIFIED", state: "success" });
    }
    trace.push({ label: `return policy: ${result.policy.reason}`, state: result.ok ? "success" : "warning" });
    if (!result.ok) {
      const safeReply = result.policy.reason === "CUSTOMER_OWNERSHIP_MISMATCH"
        ? "I can’t verify that this order belongs to you, so I can’t create a return or expose order details. I can escalate this to a human agent."
        : `I can’t create that return automatically because: ${result.policy.reason}. I can escalate this to a human agent.`;
      return { output: { ok: false, policy: result.policy }, safeReply, terminal: true };
    }
    trace.push({ label: `return created: ${result.request.id}`, state: "success" });
    return {
      output: { ok: true, policy: result.policy, returnRequest: result.request },
      safeReply: `Return ${result.request.id} has been created for ${orderId}. Reason: ${result.request.reason}.`,
      terminal: true,
    };
  }

  if (name === "requestRefund") {
    const reason = String(args.reason ?? "customer_request");
    const amount = typeof args.amount === "number" ? args.amount : undefined;
    const result = await requestRefund(orderId, amount, reason, context.customerId);
    if (result.policy.reason === "CUSTOMER_OWNERSHIP_MISMATCH") {
      trace.push({ label: "ownership: CUSTOMER_OWNERSHIP_MISMATCH", state: "warning" });
    } else if (result.policy.reason !== "ORDER_NOT_FOUND") {
      trace.push({ label: "ownership: CUSTOMER_VERIFIED", state: "success" });
    }
    trace.push({
      label: `refund policy: ${result.policy.reason}`,
      state: result.policy.decision === "DENY" ? "warning" : "success",
    });

    if (!result.ok) {
      const safeReply = result.policy.reason === "CUSTOMER_OWNERSHIP_MISMATCH"
        ? "I can’t verify that this order belongs to you, so I can’t process a refund or expose order details. I can escalate this to a human agent."
        : `The refund was not executed: ${result.policy.reason}.`;
      return { output: { ok: false, policy: result.policy }, safeReply, terminal: true };
    }

    if ("approval" in result && result.approval) {
      const approval = result.approval;
      trace.push({ label: `approval created: ${approval.id}`, state: "warning" });
      trace.push({ label: "conversation escalated", state: "warning" });
      addAudit("human_escalated", `Refund ${approval.id} requires approval.`, "warning", "escalateToHuman");
      return {
        output: {
          ok: true,
          policy: result.policy,
          approval: {
            id: approval.id,
            orderId: approval.orderId,
            amount: approval.amount,
            status: approval.status,
          },
          humanEscalated: true,
        },
        safeReply: `Your refund request for ${approval.amount.toLocaleString("vi-VN")}₫ exceeds the automatic limit. I created approval ${approval.id} and escalated it to a human agent.`,
        terminal: true,
      };
    }

    const refund = result.refund;
    return {
      output: { ok: true, policy: result.policy, refund },
      safeReply: `Refund ${refund.amount.toLocaleString("vi-VN")}₫ for ${orderId} has been processed successfully.`,
      terminal: true,
    };
  }

  addAudit("tool_error", `Unknown tool requested: ${name}`, "error", name);
  trace.push({ label: `unknown tool: ${name}`, state: "error" });
  return {
    output: { ok: false, error: "UNKNOWN_TOOL" },
    safeReply: "I can’t safely perform that action. I can escalate this to a human agent.",
    terminal: true,
  };
}

async function processWithFallback(message: string, context: AgentContext, trace: AgentResult["trace"], model: string): Promise<AgentResult> {
  const planned = deterministicFallbackPlan(message);
  trace.push({ label: `planner: fallback (${model})`, state: "warning" });
  trace.push({ label: `tool selected: ${planned.name}`, state: "success" });
  addAudit("agent_planned", `fallback:${model} -> ${planned.name}`, "warning");
  const executed = await executeTool(planned.name, planned.args, context, trace);
  return { reply: localizeAgentReply(executed.safeReply, context.locale ?? "en"), trace };
}

async function writeGeminiFinalReply(input: {
  ai: GoogleGenAI;
  model: string;
  message: string;
  context: AgentContext;
  toolName: string;
  toolOutput: Record<string, unknown>;
  safeFallback: string;
  trace: AgentResult["trace"];
}) {
  const { ai, model, message, context, toolName, toolOutput, safeFallback, trace } = input;
  try {
    const response = await withTimeout(ai.models.generateContent({
      model,
      contents: JSON.stringify({
        userMessage: message,
        channel: context.channel ?? "web",
        locale: context.locale ?? null,
        toolName,
        toolOutput,
        safeFallback,
      }),
      config: { systemInstruction: FINAL_RESPONSE_PROMPT },
    }), GEMINI_FINAL_TIMEOUT_MS, "GEMINI_FINAL");
    const reply = response.text?.trim();
    if (reply) {
      trace.push({ label: `response: gemini (${model})`, state: "success" });
      return reply;
    }
  } catch (error) {
    addAudit("agent_error", `Gemini final response failed: ${error instanceof Error ? error.message : "unknown error"}`, "error");
    trace.push({ label: "gemini final response failed; safe backend reply used", state: "warning" });
  }
  return localizeAgentReply(safeFallback, context.locale ?? "en");
}

async function processWithGemini(message: string, context: AgentContext, trace: AgentResult["trace"], model: string): Promise<AgentResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const autoConfig = {
    systemInstruction: `${SYSTEM_PROMPT}\n\nChannel locale: ${context.locale ?? "infer from customer message"}.`,
    tools: [{ functionDeclarations: declarations }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
  };
  const firstTurnConfig = autoConfig;
  const chat = ai.chats.create({ model, config: autoConfig });

  let response = await withTimeout(chat.sendMessage({ message, config: firstTurnConfig }), GEMINI_PLANNER_TIMEOUT_MS, "GEMINI_PLANNER");
  trace.push({ label: `planner: gemini (${model})`, state: "success" });
  let lastSafeReply = "I’m unable to complete that request safely right now. I can escalate this to a human agent.";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const calls = response.functionCalls ?? [];
    if (calls.length === 0) {
      const reply = response.text?.trim();
      if (reply) return { reply, trace };
      return { reply: lastSafeReply, trace };
    }

    const functionResponses = [];
    let terminalResult: { name: string; output: Record<string, unknown>; safeReply: string } | undefined;
    for (const call of calls) {
      const name = call.name ?? "";
      const args = (call.args ?? {}) as Record<string, unknown>;
      trace.push({ label: `tool selected: ${name}`, state: "success" });
      addAudit("agent_planned", `gemini:${model} -> ${name}`, "success");
      const executed = await executeTool(name, args, context, trace);
      lastSafeReply = executed.safeReply;
      if (executed.terminal) {
        terminalResult = { name, output: executed.output, safeReply: executed.safeReply };
        break;
      }
      functionResponses.push({
        functionResponse: {
          id: call.id,
          name,
          response: { output: executed.output },
        },
      });
    }

    if (terminalResult) {
      const reply = await writeGeminiFinalReply({
        ai,
        model,
        message,
        context,
        toolName: terminalResult.name,
        toolOutput: terminalResult.output,
        safeFallback: terminalResult.safeReply,
        trace,
      });
      return { reply, trace };
    }

    try {
      response = await withTimeout(chat.sendMessage({ message: functionResponses }), GEMINI_PLANNER_TIMEOUT_MS, "GEMINI_CONTINUATION");
    } catch (error) {
      addAudit("agent_error", `Gemini continuation failed: ${error instanceof Error ? error.message : "unknown error"}`, "error");
      trace.push({ label: "gemini continuation failed; safe backend result used", state: "warning" });
      return { reply: lastSafeReply, trace };
    }
  }

  addAudit("agent_error", `Gemini exceeded ${MAX_TOOL_ROUNDS} tool rounds.`, "error");
  trace.push({ label: "tool round limit reached", state: "warning" });
  return { reply: lastSafeReply, trace };
}

export async function processCustomerMessage(message: string, context: AgentContext = {}): Promise<AgentResult> {
  addAudit("message_received", message, "success");
  const trace: AgentResult["trace"] = [{ label: "message received", state: "success" }];
  const model = process.env.GEMINI_MODEL ?? MODEL_DEFAULT;

  if (context.customerId) {
    const conversation = await getRuntimeConversationForCustomer(context.customerId);
    if (conversation?.status === "human_active") {
      await appendRuntimeConversationMessage(conversation.id, "customer", message);
      addAudit("ai_paused_for_human", `${conversation.id} is under human control; AI execution skipped.`, "warning", "handoffGate");
      trace.push({ label: "human takeover active; AI execution skipped", state: "warning" });
      return {
        reply: localizeAgentReply("Your message has been sent to the support agent handling this conversation.", context.locale ?? "en"),
        trace,
      };
    }
    if (conversation?.status === "closed") await setRuntimeConversationStatus(conversation.id, "ai_active");
  }

  let result: AgentResult;
  if (!process.env.GEMINI_API_KEY) {
    result = await processWithFallback(message, context, trace, model);
  } else {
    try {
      result = await processWithGemini(message, context, trace, model);
    } catch (error) {
      addAudit("agent_error", `Gemini initial request failed: ${error instanceof Error ? error.message : "unknown error"}`, "error");
      result = await processWithFallback(message, context, trace, model);
    }
  }

  try {
    await persistConversationExchange(context, message, result.reply, {
      humanRequired: result.trace.some((item) => item.label === "conversation escalated"),
    });
  } catch (error) {
    addAudit("persistence_error", `Conversation persistence failed: ${error instanceof Error ? error.message : "unknown error"}`, "error");
  }

  return result;
}
