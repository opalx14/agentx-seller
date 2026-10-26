"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";

export function ApprovalActions({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "approved" | "rejected" | "error">("idle");

  async function act(action: "approve" | "reject") {
    setState("loading");
    const response = await fetch(`/api/approvals/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (response.ok) {
      setState(action === "approve" ? "approved" : "rejected");
      window.dispatchEvent(new Event("agentx:tour:approval-resolved"));
      router.refresh();
    } else {
      setState("error");
    }
  }

  if (state === "approved") {
    return <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center text-xs font-semibold text-emerald-700">Approved · refund processed</div>;
  }
  if (state === "rejected") {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-center text-xs font-semibold text-rose-700">Refund rejected</div>;
  }
  if (state === "error") {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-center text-xs font-semibold text-rose-700">Action failed · try again</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      <button
        type="button"
        disabled={state === "loading"}
        onClick={() => act("reject")}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
      >
        <X className="size-3.5" /> Reject
      </button>
      <button
        type="button"
        disabled={state === "loading"}
        onClick={() => act("approve")}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-semibold text-white shadow-md shadow-slate-950/10 transition hover:bg-slate-800 disabled:opacity-50"
      >
        {state === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Approve
      </button>
    </div>
  );
}
