import type { AgentContext, Approval, AuditEvent, Refund, ReturnRequest } from "@/lib/domain";
import { appendLocalConversationMessage, getOrCreateLocalConversation } from "@/lib/mock-store";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function lookupOrderPk(orderNumber: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("agentx_orders")
    .select("id, shop_id")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; shop_id: string } | null;
}

async function lookupDemoShopId() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("agentx_shops")
    .select("id")
    .eq("name", "AgentX Demo Store")
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function lookupCustomerPk(externalCustomerId?: string) {
  if (!externalCustomerId) return null;
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("agentx_customers")
    .select("id")
    .eq("external_customer_id", externalCustomerId)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function persistAuditEvent(event: AuditEvent) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const shopId = await lookupDemoShopId();
  const { error } = await supabase.from("agentx_audit_logs").insert({
    shop_id: shopId,
    actor: event.action === "message_received" ? "customer" : "system",
    action: event.action,
    tool_name: event.toolName ?? null,
    output: { detail: event.detail },
    status: event.status,
    created_at: event.time,
  });
  if (error) throw error;
}

export async function persistReturn(request: ReturnRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const order = await lookupOrderPk(request.orderId);
  if (!order) return;
  const { error } = await supabase.from("agentx_returns").upsert({
    id: request.id,
    order_id: order.id,
    reason: request.reason,
    status: request.status,
    created_at: request.createdAt,
  });
  if (error) throw error;
}

export async function persistRefund(refund: Refund) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const order = await lookupOrderPk(refund.orderId);
  if (!order) return;
  const { error } = await supabase.from("agentx_refunds").upsert({
    id: refund.id,
    order_id: order.id,
    amount: refund.amount,
    reason: refund.reason,
    status: refund.status,
    idempotency_key: refund.idempotencyKey,
    created_at: refund.createdAt,
  });
  if (error) throw error;
}

export async function persistApproval(approval: Approval) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const order = await lookupOrderPk(approval.orderId);
  if (!order) return;
  const { error } = await supabase.from("agentx_approvals").upsert({
    id: approval.id,
    shop_id: order.shop_id,
    order_id: order.id,
    type: "refund",
    amount: approval.amount,
    reason: approval.reason,
    status: approval.status,
    created_at: approval.createdAt,
    resolved_at: approval.status === "pending" ? null : new Date().toISOString(),
  });
  if (error) throw error;
}

export async function persistConversationExchange(
  context: AgentContext,
  customerMessage: string,
  aiReply: string,
  options: { humanRequired?: boolean } = {},
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const conversation = getOrCreateLocalConversation(context.customerId, context.channel ?? "web", context.externalConversationId);
    if (options.humanRequired) conversation.status = "human_required";
    appendLocalConversationMessage(conversation, "customer", customerMessage, context.externalMessageId);
    appendLocalConversationMessage(conversation, "ai", aiReply);
    conversation.updatedAt = new Date().toISOString();
    return;
  }

  const shopId = await lookupDemoShopId();
  if (!shopId) return;
  const customerPk = await lookupCustomerPk(context.customerId);
  const channel = context.channel ?? "web";
  const externalConversationId = context.externalConversationId
    ?? `${channel}:${context.customerId ?? context.customerPhone ?? "anonymous"}`;

  const { data: existingConversation, error: existingError } = await supabase
    .from("agentx_conversations")
    .select("id, status")
    .eq("shop_id", shopId)
    .eq("channel", channel)
    .eq("external_conversation_id", externalConversationId)
    .maybeSingle();
  if (existingError) throw existingError;

  let conversationId = existingConversation?.id as string | undefined;
  const targetStatus = options.humanRequired ? "human_required" : (existingConversation?.status ?? "ai_active");

  if (!conversationId) {
    const { data, error } = await supabase
      .from("agentx_conversations")
      .insert({
        shop_id: shopId,
        customer_id: customerPk,
        channel,
        external_conversation_id: externalConversationId,
        status: targetStatus,
      })
      .select("id")
      .single();
    if (error) throw error;
    conversationId = data.id;
  } else if (existingConversation?.status !== targetStatus) {
    const { error } = await supabase
      .from("agentx_conversations")
      .update({ status: targetStatus, updated_at: new Date().toISOString() })
      .eq("id", conversationId);
    if (error) throw error;
  }

  if (!conversationId) return;

  let duplicateInbound = false;
  if (context.externalMessageId) {
    const { data, error } = await supabase
      .from("agentx_messages")
      .select("id")
      .eq("external_message_id", context.externalMessageId)
      .limit(1);
    if (error) throw error;
    duplicateInbound = Boolean(data?.length);
  }

  if (!duplicateInbound) {
    const { error: customerError } = await supabase.from("agentx_messages").insert({
      conversation_id: conversationId,
      sender: "customer",
      content: customerMessage,
      external_message_id: context.externalMessageId ?? null,
    });
    if (customerError) throw customerError;
  }

  const { error: aiError } = await supabase.from("agentx_messages").insert({
    conversation_id: conversationId,
    sender: "ai",
    content: aiReply,
  });
  if (aiError) throw aiError;

  const { error: touchError } = await supabase
    .from("agentx_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (touchError) throw touchError;
}
