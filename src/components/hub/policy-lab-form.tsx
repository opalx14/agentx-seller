"use client";

import { FormEvent, useState } from "react";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import type { RuntimePolicy } from "@/lib/repository";

export function PolicyLabForm({ initial }: { initial: RuntimePolicy }) {
  const [autoRefundLimit, setAutoRefundLimit] = useState(initial.autoRefundLimit);
  const [returnWindowDays, setReturnWindowDays] = useState(initial.returnWindowDays);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState("saving");
    setMessage("");
    const response = await fetch("/api/hub/policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoRefundLimit, returnWindowDays }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setState("error");
      setMessage(data.error ?? "Unable to update policy");
      return;
    }
    setState("saved");
    setMessage("Policy saved. New support decisions use these values immediately.");
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="auto-refund-limit" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Automatic refund limit</label>
        <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-indigo-300">
          <input id="auto-refund-limit" type="number" min={0} step={10000} value={autoRefundLimit} onChange={(event) => setAutoRefundLimit(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent py-3 text-lg font-semibold outline-none" />
          <span className="text-sm font-medium text-slate-400">VND</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400">Refund requests above this value require a human approval instead of automatic execution.</p>
      </div>

      <div>
        <label htmlFor="return-window" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Return window</label>
        <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-indigo-300">
          <input id="return-window" type="number" min={1} max={365} value={returnWindowDays} onChange={(event) => setReturnWindowDays(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent py-3 text-lg font-semibold outline-none" />
          <span className="text-sm font-medium text-slate-400">days</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400">Delivered orders older than this window are denied by deterministic policy.</p>
      </div>

      <button disabled={state === "saving"} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 sm:w-auto">
        {state === "saving" ? <Loader2 className="size-4 animate-spin" /> : state === "saved" ? <ShieldCheck className="size-4 text-emerald-300" /> : <Save className="size-4" />}
        Save policy
      </button>
      {message && <div className={`text-xs font-medium ${state === "error" ? "text-rose-600" : "text-emerald-700"}`}>{message}</div>}
    </form>
  );
}
