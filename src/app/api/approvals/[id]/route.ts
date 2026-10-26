import { resolveApproval } from "@/lib/commerce";
import { appendRuntimeConversationMessage, listRuntimeConversations, setRuntimeConversationStatus } from "@/lib/repository";

export async function POST(request: Request, context: RouteContext<"/api/approvals/[id]">) {
  const { id } = await context.params;
  const body = (await request.json()) as { action?: "approve" | "reject" };
  if (body.action !== "approve" && body.action !== "reject") {
    return Response.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const approval = await resolveApproval(id, body.action);
  if (!approval) return Response.json({ error: "approval not found or already resolved" }, { status: 404 });

  const conversation = (await listRuntimeConversations()).find((item) => item.order === approval.orderId && item.status !== "closed");
  if (conversation) {
    const customerMessage = body.action === "approve"
      ? `Refund ${approval.amount.toLocaleString("vi-VN")}₫ for ${approval.orderId} was approved and processed.`
      : `Refund request for ${approval.orderId} was reviewed and rejected by the shop.`;
    await appendRuntimeConversationMessage(conversation.id, "system", customerMessage);
    if (conversation.status === "human_required") await setRuntimeConversationStatus(conversation.id, "ai_active");
  }

  return Response.json({ approval, conversationId: conversation?.id });
}
