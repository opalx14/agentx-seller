import { connection } from "next/server";
import { Bot, Clock3, MessageCircleMore, UserRound } from "lucide-react";
import { ConversationControls } from "@/components/conversation-controls";
import { LiveRefresh } from "@/components/live-refresh";
import { buildHandoffSummary } from "@/features/handoff/summary";
import { listRuntimeApprovals, listRuntimeConversations } from "@/lib/repository";

export const instant = false;

export default async function ShopInboxPage({ searchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  await connection();
  const params = await searchParams;
  const [conversations, approvals] = await Promise.all([
    listRuntimeConversations(),
    listRuntimeApprovals(),
  ]);
  const selected = conversations.find((item) => item.id === params.conversation)
    ?? conversations.find((item) => item.status === "human_required")
    ?? conversations.find((item) => item.status === "human_active")
    ?? conversations[0];
  const needsHuman = conversations.filter((item) => item.status === "human_required").length;
  const handoffSummary = selected ? buildHandoffSummary(selected, approvals) : undefined;

  return (
    <div className="mx-auto max-w-7xl">
      <LiveRefresh />
      <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Human support</div><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Inbox</h1><p className="mt-2 text-sm leading-6 text-slate-500">Take over only when needed. AgentX stops responding while a human owns the conversation.</p></div>
        <div className="hidden rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 sm:block">{needsHuman} waiting for human</div>
      </div>

      <div className="mt-6 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-[650px] lg:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-50/70 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-4 py-4"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Conversations</div><span className="text-xs text-slate-400">{conversations.length}</span></div>
          <div className="max-h-72 overflow-y-auto border-t border-slate-200 sm:max-h-80 lg:max-h-[594px]">
            {conversations.map((conversation) => {
              const active = selected?.id === conversation.id;
              return (
                <a key={conversation.id} href={`/shop/inbox?conversation=${conversation.id}`} className={`block border-b border-slate-200/70 px-4 py-4 transition ${active ? "bg-white shadow-[inset_3px_0_0_#0f172a]" : "hover:bg-white/70"}`}>
                  <div className="flex items-center justify-between gap-3"><div className="truncate text-sm font-semibold text-slate-900">{conversation.customer}</div><span className="font-mono text-[10px] text-slate-400">{conversation.order ?? "—"}</span></div>
                  <div className="mt-1.5 truncate text-xs leading-5 text-slate-500">{conversation.preview}</div>
                  <div className="mt-3 flex items-center justify-between"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ${conversation.status === "human_required" ? "bg-amber-100 text-amber-800" : conversation.status === "human_active" ? "bg-indigo-100 text-indigo-700" : conversation.status === "closed" ? "bg-slate-200 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}>{conversation.status === "human_active" || conversation.status === "human_required" ? <UserRound className="size-3" /> : <Bot className="size-3" />}{conversation.status.replaceAll("_", " ")}</span><span className="text-[10px] uppercase tracking-wider text-slate-400">{conversation.channel}</span></div>
                </a>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0">
          {!selected ? (
            <div className="grid min-h-[360px] place-items-center px-6 text-center text-sm text-slate-400 lg:min-h-[650px]">No conversations yet.</div>
          ) : (
            <div className="flex min-h-[520px] flex-col lg:min-h-[650px]">
              <header className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{selected.customer}</h2>{selected.order && <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-500">{selected.order}</span>}</div><div className="mt-1 flex flex-wrap items-center gap-2 break-words text-[11px] text-slate-400"><span>{selected.id}</span><span>·</span><span>{selected.channel}</span>{selected.assignedTo && <><span>·</span><span>assigned to {selected.assignedTo}</span></>}</div></div>
                <div className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${selected.status === "human_required" ? "bg-amber-50 text-amber-700" : selected.status === "human_active" ? "bg-indigo-50 text-indigo-700" : selected.status === "closed" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>{selected.status.replaceAll("_", " ")}</div>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/40 px-5 py-6 sm:px-6">
                {selected.messages.map((message, index) => (
                  <div key={`${message.createdAt}-${index}`} className={`flex ${message.sender === "customer" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[92%] break-words rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[82%] lg:max-w-[78%] ${message.sender === "customer" ? "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm" : message.sender === "human" ? "rounded-br-md bg-indigo-600 text-white" : message.sender === "system" ? "border border-amber-100 bg-amber-50 text-amber-950" : "rounded-br-md bg-slate-900 text-white"}`}>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-50">{message.sender === "customer" ? "Customer" : message.sender === "ai" ? "AgentX" : message.sender === "human" ? "Shop agent" : "System"}</div>
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 bg-white px-4 py-4 sm:px-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <ConversationControls id={selected.id} status={selected.status} />
                  <div className={`rounded-xl border p-3 ${selected.status === "human_required" ? "border-amber-200 bg-amber-50" : selected.status === "human_active" ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">{selected.status === "human_required" ? <Clock3 className="size-3.5 text-amber-600" /> : <MessageCircleMore className="size-3.5 text-slate-400" />} AgentX handoff summary</div>
                    {handoffSummary && (
                      <div className="mt-3 space-y-2 text-[11px] leading-5 text-slate-600">
                        <div><span className="font-semibold text-slate-800">Issue:</span> {handoffSummary.issue}</div>
                        <div><span className="font-semibold text-slate-800">Context:</span> {handoffSummary.context.join(" · ")}</div>
                        <div><span className="font-semibold text-slate-800">Why:</span> {handoffSummary.reason}</div>
                        <div><span className="font-semibold text-slate-800">Next:</span> {handoffSummary.nextStep}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
