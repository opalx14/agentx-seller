import { addAudit } from "@/lib/mock-store";
import { appendRuntimeConversationMessage, getRuntimeConversation, setRuntimeConversationStatus } from "@/lib/repository";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as { action?: "takeover" | "release" | "resolve" | "reply"; message?: string; agentName?: string };
  const conversation = await getRuntimeConversation(id);
  if (!conversation) return Response.json({ error: "conversation not found" }, { status: 404 });

  const agentName = body.agentName?.trim() || "Shop agent";

  if (body.action === "takeover") {
    if (conversation.status === "closed") return Response.json({ error: "closed conversation cannot be taken over" }, { status: 409 });
    await setRuntimeConversationStatus(id, "human_active", agentName);
    await appendRuntimeConversationMessage(id, "system", `${agentName} joined the conversation.`);
    addAudit("human_takeover", `${agentName} took over ${id}.`, "warning", "takeover");
    return Response.json({ ok: true, status: "human_active" });
  }

  if (body.action === "release") {
    if (conversation.status !== "human_active") return Response.json({ error: "conversation is not under human control" }, { status: 409 });
    await setRuntimeConversationStatus(id, "ai_active");
    await appendRuntimeConversationMessage(id, "system", `${agentName} returned the conversation to AgentX.`);
    addAudit("human_released", `${agentName} released ${id} back to AI.`, "success", "release");
    return Response.json({ ok: true, status: "ai_active" });
  }

  if (body.action === "resolve") {
    if (conversation.status === "closed") return Response.json({ ok: true, status: "closed" });
    await setRuntimeConversationStatus(id, "closed", agentName);
    await appendRuntimeConversationMessage(id, "system", `${agentName} resolved the conversation.`);
    addAudit("conversation_resolved", `${id} resolved by ${agentName}.`, "success", "resolve");
    return Response.json({ ok: true, status: "closed" });
  }

  if (body.action === "reply") {
    if (conversation.status !== "human_active") return Response.json({ error: "take over the conversation before replying" }, { status: 409 });
    const message = body.message?.trim();
    if (!message) return Response.json({ error: "message is required" }, { status: 400 });
    await appendRuntimeConversationMessage(id, "human", message);
    addAudit("human_reply", `${agentName} replied in ${id}.`, "success", "humanReply");
    return Response.json({ ok: true });
  }

  return Response.json({ error: "unsupported action" }, { status: 400 });
}
