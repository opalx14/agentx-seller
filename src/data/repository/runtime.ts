import type { Approval, AuditEvent, ConversationStatus, CustomerIdentity, Order, Shipment, SupportChannel } from "@/lib/domain";
import { appendLocalConversationMessage, demoStore, findCustomerByPhone } from "@/lib/mock-store";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type RuntimePolicy = {
  autoRefundLimit: number;
  returnWindowDays: number;
};

export type RuntimeConversation = {
  id: string;
  customerId?: string;
  customer: string;
  order?: string;
  channel: SupportChannel;
  status: ConversationStatus;
  assignedTo?: string;
  updatedAt: string;
  preview: string;
  messages: Array<{ sender: "customer" | "ai" | "human" | "system"; content: string; createdAt: string }>;
};

const DEFAULT_POLICY: RuntimePolicy = {
  autoRefundLimit: 500000,
  returnWindowDays: 7,
};

type OrderRow = {
  id: string;
  customer_id: string;
  order_number: string;
  status: Order["status"];
  total_amount: number | string;
  currency: string;
  created_at: string;
  delivered_at: string | null;
};

type CustomerRow = {
  id: string;
  external_customer_id: string;
  name: string;
  phone: string | null;
};

async function loadCustomerRow(id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("agentx_customers")
    .select("id, external_customer_id, name, phone")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as CustomerRow | null;
}

function mapOrder(row: OrderRow, customer: CustomerRow): Order {
  return {
    id: row.order_number,
    customerId: customer.external_customer_id,
    customerName: customer.name,
    customerPhone: customer.phone ?? "",
    status: row.status,
    totalAmount: Number(row.total_amount),
    currency: row.currency === "VND" ? "VND" : "VND",
    createdAt: row.created_at,
    deliveredAt: row.delivered_at ?? undefined,
  };
}

export async function getRuntimeOrder(orderId: string): Promise<Order | undefined> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return demoStore.orders.find((item) => item.id.toUpperCase() === orderId.toUpperCase());
  }

  const { data, error } = await supabase
    .from("agentx_orders")
    .select("id, customer_id, order_number, status, total_amount, currency, created_at, delivered_at")
    .eq("order_number", orderId.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;

  const customer = await loadCustomerRow((data as OrderRow).customer_id);
  if (!customer) return undefined;
  return mapOrder(data as OrderRow, customer);
}

export async function listRuntimeOrders(): Promise<Order[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [...demoStore.orders];

  const { data, error } = await supabase
    .from("agentx_orders")
    .select("id, customer_id, order_number, status, total_amount, currency, created_at, delivered_at")
    .order("order_number", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as OrderRow[];
  return Promise.all(
    rows.map(async (row) => {
      const customer = await loadCustomerRow(row.customer_id);
      if (!customer) throw new Error(`Customer row missing for order ${row.order_number}`);
      return mapOrder(row, customer);
    }),
  );
}

export async function getRuntimeShipment(orderId: string): Promise<Shipment | undefined> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return demoStore.shipments.find((item) => item.orderId.toUpperCase() === orderId.toUpperCase());
  }

  const { data: order, error: orderError } = await supabase
    .from("agentx_orders")
    .select("id, order_number")
    .eq("order_number", orderId.toUpperCase())
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) return undefined;

  const { data, error } = await supabase
    .from("agentx_shipments")
    .select("carrier, tracking_number, status, estimated_delivery")
    .eq("order_id", order.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;

  return {
    orderId: order.order_number,
    carrier: data.carrier,
    trackingNumber: data.tracking_number,
    status: data.status as Shipment["status"],
    estimatedDelivery: data.estimated_delivery ?? undefined,
  };
}

export async function getRuntimePolicy(): Promise<RuntimePolicy> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ...demoStore.policy };
  const { data, error } = await supabase
    .from("agentx_policies")
    .select("auto_refund_limit, return_window_days")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_POLICY;
  return {
    autoRefundLimit: Number(data.auto_refund_limit),
    returnWindowDays: Number(data.return_window_days),
  };
}

