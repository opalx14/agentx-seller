import { connection } from "next/server";
import { CheckCircle2, CircleAlert, CircleX, ScrollText } from "lucide-react";
import { LiveRefresh } from "@/components/live-refresh";
import { listRuntimeAudit } from "@/lib/repository";

export const instant = false;

export default async function HubAuditPage() {
  await connection();
  const events = await listRuntimeAudit();
  const success = events.filter((event) => event.status === "success").length;
  const warnings = events.filter((event) => event.status === "warning").length;
  const errors = events.filter((event) => event.status === "error").length;

  return (
    <div className="mx-auto max-w-7xl">
      <LiveRefresh intervalMs={4000} />
      <div className="border-b border-slate-200 pb-6"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Governance</div><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Audit log</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Backend actions, ownership checks and policy decisions recorded independently of the model response.</p></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><CheckCircle2 className="size-4 text-emerald-500" /><div className="mt-4 text-2xl font-semibold">{success}</div><div className="mt-1 text-xs text-slate-500">successful events</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><CircleAlert className="size-4 text-amber-500" /><div className="mt-4 text-2xl font-semibold">{warnings}</div><div className="mt-1 text-xs text-slate-500">warnings / escalations</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><CircleX className="size-4 text-rose-500" /><div className="mt-4 text-2xl font-semibold">{errors}</div><div className="mt-1 text-xs text-slate-500">errors</div></div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-2 text-sm font-semibold"><ScrollText className="size-4 text-slate-400" /> Decision timeline</div><span className="text-xs text-slate-400">latest {events.length}</span></div>
        {events.length === 0 ? <div className="p-10 text-center text-sm text-slate-400">No audit events yet.</div> : events.map((event) => (
          <div key={event.id} className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-0 md:grid-cols-[150px_165px_1fr] md:items-start">
            <div className="font-mono text-[10px] leading-5 text-slate-400">{new Date(event.time).toLocaleString("vi-VN")}</div>
            <div className="min-w-0"><span className={`inline-block max-w-full break-words rounded-full px-2.5 py-1 text-[10px] font-semibold ${event.status === "success" ? "bg-emerald-50 text-emerald-700" : event.status === "error" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{event.action}</span></div>
            <div className="min-w-0 break-words text-xs leading-5 text-slate-600">{event.detail}{event.toolName && <span className="ml-2 inline-block max-w-full break-all rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">{event.toolName}</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
