import { connection } from "next/server";
import { Bot, CircleAlert, UserRound } from "lucide-react";
import { LiveRefresh } from "@/components/live-refresh";
import { listRuntimeConversations } from "@/lib/repository";

export const instant = false;

export default async function HubConversationsPage() {
  await connection();
  const conversations = await listRuntimeConversations();

  return (
    <div className="mx-auto max-w-7xl">
      <LiveRefresh intervalMs={4000} />
      <div className="border-b border-slate-200 pb-6"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Shared state</div><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Conversations</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Operator view of the state machine across Client and Shop. This surface is diagnostic; human messaging happens in the Shop workspace.</p></div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {conversations.map((conversation) => (
          <article key={conversation.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{conversation.customer}</span>{conversation.order && <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-500">{conversation.order}</span>}</div><div className="mt-1 break-words font-mono text-[10px] text-slate-400">{conversation.id} · {conversation.channel}{conversation.assignedTo ? ` · ${conversation.assignedTo}` : ""}</div></div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${conversation.status === "human_required" ? "bg-amber-50 text-amber-700" : conversation.status === "human_active" ? "bg-indigo-50 text-indigo-700" : conversation.status === "closed" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>
                {conversation.status === "human_required" ? <CircleAlert className="size-3" /> : conversation.status === "human_active" ? <UserRound className="size-3" /> : <Bot className="size-3" />}
                {conversation.status.replaceAll("_", " ")}
              </span>
            </header>
            <div className="max-h-72 space-y-3 overflow-y-auto bg-slate-50/50 p-4">
              {conversation.messages.map((message, index) => (
                <div key={`${message.createdAt}-${index}`} className="grid grid-cols-[58px_minmax(0,1fr)] gap-2 text-xs sm:grid-cols-[70px_minmax(0,1fr)] sm:gap-3"><div className={`pt-0.5 font-semibold uppercase tracking-[0.12em] ${message.sender === "customer" ? "text-slate-500" : message.sender === "human" ? "text-indigo-600" : message.sender === "system" ? "text-amber-600" : "text-emerald-600"}`}>{message.sender}</div><div className="min-w-0 break-words leading-5 text-slate-600">{message.content}</div></div>
              ))}
            </div>
            <footer className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400">updated {new Date(conversation.updatedAt).toLocaleString("vi-VN")}</footer>
          </article>
        ))}
      </div>
    </div>
  );
}