export async function updateRuntimePolicy(policy: RuntimePolicy): Promise<RuntimePolicy> {
  if (!Number.isFinite(policy.autoRefundLimit) || policy.autoRefundLimit < 0) throw new Error("INVALID_AUTO_REFUND_LIMIT");
  if (!Number.isInteger(policy.returnWindowDays) || policy.returnWindowDays <= 0) throw new Error("INVALID_RETURN_WINDOW");
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    demoStore.policy.autoRefundLimit = policy.autoRefundLimit;
    demoStore.policy.returnWindowDays = policy.returnWindowDays;
    return { ...demoStore.policy };
  }
  const { data: shop, error: shopError } = await supabase
    .from("agentx_shops")
    .select("id")
    .eq("name", "AgentX Demo Store")
    .maybeSingle();
  if (shopError) throw shopError;
  if (!shop) throw new Error("SHOP_NOT_FOUND");
  const { data, error } = await supabase
    .from("agentx_policies")
    .upsert({
      shop_id: shop.id,
      auto_refund_limit: policy.autoRefundLimit,
      return_window_days: policy.returnWindowDays,
      updated_at: new Date().toISOString(),
    }, { onConflict: "shop_id" })
    .select("auto_refund_limit, return_window_days")
    .single();
  if (error) throw error;
  return { autoRefundLimit: Number(data.auto_refund_limit), returnWindowDays: Number(data.return_window_days) };
}

async function lookupOrderPk(orderNumber: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("agentx_orders")
    .select("id")
    .eq("order_number", orderNumber.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function hasRuntimeReturn(orderId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return demoStore.returns.some((request) => request.orderId === orderId);
  const orderPk = await lookupOrderPk(orderId);
  if (!orderPk) return false;
  const { data, error } = await supabase
    .from("agentx_returns")
    .select("id")
    .eq("order_id", orderPk)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

export async function hasProcessedRuntimeRefund(orderId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return demoStore.refunds.some((refund) => refund.orderId === orderId && refund.status === "processed");
  }
  const orderPk = await lookupOrderPk(orderId);
  if (!orderPk) return false;
  const { data, error } = await supabase
    .from("agentx_refunds")
    .select("id")
    .eq("order_id", orderPk)
    .eq("status", "processed")
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

export async function listRuntimeApprovals(): Promise<Approval[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [...demoStore.approvals];

  const { data, error } = await supabase
    .from("agentx_approvals")
    .select("id, order_id, amount, reason, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return Promise.all(
    (data ?? []).map(async (row) => {
      const { data: order, error: orderError } = await supabase
        .from("agentx_orders")
        .select("order_number, customer_id")
        .eq("id", row.order_id)
        .single();
      if (orderError) throw orderError;
      const customer = await loadCustomerRow(order.customer_id);
      return {
        id: row.id,
        orderId: order.order_number,
        customerName: customer?.name ?? "Unknown customer",
        amount: Number(row.amount),
        reason: row.reason,
        status: row.status as Approval["status"],
        createdAt: row.created_at,
      };
    }),
  );
}

export async function getRuntimeApproval(id: string): Promise<Approval | undefined> {
  const approvals = await listRuntimeApprovals();
  return approvals.find((approval) => approval.id === id);
}

export async function listRuntimeAudit(): Promise<AuditEvent[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [...demoStore.audit];
  const { data, error } = await supabase
    .from("agentx_audit_logs")
    .select("id, action, tool_name, output, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    time: row.created_at,
    action: row.action,
    toolName: row.tool_name ?? undefined,
    status: row.status as AuditEvent["status"],
    detail: typeof row.output === "object" && row.output && "detail" in row.output
      ? String((row.output as { detail?: unknown }).detail ?? "")
      : "",
  }));
}

export async function listRuntimeConversations(): Promise<RuntimeConversation[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return demoStore.conversations
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((conversation) => {
        const customer = demoStore.customers.find((item) => item.id === conversation.customerId);
        const order = demoStore.orders.find((item) => item.customerId === conversation.customerId);
        const preview = [...conversation.messages].reverse().find((message) => message.sender === "customer")?.content
          ?? conversation.messages.at(-1)?.content
          ?? "No messages yet";
        return {
          id: conversation.id,
          customerId: conversation.customerId,
          customer: customer?.name ?? "Unknown customer",
          order: order?.id,
          channel: conversation.channel,
          status: conversation.status,
          assignedTo: conversation.assignedTo,
          updatedAt: conversation.updatedAt,
          preview,
          messages: conversation.messages.map((message) => ({ sender: message.sender, content: message.content, createdAt: message.createdAt })),
        };
      });
  }

  const { data, error } = await supabase
    .from("agentx_conversations")
    .select("id, customer_id, channel, status, assigned_to, updated_at, created_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return Promise.all((data ?? []).map(async (row) => {
    const customer = row.customer_id ? await loadCustomerRow(row.customer_id) : null;
    const { data: order, error: orderError } = row.customer_id
      ? await supabase
          .from("agentx_orders")
          .select("order_number")
          .eq("customer_id", row.customer_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null, error: null };
    if (orderError) throw orderError;

    const { data: messages, error: messageError } = await supabase
      .from("agentx_messages")
      .select("sender, content, created_at")
      .eq("conversation_id", row.id)
      .order("created_at", { ascending: true })
      .limit(100);
    if (messageError) throw messageError;

    const mappedMessages = (messages ?? []).map((message) => ({
      sender: message.sender as RuntimeConversation["messages"][number]["sender"],
      content: message.content,
      createdAt: message.created_at,
    }));
    const preview = [...mappedMessages].reverse().find((message) => message.sender === "customer")?.content
      ?? mappedMessages.at(-1)?.content
      ?? "No messages yet";

    return {
      id: row.id,
      customerId: customer?.external_customer_id,
      customer: customer?.name ?? "Unknown customer",
      order: order?.order_number ?? undefined,
      channel: row.channel as RuntimeConversation["channel"],
      status: row.status as RuntimeConversation["status"],
      assignedTo: row.assigned_to ?? undefined,
      updatedAt: row.updated_at ?? row.created_at,
      preview,
      messages: mappedMessages,
    };
  }));
}

