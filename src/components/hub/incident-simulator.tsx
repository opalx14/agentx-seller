"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, CircleCheck, Loader2, RadioTower, Send, ShieldCheck, Truck } from "lucide-react";
import type { IncidentSimulation } from "@/lib/incidents";

export function IncidentSimulator({ initial }: { initial: IncidentSimulation }) {
  const [simulation, setSimulation] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function simulate(orderId: string) {
    setLoading(true);
    try {
      const response = await fetch("/api/hub/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = (await response.json()) as { simulation: IncidentSimulation };
      setSimulation(data.simulation);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div><div className="flex items-center gap-2 text-sm font-semibold"><RadioTower className="size-4 text-cyan-600" /> Synthetic carrier event</div><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">Simulate an external delivery disruption before the customer opens a chat. This phase proposes outreach only; it never sends or compensates automatically.</p></div>
        <div className="flex flex-col gap-2 min-[420px]:flex-row">
          <button onClick={() => void simulate("A1001")} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />} Delay A1001</button>
          <button onClick={() => void simulate("A9999")} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50">Test unknown order</button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-950 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">Incoming event</div><div className="mt-2 font-mono text-sm">{simulation.event} · {simulation.orderId}</div></div>
          <div className={`w-fit rounded-full px-3 py-1.5 text-[10px] font-semibold ${simulation.matched ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>{simulation.controlOutcome.replaceAll("_", " ")}</div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid gap-3 md:grid-cols-5">
            {simulation.pipeline.map((step, index) => (
              <div key={`${step}-${index}`} className="relative rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-semibold text-slate-400">0{index + 1}</div>
                <div className="mt-2 text-xs font-medium leading-5 text-slate-700">{step}</div>
                {index < simulation.pipeline.length - 1 && <ArrowRight className="absolute -right-2.5 top-1/2 hidden size-4 -translate-y-1/2 text-slate-300 md:block" />}
              </div>
            ))}
          </div>

          {simulation.matched ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <CircleCheck className="size-5 text-emerald-600" />
                <div className="mt-4 text-sm font-semibold text-emerald-950">Verified affected customer</div>
                <div className="mt-2 text-xs leading-5 text-emerald-900/70">{simulation.customer?.name} · {simulation.customer?.id}</div>
                <div className="mt-1 text-xs leading-5 text-emerald-900/70">{simulation.shipment?.carrier} · {simulation.shipment?.trackingNumber}</div>
              </div>
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700"><Send className="size-3.5" /> Proposed proactive outreach</div>
                <p className="mt-3 text-sm leading-6 text-cyan-950">{simulation.proposedMessage}</p>
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-cyan-200 bg-white/70 p-3 text-xs leading-5 text-cyan-900"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> Message is proposed only. No refund, compensation, external send or conversation mutation occurred.</div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5"><AlertTriangle className="size-5 text-rose-600" /><div className="mt-3 text-sm font-semibold text-rose-950">Fail closed</div><div className="mt-1 font-mono text-xs text-rose-800">{simulation.reason}</div><p className="mt-2 text-xs leading-5 text-rose-900/70">AgentX refuses proactive outreach when the event cannot be joined to verified commerce data.</p></div>
          )}
        </div>
      </section>
    </div>
  );
}
