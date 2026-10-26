import { connection } from "next/server";
import { BadgeDollarSign, CalendarClock, ShieldCheck } from "lucide-react";
import { PolicyLabForm } from "@/components/policy-lab-form";
import { getRuntimePolicy } from "@/lib/repository";

export const instant = false;

export default async function HubPoliciesPage() {
  await connection();
  const policy = await getRuntimePolicy();
  return (
    <div className="mx-auto max-w-6xl">
      <div className="border-b border-slate-200 pb-6"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Deterministic control</div><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Policy lab</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Change the business guardrails AgentX must obey. The model can request an action; these values decide whether execution is allowed, blocked or escalated.</p></div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><PolicyLabForm initial={policy} /></section>
        <aside className="space-y-4">
          <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg shadow-slate-950/10"><ShieldCheck className="size-5 text-cyan-300" /><div className="mt-5 text-sm font-semibold">AI cannot edit these values</div><p className="mt-2 text-xs leading-5 text-slate-400">Policy mutations come through the Hub control plane, are server-side only and are written to the audit stream.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><BadgeDollarSign className="size-4 text-amber-500" /><div className="mt-4 text-xl font-semibold">{policy.autoRefundLimit.toLocaleString("vi-VN")}₫</div><div className="mt-1 text-xs text-slate-500">current automatic threshold</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><CalendarClock className="size-4 text-indigo-500" /><div className="mt-4 text-xl font-semibold">{policy.returnWindowDays} days</div><div className="mt-1 text-xs text-slate-500">current return window</div></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
