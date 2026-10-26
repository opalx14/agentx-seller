"use client";

import { useState } from "react";
import { Bug, CheckCircle2, CircleAlert, Loader2, Play, ShieldCheck, WalletCards } from "lucide-react";
import type { RedTeamResult } from "@/lib/red-team";

export function RedTeamLab() {
  const [results, setResults] = useState<RedTeamResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ passed: number; total: number } | null>(null);

  async function run() {
    setLoading(true);
    try {
      const response = await fetch("/api/hub/red-team", { method: "POST" });
      const data = (await response.json()) as { results?: RedTeamResult[]; passed?: number; total?: number };
      setResults(data.results ?? []);
      setSummary({ passed: data.passed ?? 0, total: data.total ?? 0 });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-900"><Bug className="size-4" /> Attack the agent, not the customer</div>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-rose-900/60">Adversarial dry-runs try to steal data, over-refund, duplicate actions, prompt-inject policy bypasses and remove Gemini. Nothing is executed.</p>
        </div>
        <button onClick={() => void run()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Attack AgentX
        </button>
      </div>

      {summary && (
        <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${summary.passed === summary.total ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          Control plane survived {summary.passed}/{summary.total} attacks
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {results.map((result) => (
          <article key={result.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
              <div className="min-w-0"><div className="font-mono text-[10px] font-semibold text-rose-500">{result.id}</div><h3 className="mt-1 text-sm font-semibold text-slate-950">{result.attack}</h3></div>
              {result.pass ? <CheckCircle2 className="size-5 shrink-0 text-emerald-500" /> : <CircleAlert className="size-5 shrink-0 text-amber-500" />}
            </div>
            <div className="space-y-3 p-5 text-xs">
              <div><div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Agent attempt</div><div className="mt-1 break-words text-slate-700">{result.attemptedAction}</div></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center gap-2 font-semibold text-slate-800"><ShieldCheck className="size-3.5 text-indigo-500" /> Control plane</div><div className="mt-1 break-words font-mono text-[10px] text-slate-500">{result.controlPlane}</div></div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><div className="rounded-xl bg-emerald-50 p-3"><div className="text-[10px] uppercase tracking-wider text-emerald-700/60">Protected</div><div className="mt-1 font-semibold text-emerald-900">{result.protectedAsset}</div></div><div className="rounded-xl bg-slate-950 p-3 text-white"><div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400"><WalletCards className="size-3" /> Money moved</div><div className="mt-1 text-lg font-semibold">{result.moneyMoved.toLocaleString("vi-VN")}₫</div></div></div>
              <div className="text-slate-500">{result.outcome}</div>
              <div className="space-y-1 border-t border-slate-100 pt-3 font-mono text-[10px] text-slate-400">{result.trace.map((line) => <div key={line}>→ {line}</div>)}</div>
            </div>
          </article>
        ))}
      </div>

      {!summary && <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400 sm:p-10">Launch the adversarial suite to prove AgentX is governed even when the request is malicious or the model disappears.</div>}
    </div>
  );
}
