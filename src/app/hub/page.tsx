import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Bot, CheckCircle2, Clock3, Gauge, History, ShieldAlert, Sparkles } from "lucide-react";
import { ApprovalActions } from "@/components/shop/approval-actions";
import { LiveRefresh } from "@/components/live-refresh";
import { buildHandoffSummary } from "@/features/handoff/summary";
import { getRuntimePolicy, listRuntimeApprovals, listRuntimeAudit, listRuntimeConversations } from "@/lib/repository";

export const instant = false;

function eventLabel(action: string) {
  return action.replaceAll("_", " ");
}

export default async function HubOverviewPage() {
  await connection();
  const [conversations, audit, policy, approvals] = await Promise.all([
    listRuntimeConversations(),
    listRuntimeAudit(),
    getRuntimePolicy(),
    listRuntimeApprovals(),
  ]);

  const pending = approvals.filter((item) => item.status === "pending");
  const attention = conversations.filter((item) => item.status === "human_required" || item.status === "human_active");
  const recentAudit = [...audit].sort((a, b) => Date.parse(b.time) - Date.parse(a.time)).slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl">
      <LiveRefresh intervalMs={4000} />

      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Seller control plane</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">Only the decisions that matter.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Routine support stays autonomous. The Hub only surfaces cases where AgentX hit a seller guardrail, needs human judgment, or executed a business action worth auditing.</p>
        </div>
        <Link href="/store" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-semibold text-white">
          Run customer demo <ArrowRight className="size-3.5" />
        </Link>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ShieldAlert className="size-4 text-amber-500" />
          <div className="mt-4 text-2xl font-semibold">{pending.length}</div>
          <div className="mt-1 text-xs text-slate-500">refund decisions waiting</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Gauge className="size-4 text-indigo-500" />
          <div className="mt-4 text-2xl font-semibold">{policy.autoRefundLimit.toLocaleString("vi-VN")}₫</div>
          <div className="mt-1 text-xs text-slate-500">automatic refund limit</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Bot className="size-4 text-emerald-500" />
          <div className="mt-4 text-2xl font-semibold">{attention.length}</div>
          <div className="mt-1 text-xs text-slate-500">conversations needing a human</div>
        </div>
      </section>

      <section className="mt-6 rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Human review</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Guardrails stopped here</h2>
          </div>
          <div className="text-xs text-slate-400">Gemini proposes · seller policy decides</div>
        </div>

        <div className="p-5 sm:p-6">
          {pending.length === 0 ? (
            <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
              <div>
                <CheckCircle2 className="mx-auto size-7 text-emerald-500" />
                <div className="mt-4 text-sm font-semibold">No high-risk action is waiting</div>
                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">Buy the 1.800.000₫ headphones in the Store, then request a refund from AgentX. The request will appear here because it exceeds the 500.000₫ automatic limit.</p>
                <Link href="/store" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-semibold text-white">Create the hero case <ArrowRight className="size-3.5" /></Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((approval) => {
                const conversation = conversations.find((item) => item.order === approval.orderId);
                const summary = conversation ? buildHandoffSummary(conversation, approvals) : undefined;
                return (
                  <article key={approval.id} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 sm:p-6">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-amber-800">Human approval required</span>
                          <span className="font-mono text-[11px] text-slate-400">{approval.id}</span>
                        </div>
                        <h3 className="mt-4 text-xl font-semibold tracking-tight">{approval.orderId} · {approval.customerName}</h3>
                        <p className="mt-2 text-3xl font-semibold tracking-[-0.035em]">{approval.amount.toLocaleString("vi-VN")}₫</p>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl bg-white p-3"><div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Seller limit</div><div className="mt-1 text-sm font-semibold">{policy.autoRefundLimit.toLocaleString("vi-VN")}₫</div></div>
                          <div className="rounded-xl bg-white p-3"><div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Policy result</div><div className="mt-1 text-sm font-semibold text-amber-700">REQUIRE HUMAN</div></div>
                          <div className="rounded-xl bg-white p-3"><div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Reason</div><div className="mt-1 break-words text-sm font-semibold">{approval.reason.replaceAll("_", " ")}</div></div>
                        </div>

                        {summary && (
                          <div className="mt-5 rounded-xl border border-amber-100 bg-white p-4">
                            <div className="text-xs font-semibold text-slate-900">AgentX handoff summary</div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{summary.issue}</p>
                            <div className="mt-3 flex flex-wrap gap-2">{summary.context.map((item) => <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600">{item}</span>)}</div>
                            <p className="mt-3 text-xs leading-5 text-slate-500">{summary.nextStep}</p>
                          </div>
                        )}
                      </div>

                      <div data-tour="hub-human-review" className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700"><Clock3 className="size-4 text-amber-500" /> Seller decision</div>
                        <p className="mt-3 text-xs leading-5 text-slate-500">AgentX has not moved money. Approve to execute the verified refund idempotently, or reject it.</p>
                        <div className="mt-5"><ApprovalActions id={approval.id} /></div>
                        {conversation && <Link href={`/shop/inbox?conversation=${encodeURIComponent(conversation.id)}`} className="mt-4 inline-flex min-h-10 items-center text-xs font-semibold text-slate-500 hover:text-slate-950">Open full conversation <ArrowRight className="ml-1 size-3" /></Link>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600"><Gauge className="size-4" /> Seller policy</div>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4"><span className="text-sm text-slate-500">Auto refund</span><span className="font-semibold">≤ {policy.autoRefundLimit.toLocaleString("vi-VN")}₫</span></div>
            <div className="flex items-center justify-between gap-4"><span className="text-sm text-slate-500">Return window</span><span className="font-semibold">{policy.returnWindowDays} days</span></div>
          </div>
          <Link href="/hub/policies" className="mt-6 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-indigo-600">Edit guardrails <ArrowRight className="size-3.5" /></Link>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500"><History className="size-4" /> Recent decision trail</div>
            <Link href="/hub/audit" className="text-xs font-semibold text-slate-400 hover:text-slate-950">Full audit ↗</Link>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {recentAudit.length === 0 ? <div className="py-8 text-center text-xs text-slate-400">No business actions yet.</div> : recentAudit.map((event) => (
              <div key={event.id} className="grid gap-1 py-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500"><span className={`size-2 rounded-full ${event.status === "success" ? "bg-emerald-500" : event.status === "warning" ? "bg-amber-500" : "bg-rose-500"}`} />{eventLabel(event.action)}</div>
                <div className="min-w-0 break-words text-xs leading-5 text-slate-500">{event.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div><div className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Sparkles className="size-3.5" /> Optional safety proofs</div><p className="mt-1 text-[11px] leading-5 text-slate-400">Keep these out of the main demo unless a judge asks how policy changes or adversarial cases are tested.</p></div>
        <div className="mt-3 flex gap-3 sm:mt-0"><Link href="/hub/time-machine" className="text-xs font-semibold text-slate-500 hover:text-slate-950">Time Machine</Link><Link href="/hub/red-team" className="text-xs font-semibold text-slate-500 hover:text-slate-950">Red Team</Link></div>
      </section>
    </div>
  );
}
