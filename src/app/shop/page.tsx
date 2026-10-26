import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, ClipboardCheck, Inbox, PackageSearch, UserRoundCheck } from "lucide-react";
import { LiveRefresh } from "@/components/live-refresh";
import { listRuntimeApprovals, listRuntimeConversations, listRuntimeOrders } from "@/lib/repository";

export const instant = false;

export default async function ShopOverviewPage() {
  await connection();
  const [orders, conversations, approvals] = await Promise.all([
    listRuntimeOrders(),
    listRuntimeConversations(),
    listRuntimeApprovals(),
  ]);
  const needsHuman = conversations.filter((item) => item.status === "human_required").length;
  const humanActive = conversations.filter((item) => item.status === "human_active").length;
  const pendingApprovals = approvals.filter((item) => item.status === "pending");

  return (
    <div className="mx-auto max-w-7xl">
      <LiveRefresh intervalMs={4000} />
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Seller workspace</div><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Support operations</h1><p className="mt-2 text-sm leading-6 text-slate-500">Manage conversations that cross the AI boundary without losing the context AgentX already collected.</p></div>
        <Link href="/client" className="inline-flex min-h-11 items-center text-xs font-semibold text-slate-500 hover:text-slate-950">Open customer simulator ↗</Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Open conversations", value: conversations.filter((item) => item.status !== "closed").length, icon: Inbox, tone: "text-slate-700 bg-slate-100" },
          { label: "Needs human", value: needsHuman, icon: UserRoundCheck, tone: "text-amber-700 bg-amber-50" },
          { label: "Human active", value: humanActive, icon: UserRoundCheck, tone: "text-indigo-700 bg-indigo-50" },
          { label: "Pending approvals", value: pendingApprovals.length, icon: ClipboardCheck, tone: "text-rose-700 bg-rose-50" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`grid size-9 place-items-center rounded-xl ${tone}`}><Icon className="size-4" /></div><div className="mt-4 text-2xl font-semibold tracking-tight">{value}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between"><div><div className="text-sm font-semibold">Priority conversations</div><div className="mt-1 text-xs text-slate-400">Human-required cases first</div></div><Link href="/shop/inbox" className="inline-flex min-h-10 items-center text-xs font-semibold text-slate-500 hover:text-slate-950">View inbox</Link></div>
          <div className="mt-5 divide-y divide-slate-100">
            {conversations.slice().sort((a, b) => Number(b.status === "human_required") - Number(a.status === "human_required")).slice(0, 5).map((conversation) => (
              <Link key={conversation.id} href={`/shop/inbox?conversation=${conversation.id}`} className="flex flex-col items-start gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{conversation.customer}</span>{conversation.order && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{conversation.order}</span>}</div><div className="mt-1 truncate text-xs text-slate-400">{conversation.preview}</div></div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${conversation.status === "human_required" ? "bg-amber-50 text-amber-700" : conversation.status === "human_active" ? "bg-indigo-50 text-indigo-700" : conversation.status === "closed" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>{conversation.status.replaceAll("_", " ")}</span>
              </Link>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <Link href="/shop/approvals" className="group block rounded-2xl bg-slate-950 p-5 text-white shadow-lg shadow-slate-950/10"><ClipboardCheck className="size-5 text-amber-300" /><div className="mt-5 text-3xl font-semibold">{pendingApprovals.reduce((sum, item) => sum + item.amount, 0).toLocaleString("vi-VN")}₫</div><div className="mt-1 text-xs text-slate-400">pending approval value</div><div className="mt-5 flex items-center gap-2 text-xs font-semibold text-cyan-300">Review approvals <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" /></div></Link>
          <Link href="/shop/orders" className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><PackageSearch className="size-5 text-slate-400" /><div className="mt-3 text-sm font-semibold">Commerce context</div><div className="mt-1 text-xs text-slate-400">{orders.length} orders available to support tools</div></div><ArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5" /></Link>
        </aside>
      </div>
    </div>
  );
}
