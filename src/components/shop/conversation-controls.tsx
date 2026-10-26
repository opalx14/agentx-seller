"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, MessageSquareReply, RotateCcw, UserRoundCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ConversationStatus } from "@/lib/domain";

export function ConversationControls({ id, status }: { id: string; status: ConversationStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function act(action: "takeover" | "release" | "resolve" | "reply", payload?: { message?: string }) {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch(`/api/shop/conversations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, agentName: "Shop agent", ...payload }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Action failed");
      if (action === "reply") setMessage("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    await act("reply", { message: message.trim() });
  }

  if (status === "closed") {
    return <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">Conversation resolved</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status !== "human_active" ? (
          <button onClick={() => void act("takeover")} disabled={Boolean(busy)} className="inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 sm:flex-none">
            {busy === "takeover" ? <Loader2 className="size-4 animate-spin" /> : <UserRoundCheck className="size-4" />} Take over
          </button>
        ) : (
          <button onClick={() => void act("release")} disabled={Boolean(busy)} className="inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:flex-none">
            {busy === "release" ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Return to AI
          </button>
        )}
        <button onClick={() => void act("resolve")} disabled={Boolean(busy)} className="inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50 sm:flex-none">
          {busy === "resolve" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Resolve
        </button>
      </div>

      {status === "human_active" && (
        <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:flex-row">
          <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Reply to customer…" className="min-h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" aria-label="Human support reply" />
          <button disabled={Boolean(busy) || !message.trim()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40 sm:w-auto">
            {busy === "reply" ? <Loader2 className="size-3.5 animate-spin" /> : <MessageSquareReply className="size-3.5" />} Send
          </button>
        </form>
      )}

      {error && <div className="text-xs font-medium text-rose-600">{error}</div>}
    </div>
  );
}
