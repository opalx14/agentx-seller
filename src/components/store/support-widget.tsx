"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  ExternalLink,
  Loader2,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Smartphone,
  Truck,
  X,
} from "lucide-react";
import type { Order, Shipment } from "@/lib/domain";
import type { RuntimeConversation } from "@/lib/repository";
import type { ShipmentTracking } from "@/features/shipping/tracking";
import supportFlows from "@/data/demo/support-flows.json";

type ClientState = {
  customer: { id: string; name: string; phone: string };
  orders: Order[];
  shipments: Record<string, Shipment | undefined>;
  conversation?: RuntimeConversation;
};

type TelegramStatus = {
  connected: boolean;
  botUsername: string | null;
  telegramUrl: string | null;
  connectUrl: string | null;
  language: "vi" | "en" | "hi" | null;
};

type FlowKind = "refund" | "return";
type FlowStep = "receipt" | "reason" | "evidence" | "confirm";

type GuidedFlow = {
  kind: FlowKind;
  step: FlowStep;
  received?: boolean;
  reason?: string;
  evidence?: boolean;
  note: string;
};

const STORAGE_KEY = "agentx:store:customerId";

type ReasonOption = { value: string; label: string; evidence: boolean };
const refundReasons = supportFlows.refund.reasons as ReasonOption[];
const returnReasons = supportFlows.return.reasons as ReasonOption[];

function browserLocale(): "vi" | "en" | "hi" {
  if (typeof navigator === "undefined") return "en";
  const language = navigator.language.toLowerCase();
  if (language.startsWith("vi")) return "vi";
  if (language.startsWith("hi")) return "hi";
  return "en";
}

function friendlyStatus(status: string) {
  return status.replaceAll("_", " ").replace(/^./, (value) => value.toUpperCase());
}

function reasonLabel(kind: FlowKind, value?: string) {
  const source = kind === "refund" ? refundReasons : returnReasons;
  return source.find((reason) => reason.value === value)?.label ?? "Other issue";
}

function needsEvidence(kind: FlowKind, value?: string) {
  const source = kind === "refund" ? refundReasons : returnReasons;
  return Boolean(source.find((reason) => reason.value === value)?.evidence);
}

function TrackingMap({ tracking }: { tracking: ShipmentTracking }) {
  const points = tracking.stages.map((stage) => `${stage.point.x},${stage.point.y}`).join(" ");
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#eef2ed]">
      <svg viewBox="0 0 390 280" className="block h-auto w-full" role="img" aria-label={`Delivery route for ${tracking.orderId}`}>
        <rect width="390" height="280" fill="#eef2ed" />
        <path d="M-10 54 C70 34 110 74 184 52 S300 18 408 42" fill="none" stroke="#d8dfd8" strokeWidth="16" />
        <path d="M18 270 C86 220 102 186 166 176 S294 186 402 126" fill="none" stroke="#dde4dc" strokeWidth="12" />
        <path d="M44 18 L100 280 M184 0 L218 280 M300 0 L276 280" stroke="#e1e6e0" strokeWidth="4" />
        <polyline points={points} fill="none" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {tracking.stages.map((stage) => (
          <g key={stage.id}>
            <circle
              cx={stage.point.x}
              cy={stage.point.y}
              r={stage.state === "current" ? 10 : 6}
              fill={stage.state === "upcoming" ? "#cbd5e1" : stage.state === "current" ? "#0ea5e9" : "#0f172a"}
              stroke="#fff"
              strokeWidth="4"
            />
            {stage.state === "current" && <circle cx={stage.point.x} cy={stage.point.y} r="17" fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.5" />}
          </g>
        ))}
        <rect x="18" y="18" width="190" height="58" rx="16" fill="white" opacity="0.96" />
        <text x="32" y="42" fontSize="11" fill="#64748b">CURRENT LOCATION</text>
        <text x="32" y="62" fontSize="15" fontWeight="700" fill="#0f172a">{tracking.currentArea}</text>
      </svg>
    </div>
  );
}

