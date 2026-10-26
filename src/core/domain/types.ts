export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "refunded";
export type ConversationStatus = "ai_active" | "human_required" | "human_active" | "closed";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ConversationSender = "customer" | "ai" | "human" | "system";
export type SupportChannel = "web" | "whatsapp" | "telegram";

export type ConversationMessage = {
  id: string;
  sender: ConversationSender;
  content: string;
  createdAt: string;
  externalMessageId?: string;
};

export type SupportConversation = {
  id: string;
  customerId?: string;
  channel: SupportChannel;
  externalConversationId?: string;
  status: ConversationStatus;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
};

export type CustomerIdentity = {
  id: string;
  name: string;
  phone: string;
};

export type Order = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  totalAmount: number;
  currency: "VND";
  createdAt: string;
  deliveredAt?: string;
};

export type Shipment = {
  orderId: string;
  carrier: string;
  trackingNumber: string;
  status: "label_created" | "in_transit" | "delivered";
  estimatedDelivery?: string;
};

export type ReturnRequest = {
  id: string;
  orderId: string;
  reason: string;
  status: "created" | "approved" | "rejected";
  createdAt: string;
};

export type Refund = {
  id: string;
  orderId: string;
  amount: number;
  reason: string;
  status: "requested" | "approved" | "rejected" | "processed";
  idempotencyKey: string;
  createdAt: string;
};

export type Approval = {
  id: string;
  orderId: string;
  customerName: string;
  amount: number;
  reason: string;
  status: ApprovalStatus;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  time: string;
  action: string;
  toolName?: string;
  status: "success" | "warning" | "error";
  detail: string;
};

export type AgentTrace = {
  label: string;
  state: "success" | "warning" | "error";
};

export type AgentResult = {
  reply: string;
  trace: AgentTrace[];
};

export type AgentContext = {
  customerId?: string;
  customerPhone?: string;
  channel?: SupportChannel;
  externalConversationId?: string;
  externalMessageId?: string;
  locale?: "vi" | "en" | "hi";
};
