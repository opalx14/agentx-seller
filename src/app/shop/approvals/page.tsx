import { connection } from "next/server";
import Link from "next/link";
import { BadgeDollarSign, ClipboardCheck, ShieldAlert } from "lucide-react";
import { ApprovalActions } from "@/components/approval-actions";
import { LiveRefresh } from "@/components/live-refresh";
import { getRuntimePolicy, listRuntimeApprovals } from "@/lib/repository";

export const instant = false;

export default async function ShopApprovalsPage() {
  await connection();
  const [approvals, policy] = await Promise.all([listRuntimeApprovals(), getRuntimePolicy()]);
  const pending = approvals.filter((approval) => approval.status === "pending");
  const pendingValue = pending.reduce((sum, approval) => sum + approval.amount, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <LiveRefresh />
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Human control</div><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Refund approvals</h1><p className="mt-2 text-sm leading-6 text-slate-500">AgentX can prepare the request, but only the shop can authorize refunds beyond the automatic threshold.</p></div>
        <Link href="/client" className="text-xs font-semibold text-slate-500 hover:text-slate-950">Open client view ↗</Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><ClipboardCheck className="size-4 text-slate-400" /><div className="mt-4 text-2xl font-semibold">{pending.length}</div><div className="mt-1 text-xs text-slate-500">pending decisions</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><BadgeDollarSign className="size-4 text-amber-500" /><div className="mt-4 text-2xl font-semibold">{pendingValue.toLocaleString("vi-VN")}₫</div><div className="mt-1 text-xs text-slate-500">pending refund value</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><ShieldAlert className="size-4 text-indigo-500" /><div className="mt-4 text-2xl font-semibold">{policy.autoRefundLimit.toLocaleString("vi-VN")}₫</div><div className="mt-1 text-xs text-slate-500">current auto-refund limit</div></div>
      </div>

      <div className="mt-6 space-y-4">
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm"><ClipboardCheck className="mx-auto size-6 text-slate-300" /><div className="mt-4 text-sm font-semibold">No approvals waiting</div><p className="mt-2 text-xs leading-5 text-slate-400">Run the A1002 damaged-item flow from the Client surface to create a high-value refund decision.</p><Link href="/client" className="mt-5 inline-block rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white">Open Client</Link></div>
        ) : pending.map((approval) => (
          <article key={approval.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-amber-700">Requires approval</span><span className="font-mono text-[11px] text-slate-400">{approval.id}</span></div>
                <h2 className="mt-3 break-words text-lg font-semibold tracking-tight sm:text-xl">{approval.orderId} · {approval.customerName}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Amount</div><div className="mt-1 text-sm font-semibold">{approval.amount.toLocaleString("vi-VN")}₫</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Threshold</div><div className="mt-1 text-sm font-semibold">{policy.autoRefundLimit.toLocaleString("vi-VN")}₫</div></div>
                  <div className="min-w-0 rounded-xl bg-slate-50 p-3"><div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Reason</div><div className="mt-1 break-words text-sm font-semibold">{approval.reason}</div></div>
                </div>
                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">Approving processes the refund idempotently and posts a customer-visible update back into the shared conversation. Rejecting also writes the decision into that thread.</div>
              </div>
              <ApprovalActions id={approval.id} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
