"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, Link2, Loader2, MessageCircle, PackageCheck, Send, Truck } from "lucide-react";
import type { Order, Shipment } from "@/lib/domain";
import type { RuntimeConversation } from "@/lib/repository";

type ClientState = {
  customer: { id: string; name: string; phone: string };
  orders: Order[];
  shipments: Record<string, Shipment | undefined>;
  conversation?: RuntimeConversation;
};

type TestCustomer = { id: string; label: string; order: string };

type QuickAction = {
  label: string;
  message: string;
};

export function ClientPortal({
  initial,
  telegramAccountName,
  testCustomers,
  showDemoIdentity,
}: {
  initial: ClientState;
  telegramAccountName: string;
  testCustomers: TestCustomer[];
  showDemoIdentity: boolean;
}) {
  const [customerId, setCustomerId] = useState(initial.customer.id);
  const [state, setState] = useState(initial);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function refresh(nextCustomerId = customerId) {
    const response = await fetch(`/api/client/state?customerId=${encodeURIComponent(nextCustomerId)}`, { cache: "no-store" });
    if (!response.ok) return;
    setState((await response.json()) as ClientState);
  }

  async function changeCustomer(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    setErrorText(null);
    setInput("");
    await refresh(nextCustomerId);
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetch(`/api/client/state?customerId=${encodeURIComponent(customerId)}`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((data: ClientState | null) => { if (data) setState(data); });
    }, 2500);
    return () => window.clearInterval(timer);
  }, [customerId]);

  const primaryOrder = state.orders[0];
  const shipment = primaryOrder ? state.shipments[primaryOrder.id] : undefined;
  const conversationStatus = state.conversation?.status ?? "ai_active";
  const humanActive = conversationStatus === "human_active";
  const humanRequired = conversationStatus === "human_required";

  const supportStatus = useMemo(() => {
    if (humanActive) return { label: "Support specialist online", tone: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" };
    if (humanRequired) return { label: "Specialist requested", tone: "bg-amber-50 text-amber-700", dot: "bg-amber-500" };
    if (conversationStatus === "closed") return { label: "Conversation resolved", tone: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
    return { label: "Instant support", tone: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
  }, [conversationStatus, humanActive, humanRequired]);

  const quickActions = useMemo<QuickAction[]>(() => {
    if (!primaryOrder) return [{ label: "Talk to support", message: "I want to talk to a human agent." }];
    return [
      { label: "Track order", message: `Where is my order ${primaryOrder.id}?` },
      { label: "Return item", message: `I want to return order ${primaryOrder.id}.` },
      { label: "Request refund", message: `I want a refund for order ${primaryOrder.id}.` },
      { label: "Talk to support", message: "I want to talk to a human agent." },
    ];
  }, [primaryOrder]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const message = input.trim();
    if (!message || loading) return;
    setLoading(true);
    setErrorText(null);
    setInput("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, customerId }),
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok) {
        setErrorText(data.error ?? "Support is temporarily unavailable. Please try again.");
        return;
      }
      await refresh();
    } catch {
      setErrorText("Support is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Help & orders</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">Hi {state.customer.name.split(" ").at(-1)}, what can we help with?</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Track a delivery, start a return, request a refund, or ask for a support specialist.</p>
        </div>

        {showDemoIdentity && testCustomers.length > 1 && (
          <label className="w-full max-w-xs text-xs font-medium text-slate-500 sm:w-auto">
            <span className="mb-1.5 block">Demo customer</span>
            <select
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400"
              value={customerId}
              onChange={(event) => void changeCustomer(event.target.value)}
              aria-label="Demo customer identity"
            >
              {testCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.label} · {customer.order}</option>)}
            </select>
          </label>
        )}
      </div>

      {primaryOrder && (
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm shadow-sm sm:px-5">
          <div className="flex items-center gap-2 font-semibold text-slate-950"><PackageCheck className="size-4 text-slate-400" /> Order {primaryOrder.id}</div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="capitalize text-slate-500">{primaryOrder.status}</div>
          <div className="font-semibold text-slate-950">{primaryOrder.totalAmount.toLocaleString("vi-VN")}₫</div>
          {shipment && (
            <>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-2 text-slate-500"><Truck className="size-4" /> {shipment.carrier}</div>
              {shipment.estimatedDelivery && <div className="text-slate-500">ETA {shipment.estimatedDelivery}</div>}
            </>
          )}
        </div>
      )}

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-slate-950 text-white"><MessageCircle className="size-4" /></div>
              <div>
                <div className="text-sm font-semibold text-slate-950">AgentX assistant</div>
                <div className="mt-0.5 text-xs text-slate-400">Orders, returns and refunds</div>
              </div>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold ${supportStatus.tone}`}>
              <span className={`size-2 rounded-full ${supportStatus.dot}`} />
              {supportStatus.label}
            </div>
          </div>

          <div className="min-h-[360px] space-y-4 bg-[#fbfbfa] p-4 sm:min-h-[430px] sm:p-6">
            {(state.conversation?.messages ?? []).length === 0 && (
              <div className="mx-auto mt-8 max-w-md text-center sm:mt-14">
                <div className="mx-auto grid size-12 place-items-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200"><MessageCircle className="size-5" /></div>
                <div className="mt-4 text-sm font-semibold text-slate-950">How can we help?</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">Choose a quick action below or type your question. We’ll use your verified order details to help.</p>
              </div>
            )}

            {(state.conversation?.messages ?? []).map((message, index) => (
              <div key={`${message.createdAt}-${index}`} className={`flex ${message.sender === "customer" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[92%] break-words rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[78%] ${message.sender === "customer" ? "rounded-br-md bg-slate-950 text-white" : message.sender === "human" ? "rounded-bl-md border border-indigo-100 bg-indigo-50 text-indigo-950" : message.sender === "system" ? "border border-amber-100 bg-amber-50 text-amber-950" : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm"}`}>
                  {message.sender !== "customer" && <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-55">{message.sender === "ai" ? "AgentX" : message.sender === "human" ? "Support" : "Update"}</div>}
                  {message.content}
                </div>
              </div>
            ))}

            {loading && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="size-4 animate-spin" /> {humanActive ? "Sending to support…" : "Checking your order…"}</div>}
            {errorText && <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{errorText}</div>}
          </div>

          <div className="border-t border-slate-100 bg-white p-4 sm:p-5">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => setInput(action.message)}
                  className="min-h-10 shrink-0 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                >
                  {action.label}
                </button>
              ))}
            </div>
            <form onSubmit={submit} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-slate-300 focus-within:bg-white">
              <input value={input} onChange={(event) => setInput(event.target.value)} className="min-h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" placeholder={humanActive ? "Message your support specialist…" : "Ask about your order…"} aria-label="Support message" />
              <button disabled={loading || !input.trim()} className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white transition hover:bg-slate-800 disabled:opacity-35" aria-label="Send message"><Send className="size-4" /></button>
            </form>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Your order</div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-slate-500">Order</span><span className="font-semibold">{primaryOrder?.id ?? "—"}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Total</span><span className="font-semibold">{primaryOrder ? `${primaryOrder.totalAmount.toLocaleString("vi-VN")}₫` : "—"}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Status</span><span className="font-medium capitalize text-slate-700">{primaryOrder?.status ?? "—"}</span></div>
              {shipment && <div className="border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500"><div className="font-semibold text-slate-700">{shipment.carrier}</div><div>{shipment.trackingNumber}</div>{shipment.estimatedDelivery && <div>Estimated delivery {shipment.estimatedDelivery}</div>}</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Link2 className="size-4 text-sky-500" /> Continue on Telegram</div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Link this order to your private Telegram chat and continue the same support flow there.</p>
            <a
              href={`/api/integrations/telegram/link?customerId=${encodeURIComponent(customerId)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Connect Telegram <ArrowRight className="size-3.5" />
            </a>
            <div className="mt-2 text-center text-[10px] text-slate-400">Linked to AgentX account {telegramAccountName}</div>
          </div>
        </aside>
      </div>
    </main>
  );
}
