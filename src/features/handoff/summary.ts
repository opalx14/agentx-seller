import type { Approval } from "@/lib/domain";
import type { RuntimeConversation } from "@/lib/repository";

export type HandoffSummary = {
  issue: string;
  context: string[];
  reason: string;
  nextStep: string;
};

export function buildHandoffSummary(conversation: RuntimeConversation, approvals: Approval[]): HandoffSummary {
  const customerMessage = [...conversation.messages].reverse().find((message) => message.sender === "customer")?.content
    ?? conversation.preview
    ?? "Customer needs support.";
  const pendingApproval = conversation.order
    ? approvals.find((approval) => approval.orderId === conversation.order && approval.status === "pending")
    : undefined;

  const context = [
    conversation.order ? `Order ${conversation.order}` : "No verified order attached",
    `Channel: ${conversation.channel}`,
  ];

  if (pendingApproval) {
    context.push(`Pending refund approval: ${pendingApproval.amount.toLocaleString("vi-VN")}₫`);
    return {
      issue: customerMessage,
      context,
      reason: `AgentX hit the seller refund guardrail (${pendingApproval.reason}).`,
      nextStep: `Review approval ${pendingApproval.id}, then approve/reject or take over the conversation if more context is needed.`,
    };
  }

  if (conversation.status === "human_active") {
    return {
      issue: customerMessage,
      context,
      reason: "A human agent currently owns this conversation, so AgentX execution is paused.",
      nextStep: "Reply to the customer, resolve the case, or return the conversation to AgentX.",
    };
  }

  if (conversation.status === "human_required") {
    return {
      issue: customerMessage,
      context,
      reason: "AgentX reached a human-support or autonomy boundary.",
      nextStep: "Review the latest customer request and conversation context, then take over or resolve the requested business action.",
    };
  }

  return {
    issue: customerMessage,
    context,
    reason: "No human handoff is currently required.",
    nextStep: "AgentX can continue handling verified routine requests.",
  };
}
