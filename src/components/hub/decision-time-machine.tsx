"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, GitCompareArrows, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import type { RefundDecisionReplay } from "@/lib/decision-replay";

function decisionTone(decision: string) {
  if (decision === "ALLOW") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (decision === "DENY") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function DecisionTimeMachine({ initial }: { initial: RefundDecisionReplay }) {
  const [limit, setLimit] = useState(initial.simulatedPolicy.autoRefundLimit);
  const [replay, setReplay] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/hub/time-machine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulatedAutoRefundLimit: limit }),
      });
      const data = (await response.json()) as { replay?: RefundDecisionReplay; error?: string };
      if (!response.ok || !data.replay) throw new Error(data.error ?? "Replay failed");
      setReplay(data.replay);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Replay failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-950 px-5 py-5 text-white sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300"><Sparkles className="size-3.5" /> Frozen AI proposal</div>
              <div className="mt-3 break-all font-mono text-sm text-white">{replay.proposal}</div>
              <div className="mt-2 text-xs text-slate-400">{replay.customer} · verified order {replay.orderId} · {replay.amount.toLocaleString("vi-VN")}₫</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-300">No Gemini rerun · no execution</div>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Current policy</div>
            <div className="mt-3 text-2xl font-semibold">{replay.currentPolicy.autoRefundLimit.toLocaleString("vi-VN")}₫</div>
            <div className="mt-1 text-xs text-slate-500">automatic refund threshold</div>
            <div className={`mt-5 rounded-xl border px-4 py-3 ${decisionTone(replay.currentDecision.decision)}`}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">Outcome</div>
              <div className="mt-1 text-lg font-semibold">{replay.currentDecision.decision}</div>
              <div className="mt-1 break-words font-mono text-[10px] opacity-70">{replay.currentDecision.reason}</div>
            </div>
          </div>

          <div className="grid place-items-center py-1 lg:px-1">
            <div className="flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 lg:flex-col lg:gap-1">
              <GitCompareArrows className="size-4" /><span>Replay</span><ArrowRight className="size-3.5 rotate-90 lg:rotate-0" />
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-500">Simulated policy</div>
            <form onSubmit={run} className="mt-3">
              <div className="flex min-w-0 items-center rounded-xl border border-indigo-200 bg-white px-3 focus-within:border-indigo-400">
                <input
                  aria-label="Simulated automatic refund limit"
                  type="number"
                  min={0}
                  step={10000}
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-lg font-semibold outline-none"
                />
                <span className="text-xs font-medium text-slate-400">VND</span>
              </div>
              <button disabled={loading} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <GitCompareArrows className="size-4" />} Replay without executing
              </button>
            </form>
            <div className={`mt-5 rounded-xl border px-4 py-3 ${decisionTone(replay.simulatedDecision.decision)}`}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">Simulated outcome</div>
              <div className="mt-1 text-lg font-semibold">{replay.simulatedDecision.decision}</div>
              <div className="mt-1 break-words font-mono text-[10px] opacity-70">{replay.simulatedDecision.reason}</div>
            </div>
          </div>
        </div>
      </section>

      <div className={`rounded-2xl border p-5 ${replay.changed ? "border-cyan-200 bg-cyan-50" : "border-slate-200 bg-white"}`}>
        <div className="flex items-start gap-3">
          <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${replay.changed ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-500"}`}><ShieldCheck className="size-4" /></div>
          <div className="min-w-0"><div className="text-sm font-semibold text-slate-950">{replay.explanation}</div><p className="mt-1 text-xs leading-5 text-slate-500">Order identity, refund amount and AI-requested tool stay frozen. Only the seller-owned deterministic threshold is replayed.</p></div>
        </div>
      </div>
      {error && <div className="text-xs font-semibold text-rose-600">{error}</div>}
    </div>
  );
}
