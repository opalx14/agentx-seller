import mockStoreSeed from "@/data/mock/store.json";
import type {
  Approval,
  AuditEvent,
  CustomerIdentity,
  Order,
  Refund,
  ReturnRequest,
  Shipment,
  SupportChannel,
  SupportConversation,
} from "@/lib/domain";

type MockStoreSeed = {
  customers: CustomerIdentity[];
  orders: Order[];
  shipments: Shipment[];
  returns: ReturnRequest[];
  refunds: Refund[];
  approvals: Approval[];
  audit: AuditEvent[];
  conversations: SupportConversation[];
  policy: { autoRefundLimit: number; returnWindowDays: number };
};

const seed = mockStoreSeed as unknown as MockStoreSeed;

const runtime = globalThis as typeof globalThis & {
  __agentxCustomers?: CustomerIdentity[];
  __agentxOrders?: Order[];
  __agentxShipments?: Shipment[];
  __agentxReturns?: ReturnRequest[];
  __agentxRefunds?: Refund[];
  __agentxApprovals?: Approval[];
  __agentxAudit?: AuditEvent[];
  __agentxConversations?: SupportConversation[];
  __agentxPolicy?: { autoRefundLimit: number; returnWindowDays: number };
};

runtime.__agentxCustomers ??= structuredClone(seed.customers);
runtime.__agentxOrders ??= structuredClone(seed.orders);
runtime.__agentxShipments ??= structuredClone(seed.shipments);
runtime.__agentxReturns ??= structuredClone(seed.returns);
runtime.__agentxRefunds ??= structuredClone(seed.refunds);
runtime.__agentxApprovals ??= structuredClone(seed.approvals);
runtime.__agentxAudit ??= structuredClone(seed.audit);
runtime.__agentxConversations ??= structuredClone(seed.conversations);
runtime.__agentxPolicy ??= structuredClone(seed.policy);

export const customers = runtime.__agentxCustomers;

export const demoStore = {
  customers: runtime.__agentxCustomers,
  orders: runtime.__agentxOrders,
  shipments: runtime.__agentxShipments,
  returns: runtime.__agentxReturns,
  refunds: runtime.__agentxRefunds,
  approvals: runtime.__agentxApprovals,
  audit: runtime.__agentxAudit,
  conversations: runtime.__agentxConversations,
  policy: runtime.__agentxPolicy,
};

export function findCustomerByPhone(phone: string) {
  const normalized = phone.replace(/\s+/g, "");
  return customers.find((customer) => customer.phone === normalized);
}

export function getOrCreateLocalConversation(customerId?: string, channel: SupportChannel = "web", externalConversationId?: string) {
  const externalId = externalConversationId ?? `${channel}:${customerId ?? "anonymous"}`;
  const existing = demoStore.conversations.find((conversation) => conversation.externalConversationId === externalId);
  if (existing) return existing;
  const timestamp = new Date().toISOString();
  const conversation: SupportConversation = {
    id: `CONV-${String(demoStore.conversations.length + 1001)}`,
    customerId,
    channel,
    externalConversationId: externalId,
    status: "ai_active",
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
  };
  demoStore.conversations.unshift(conversation);
  return conversation;
}

export function appendLocalConversationMessage(
  conversation: SupportConversation,
  sender: SupportConversation["messages"][number]["sender"],
  content: string,
  externalMessageId?: string,
) {
  if (externalMessageId && conversation.messages.some((message) => message.externalMessageId === externalMessageId)) return null;
  const message = {
    id: crypto.randomUUID(),
    sender,
    content,
    createdAt: new Date().toISOString(),
    externalMessageId,
  };
  conversation.messages.push(message);
  conversation.updatedAt = message.createdAt;
  return message;
}

export function addAudit(action: string, detail: string, status: AuditEvent["status"] = "success", toolName?: string) {
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    time: new Date().toISOString(),
    action,
    detail,
    status,
    toolName,
  };
  demoStore.audit.unshift(event);
  void import("@/lib/persistence")
    .then(({ persistAuditEvent }) => persistAuditEvent(event))
    .catch(() => undefined);
  return event;
}