export function StoreSupportWidget() {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [state, setState] = useState<ClientState | null>(null);
  const [telegram, setTelegram] = useState<TelegramStatus | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [view, setView] = useState<"chat" | "tracking" | "flow">("chat");
  const [tracking, setTracking] = useState<ShipmentTracking | null>(null);
  const [flow, setFlow] = useState<GuidedFlow | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const locale = useMemo(() => browserLocale(), []);

  const refreshState = useCallback(async (id: string) => {
    const response = await fetch(`/api/client/state?customerId=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) {
      setState(null);
      return;
    }
    const next = await response.json() as ClientState;
    setState(next);
    setSelectedOrderId((current) => current && next.orders.some((order) => order.id === current) ? current : next.orders[0]?.id ?? "");
  }, []);

  const refreshTelegram = useCallback(async (id: string) => {
    const response = await fetch(`/api/integrations/telegram/status?customerId=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) {
      setTelegram(null);
      return;
    }
    setTelegram(await response.json() as TelegramStatus);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const hydrateTimer = window.setTimeout(() => { if (stored) setCustomerId(stored); }, 0);
    const handleSession = (event: Event) => {
      const detail = (event as CustomEvent<{ customerId?: string }>).detail;
      if (detail?.customerId) setCustomerId(detail.customerId);
    };
    const handleOpen = () => setOpen(true);
    window.addEventListener("agentx:store-session", handleSession);
    window.addEventListener("agentx:open-support", handleOpen);
    return () => {
      window.clearTimeout(hydrateTimer);
      window.removeEventListener("agentx:store-session", handleSession);
      window.removeEventListener("agentx:open-support", handleOpen);
    };
  }, []);

  useEffect(() => {
    if (!customerId) return;
    const timer = window.setTimeout(() => {
      void refreshState(customerId);
      void refreshTelegram(customerId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [customerId, refreshState, refreshTelegram]);

  useEffect(() => {
    if (!customerId || !open) return;
    const timer = window.setInterval(() => void refreshState(customerId), 3000);
    const handleFocus = () => void refreshTelegram(customerId);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [customerId, open, refreshState, refreshTelegram]);

  const selectedOrder = state?.orders.find((order) => order.id === selectedOrderId) ?? state?.orders[0];
  const selectedShipment = selectedOrder ? state?.shipments[selectedOrder.id] : undefined;
  const conversationStatus = state?.conversation?.status ?? "ai_active";

  async function sendMessage(message: string) {
    if (!customerId || !message.trim() || sending) return;
    setSending(true);
    setStatusText(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), customerId, locale }),
      });
      const data = await response.json() as { reply?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Support request failed");
      setStatusText(data.reply ?? null);
      setInput("");
      await refreshState(customerId);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Support is temporarily unavailable.");
    } finally {
      setSending(false);
    }
  }

  async function submitChat(event: FormEvent) {
    event.preventDefault();
    await sendMessage(input);
  }

  async function openTracking() {
    if (!customerId || !selectedOrder) return;
    setView("tracking");
    setLoadingTracking(true);
    setTracking(null);
    try {
      const response = await fetch(`/api/commerce/orders/${encodeURIComponent(selectedOrder.id)}/tracking?customerId=${encodeURIComponent(customerId)}`, { cache: "no-store" });
      const data = await response.json() as { tracking?: ShipmentTracking };
      if (!response.ok || !data.tracking) throw new Error("Tracking details are unavailable.");
      setTracking(data.tracking);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Tracking details are unavailable.");
      setView("chat");
    } finally {
      setLoadingTracking(false);
    }
  }

  function beginFlow(kind: FlowKind) {
    if (!selectedOrder) return;
    setFlow({ kind, step: "receipt", note: "" });
    setView("flow");
    if (kind === "refund") window.dispatchEvent(new Event("agentx:tour:refund-started"));
  }

  function chooseReceipt(received: boolean) {
    setFlow((current) => {
      if (!current) return current;
      if (!received && current.kind === "return") {
        return { kind: "refund", step: "confirm", received: false, reason: "not_received", note: "" };
      }
      return { ...current, received, step: "reason", reason: received ? current.reason : "not_received" };
    });
  }

  function chooseReason(reason: string) {
    setFlow((current) => current ? { ...current, reason, step: needsEvidence(current.kind, reason) ? "evidence" : "confirm" } : current);
  }

  async function submitGuidedFlow() {
    if (!flow || !selectedOrder) return;
    const action = flow.kind === "refund" ? "refund" : "return";
    const evidence = flow.evidence === true
      ? "Customer confirms photo/video evidence is available."
      : flow.evidence === false
        ? "Customer does not currently have photo/video evidence."
        : "No evidence requirement selected.";
    const message = [
      `I want to ${action} order ${selectedOrder.id}.`,
      `Parcel received: ${flow.received ? "yes" : "no"}.`,
      `Reason: ${flow.reason ?? "customer_request"}.`,
      evidence,
      flow.note.trim() ? `Customer description: ${flow.note.trim()}` : "",
      `Please process this ${action} request under the seller policy.`,
    ].filter(Boolean).join(" ");
    await sendMessage(message);
    if (flow.kind === "refund") window.dispatchEvent(new Event("agentx:tour:refund-submitted"));
    setFlow(null);
    setView("chat");
  }

  const telegramHref = customerId
    ? telegram?.connected
      ? telegram.telegramUrl
      : telegram?.connectUrl
    : null;

  const messages = state?.conversation?.messages ?? [];

  return (
    <>
      {!open && (
        <button
          type="button"
          data-tour="agentx-launcher"
          onClick={() => { setOpen(true); window.dispatchEvent(new Event("agentx:tour:support-opened")); }}
          className="fixed bottom-5 right-4 z-40 inline-flex min-h-14 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
        >
          <MessageCircle className="size-5" /> Ask AgentX
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-40 sm:pointer-events-none sm:bg-transparent">
          <button type="button" aria-label="Close support" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/25 backdrop-blur-[1px] sm:hidden" />
          <section className="pointer-events-auto absolute inset-x-0 bottom-0 flex h-[88dvh] flex-col overflow-hidden rounded-t-[28px] border border-slate-200 bg-white shadow-2xl sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[640px] sm:w-[400px] sm:rounded-[26px]">
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-950 text-white"><Bot className="size-5" /></div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">AgentX</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className={`size-1.5 rounded-full ${conversationStatus === "human_active" ? "bg-indigo-500" : conversationStatus === "human_required" ? "bg-amber-500" : "bg-emerald-500"}`} />
                    {conversationStatus === "human_active" ? "Human agent is handling this" : conversationStatus === "human_required" ? "Waiting for seller review" : "Gemini + verified seller policy"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {telegramHref && (
                  <a
                    href={telegramHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-sky-600 hover:bg-sky-50"
                    title={telegram?.connected ? "Continue in Telegram" : "Connect Telegram"}
                  >
                    <Smartphone className="size-4" /> Telegram <ExternalLink className="size-3" />
                  </a>
                )}
                <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full hover:bg-slate-100" aria-label="Close support"><X className="size-5" /></button>
              </div>
            </header>

            {!customerId || !state ? (
              <div className="grid flex-1 place-items-center p-8 text-center">
                <div>
                  <div className="mx-auto grid size-14 place-items-center rounded-full bg-slate-100"><PackageCheck className="size-6 text-slate-500" /></div>
                  <h2 className="mt-4 text-lg font-semibold">AgentX starts after checkout</h2>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">Place a demo order first so AgentX can use a verified customer and order context.</p>
                  <button type="button" onClick={() => setOpen(false)} className="mt-5 min-h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">Continue shopping</button>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Current order</div>
                      <select
                        value={selectedOrder?.id ?? ""}
                        onChange={(event) => { setSelectedOrderId(event.target.value); setView("chat"); }}
                        className="mt-0.5 max-w-[220px] bg-transparent text-sm font-semibold outline-none"
                        aria-label="Select support order"
                      >
                        {state.orders.map((order) => <option key={order.id} value={order.id}>{order.id} · {friendlyStatus(order.status)}</option>)}
                      </select>
                    </div>
                    {selectedShipment && (
                      <div className="text-right text-[11px] text-slate-500">
                        <div className="font-semibold text-slate-700">{selectedShipment.carrier}</div>
                        <div>{selectedShipment.estimatedDelivery ? `ETA ${selectedShipment.estimatedDelivery}` : friendlyStatus(selectedShipment.status)}</div>
                      </div>
                    )}
                  </div>
                </div>

                {view === "tracking" ? (
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    <button type="button" onClick={() => setView("chat")} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft className="size-4" /> Back to chat</button>
                    {loadingTracking || !tracking ? (
                      <div className="grid min-h-72 place-items-center"><Loader2 className="size-5 animate-spin text-slate-400" /></div>
                    ) : (
                      <>
                        <div className="mt-2 flex items-start justify-between gap-4">
                          <div><div className="text-lg font-semibold">Delivery details</div><div className="mt-1 text-xs text-slate-400">{tracking.carrier} · {tracking.trackingNumber}</div></div>
                          <div className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">{tracking.progress}%</div>
                        </div>
                        <div className="mt-4 rounded-2xl bg-sky-50 p-4">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-sky-600">Current location</div>
                          <div className="mt-1 text-base font-semibold text-slate-950">{tracking.currentArea}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">{tracking.currentDetail}</div>
                        </div>
                        <details className="mt-4 rounded-2xl border border-slate-200 bg-white">
                          <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-slate-600">Route preview</summary>
                          <div className="border-t border-slate-100"><TrackingMap tracking={tracking} /></div>
                        </details>
                        <div className="mt-5 space-y-0">
                          {tracking.stages.map((stage, index) => (
                            <div key={stage.id} className="relative flex gap-3 pb-5 last:pb-0">
                              {index < tracking.stages.length - 1 && <div className="absolute left-[9px] top-5 h-full w-px bg-slate-200" />}
                              <div className={`relative z-10 mt-1 grid size-[19px] shrink-0 place-items-center rounded-full border-2 bg-white ${stage.state === "current" ? "border-sky-500" : stage.state === "completed" ? "border-slate-950" : "border-slate-200"}`}>
                                {stage.state === "completed" && <Check className="size-2.5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className={`text-sm font-semibold ${stage.state === "upcoming" ? "text-slate-400" : "text-slate-900"}`}>{stage.title}</div>
                                <div className="mt-0.5 text-xs text-slate-500">{stage.area}</div>
                                {stage.time && <div className="mt-1 text-[11px] text-slate-400">{stage.time}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : view === "flow" && flow ? (
                  <div data-tour={flow.kind === "refund" ? "agentx-refund-flow" : undefined} className="min-h-0 flex-1 overflow-y-auto p-4">
                    <button type="button" onClick={() => { setFlow(null); setView("chat"); }} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft className="size-4" /> Back to chat</button>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{flow.kind === "refund" ? "Refund request" : "Return request"}</div>
                    <h2 className="mt-1 text-xl font-semibold">{flow.step === "receipt" ? "Have you received the parcel?" : flow.step === "reason" ? "What went wrong?" : flow.step === "evidence" ? "Supporting evidence" : "Review your request"}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Order {selectedOrder?.id}. We’ll collect the minimum information first, then AgentX will apply the seller’s verified policy.</p>

                    {flow.step === "receipt" && (
                      <div className="mt-6 grid gap-3">
                        <button type="button" onClick={() => chooseReceipt(true)} className="flex min-h-14 items-center justify-between rounded-2xl border border-slate-200 px-4 text-left text-sm font-semibold hover:border-slate-400">Yes, I received it <ChevronRight className="size-4" /></button>
                        <button type="button" onClick={() => chooseReceipt(false)} className="flex min-h-14 items-center justify-between rounded-2xl border border-slate-200 px-4 text-left text-sm font-semibold hover:border-slate-400">No, I haven’t received it <ChevronRight className="size-4" /></button>
                      </div>
                    )}

                    {flow.step === "reason" && (
                      <div className="mt-6 grid gap-2">
                        {(flow.kind === "refund" ? refundReasons : returnReasons)
                          .filter((reason) => flow.received !== false || reason.value === "not_received")
                          .map((reason) => (
                            <button key={reason.value} type="button" onClick={() => chooseReason(reason.value)} className="flex min-h-12 items-center justify-between rounded-2xl border border-slate-200 px-4 text-left text-sm font-medium hover:border-slate-400">{reason.label}<ChevronRight className="size-4 text-slate-400" /></button>
                          ))}
                      </div>
                    )}

                    {flow.step === "evidence" && (
                      <div className="mt-6">
                        <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">Photos or video can support this type of claim. For the demo, choose whether evidence is available.</div>
                        <div className="mt-4 grid gap-2">
                          <button type="button" onClick={() => setFlow({ ...flow, evidence: true, step: "confirm" })} className="flex min-h-12 items-center justify-between rounded-2xl border border-slate-200 px-4 text-sm font-semibold">I have photo/video evidence <Check className="size-4 text-emerald-600" /></button>
                          <button type="button" onClick={() => setFlow({ ...flow, evidence: false, step: "confirm" })} className="flex min-h-12 items-center justify-between rounded-2xl border border-slate-200 px-4 text-sm font-semibold">I don’t have evidence yet <ChevronRight className="size-4" /></button>
                        </div>
                      </div>
                    )}

                    {flow.step === "confirm" && (
                      <div className="mt-6">
                        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4 text-sm">
                          <div className="flex justify-between gap-4 py-3"><span className="text-slate-500">Order</span><span className="font-semibold">{selectedOrder?.id}</span></div>
                          <div className="flex justify-between gap-4 py-3"><span className="text-slate-500">Parcel received</span><span className="font-semibold">{flow.received ? "Yes" : "No"}</span></div>
                          <div className="flex justify-between gap-4 py-3"><span className="text-slate-500">Reason</span><span className="max-w-[220px] text-right font-semibold">{reasonLabel(flow.kind, flow.reason)}</span></div>
                          {needsEvidence(flow.kind, flow.reason) && <div className="flex justify-between gap-4 py-3"><span className="text-slate-500">Evidence</span><span className="font-semibold">{flow.evidence ? "Ready" : "Not available"}</span></div>}
                        </div>
                        <label className="mt-4 block text-xs font-semibold text-slate-500">Add a short description (optional)
                          <textarea value={flow.note} onChange={(event) => setFlow({ ...flow, note: event.target.value })} rows={3} className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 p-3 text-sm font-normal text-slate-900 outline-none focus:border-slate-400" placeholder="Describe the issue briefly…" />
                        </label>
                        <button type="button" onClick={() => void submitGuidedFlow()} disabled={sending} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{sending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Submit {flow.kind} request</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-4 py-4">
                      {messages.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
                          <div className="font-semibold text-slate-900">Hi {state.customer.name.split(" ").at(-1)}, I’m AgentX.</div>
                          <div className="mt-1">Ask about delivery, start a return or request a refund. I use verified store tools, and sensitive actions stay behind seller guardrails.</div>
                        </div>
                      ) : messages.map((message, index) => (
                        <div key={`${message.createdAt}-${index}`} className={`mb-3 flex ${message.sender === "customer" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.sender === "customer" ? "rounded-br-md bg-slate-950 text-white" : message.sender === "human" ? "rounded-bl-md bg-indigo-50 text-indigo-950" : message.sender === "system" ? "border border-amber-100 bg-amber-50 text-amber-950" : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm"}`}>
                            {message.sender !== "customer" && <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{message.sender === "ai" ? "AgentX" : message.sender === "human" ? "Support agent" : "Update"}</div>}
                            {message.content}
                          </div>
                        </div>
                      ))}
                      {sending && <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="size-3.5 animate-spin" /> AgentX is checking verified store data…</div>}
                      {statusText && !sending && <div className="mt-2 text-xs text-slate-400">{statusText}</div>}
                    </div>

                    <div className="border-t border-slate-100 bg-white px-3.5 pb-3.5 pt-3">
                      <div className="mb-2.5 grid grid-cols-4 gap-1.5">
                        <button type="button" onClick={() => void openTracking()} className="grid min-h-14 place-items-center rounded-xl bg-slate-50 px-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"><Truck className="mb-1 size-4" /> Track</button>
                        <button type="button" onClick={() => beginFlow("return")} className="grid min-h-14 place-items-center rounded-xl bg-slate-50 px-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"><RotateCcw className="mb-1 size-4" /> Return</button>
                        <button type="button" data-tour="agentx-refund" onClick={() => beginFlow("refund")} className="grid min-h-14 place-items-center rounded-xl bg-slate-50 px-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"><RefreshCw className="mb-1 size-4" /> Refund</button>
                        <button type="button" onClick={() => void sendMessage("I want to talk to a human support agent.")} className="grid min-h-14 place-items-center rounded-xl bg-slate-50 px-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"><Clock3 className="mb-1 size-4" /> Human</button>
                      </div>
                      <form onSubmit={submitChat} className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-slate-300 focus-within:bg-white">
                        <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={1} className="max-h-24 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none" placeholder="Ask about your order…" aria-label="Support message" />
                        <button disabled={sending || !input.trim()} className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white disabled:opacity-40" aria-label="Send message"><Send className="size-4" /></button>
                      </form>
                      {telegram && <div className="mt-2 text-center text-[10px] text-slate-400">{telegram.connected ? "Telegram is connected to this customer" : "Continue on Telegram after one-time linking"}</div>}
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