export async function getRuntimeConversation(id: string) {
  const conversations = await listRuntimeConversations();
  return conversations.find((conversation) => conversation.id === id);
}

export async function getRuntimeConversationForCustomer(customerId: string) {
  const conversations = await listRuntimeConversations();
  return conversations.find((conversation) => conversation.customerId === customerId && conversation.status !== "closed")
    ?? conversations.find((conversation) => conversation.customerId === customerId);
}

export async function setRuntimeConversationStatus(id: string, status: ConversationStatus, assignedTo?: string) {
  const supabase = getSupabaseAdmin();
  const updatedAt = new Date().toISOString();
  if (!supabase) {
    const conversation = demoStore.conversations.find((item) => item.id === id);
    if (!conversation) return null;
    conversation.status = status;
    conversation.assignedTo = assignedTo;
    conversation.updatedAt = updatedAt;
    return conversation;
  }
  const { data, error } = await supabase
    .from("agentx_conversations")
    .update({ status, assigned_to: assignedTo ?? null, updated_at: updatedAt })
    .eq("id", id)
    .select("id, status, assigned_to, updated_at")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function appendRuntimeConversationMessage(
  id: string,
  sender: RuntimeConversation["messages"][number]["sender"],
  content: string,
) {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("MESSAGE_REQUIRED");
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const conversation = demoStore.conversations.find((item) => item.id === id);
    if (!conversation) return null;
    return appendLocalConversationMessage(conversation, sender, trimmed);
  }
  const { data, error } = await supabase
    .from("agentx_messages")
    .insert({ conversation_id: id, sender, content: trimmed })
    .select("id, sender, content, created_at")
    .single();
  if (error) throw error;
  const { error: touchError } = await supabase
    .from("agentx_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);
  if (touchError) throw touchError;
  return data;
}

export async function hasRuntimeExternalMessage(externalMessageId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("agentx_messages")
    .select("id")
    .eq("external_message_id", externalMessageId)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

export async function findRuntimeCustomerByPhone(phone: string): Promise<CustomerIdentity | undefined> {
  const normalized = phone.replace(/\s+/g, "");
  const supabase = getSupabaseAdmin();
  if (!supabase) return findCustomerByPhone(normalized);
  const { data, error } = await supabase
    .from("agentx_customers")
    .select("external_customer_id, name, phone")
    .eq("phone", normalized)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  return {
    id: data.external_customer_id,
    name: data.name,
    phone: data.phone ?? normalized,
  };
}

export type RuntimeDemoPurchase = {
  customer: CustomerIdentity;
  order: Order;
  shipment: Shipment;
};

function nextDemoOrderNumber(orderNumbers: string[]) {
  const highest = orderNumbers.reduce((max, orderNumber) => {
    const match = orderNumber.match(/^A(\d{4})$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 1000);
  const next = highest + 1;
  if (next > 9999) throw new Error("DEMO_ORDER_NUMBER_EXHAUSTED");
  return `A${next}`;
}

function demoEstimatedDelivery() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 2);
  return date.toISOString().slice(0, 10);
}

export async function createRuntimeDemoPurchase(input: {
  customerName: string;
  phone: string;
  totalAmount: number;
}): Promise<RuntimeDemoPurchase> {
  const customerName = input.customerName.trim();
  const phone = input.phone.replace(/[\s()-]/g, "");
  if (!customerName) throw new Error("CUSTOMER_NAME_REQUIRED");
  if (!/^\+\d{8,15}$/.test(phone)) throw new Error("INVALID_PHONE");
  if (!Number.isInteger(input.totalAmount) || input.totalAmount <= 0) throw new Error("INVALID_TOTAL_AMOUNT");

  const createdAt = new Date().toISOString();
  const estimatedDelivery = demoEstimatedDelivery();
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    let customer = demoStore.customers.find((item) => item.phone === phone);
    if (!customer) {
      customer = {
        id: `cus_demo_${crypto.randomUUID().slice(0, 8)}`,
        name: customerName,
        phone,
      };
      demoStore.customers.push(customer);
    }

    const orderNumber = nextDemoOrderNumber(demoStore.orders.map((order) => order.id));
    const order: Order = {
      id: orderNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      status: "shipped",
      totalAmount: input.totalAmount,
      currency: "VND",
      createdAt,
    };
    const shipment: Shipment = {
      orderId: orderNumber,
      carrier: "GHN",
      trackingNumber: `GHN-${orderNumber}`,
      status: "in_transit",
      estimatedDelivery,
    };
    demoStore.orders.push(order);
    demoStore.shipments.push(shipment);
    return { customer: { ...customer }, order: { ...order }, shipment: { ...shipment } };
  }

  const { data: shop, error: shopError } = await supabase
    .from("agentx_shops")
    .select("id")
    .eq("name", "AgentX Demo Store")
    .maybeSingle();
  if (shopError) throw shopError;
  if (!shop) throw new Error("SHOP_NOT_FOUND");

  const { data: existingCustomer, error: customerLookupError } = await supabase
    .from("agentx_customers")
    .select("id, external_customer_id, name, phone")
    .eq("shop_id", shop.id)
    .eq("phone", phone)
    .maybeSingle();
  if (customerLookupError) throw customerLookupError;

  let customerRow = existingCustomer as CustomerRow | null;
  if (!customerRow) {
    const externalCustomerId = `cus_demo_${crypto.randomUUID().slice(0, 8)}`;
    const { data, error } = await supabase
      .from("agentx_customers")
      .insert({
        shop_id: shop.id,
        external_customer_id: externalCustomerId,
        name: customerName,
        phone,
      })
      .select("id, external_customer_id, name, phone")
      .single();
    if (error) throw error;
    customerRow = data as CustomerRow;
  }

  const { data: existingOrders, error: orderListError } = await supabase
    .from("agentx_orders")
    .select("order_number")
    .eq("shop_id", shop.id);
  if (orderListError) throw orderListError;
  const orderNumber = nextDemoOrderNumber((existingOrders ?? []).map((row) => String(row.order_number)));

  const { data: insertedOrder, error: orderError } = await supabase
    .from("agentx_orders")
    .insert({
      shop_id: shop.id,
      customer_id: customerRow.id,
      order_number: orderNumber,
      status: "shipped",
      total_amount: input.totalAmount,
      currency: "VND",
      created_at: createdAt,
    })
    .select("id, order_number, status, total_amount, currency, created_at, delivered_at")
    .single();
  if (orderError) throw orderError;

  const trackingNumber = `GHN-${orderNumber}`;
  const { error: shipmentError } = await supabase.from("agentx_shipments").insert({
    order_id: insertedOrder.id,
    carrier: "GHN",
    tracking_number: trackingNumber,
    status: "in_transit",
    estimated_delivery: estimatedDelivery,
  });
  if (shipmentError) throw shipmentError;

  const customer: CustomerIdentity = {
    id: customerRow.external_customer_id,
    name: customerRow.name,
    phone: customerRow.phone ?? phone,
  };
  const order: Order = {
    id: insertedOrder.order_number,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    status: insertedOrder.status as Order["status"],
    totalAmount: Number(insertedOrder.total_amount),
    currency: "VND",
    createdAt: insertedOrder.created_at,
    deliveredAt: insertedOrder.delivered_at ?? undefined,
  };
  const shipment: Shipment = {
    orderId: order.id,
    carrier: "GHN",
    trackingNumber,
    status: "in_transit",
    estimatedDelivery,
  };
  return { customer, order, shipment };
}
