"use client";

import { useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, Play, ShieldCheck } from "lucide-react";
import type { ScenarioResult } from "@/lib/scenarios";

export function ScenarioRunner() {
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ passed: number; total: number } | null>(null);

  async function run() {
    setLoading(true);
    const response = await fetch("/api/hub/scenarios", { method: "POST" });
    const data = (await response.json()) as { results?: ScenarioResult[]; passed?: number; total?: number };
    setResults(data.results ?? []);
    setSummary({ passed: data.passed ?? 0, total: data.total ?? 0 });
    setLoading(false);
  }

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-indigo-500" /> Read-only safety suite</div><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">Runs policy and planner invariants against the current runtime configuration without creating refunds, returns or approvals.</p></div>
        <button onClick={() => void run()} disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 sm:w-auto">{loading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Run suite</button>
      </div>

      {summary && (
        <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${summary.passed === summary.total ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          {summary.passed}/{summary.total} scenarios passed
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {results.map((result) => (
          <article key={result.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><div className="font-mono text-[10px] font-semibold text-slate-400">{result.id}</div><h3 className="mt-1 text-sm font-semibold">{result.title}</h3></div>{result.pass ? <CheckCircle2 className="size-5 text-emerald-500" /> : <CircleAlert className="size-5 text-amber-500" />}</div>
            <p className="mt-3 text-xs leading-5 text-slate-500">{result.invariant}</p>
            <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2"><div className="min-w-0 rounded-lg bg-slate-50 p-2.5"><div className="text-[10px] uppercase tracking-wider text-slate-400">Expected</div><div className="mt-1 break-words font-semibold text-slate-700">{result.expected}</div></div><div className="min-w-0 rounded-lg bg-slate-50 p-2.5"><div className="text-[10px] uppercase tracking-wider text-slate-400">Actual</div><div className="mt-1 break-words font-semibold text-slate-700">{result.actual}</div></div></div>
            <div className="mt-3 space-y-1 break-words border-t border-slate-100 pt-3 font-mono text-[10px] text-slate-400">{result.trace.map((line) => <div key={line}>→ {line}</div>)}</div>
          </article>
        ))}
      </div>

      {!summary && <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">Run the suite to validate the current policy configuration and fallback behavior.</div>}
    </div>
  );
}
