import { connection } from "next/server";
import { Activity, Bot, Database, ShieldCheck } from "lucide-react";
import { getRuntimePolicy, listRuntimeConversations } from "@/lib/repository";
import { hasSupabasePersistence } from "@/lib/supabase-admin";

export const instant = false;

export default async function HubRuntimePage() {
  await connection();
  const [policy, conversations] = await Promise.all([getRuntimePolicy(), listRuntimeConversations()]);
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const supabaseConfigured = hasSupabasePersistence();
  const model = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="border-b border-slate-200 pb-6"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Environment</div><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Runtime</h1><p className="mt-2 text-sm leading-6 text-slate-500">Operational state only. No secret values are rendered to this page.</p></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><Bot className="size-4" /></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${geminiConfigured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{geminiConfigured ? "configured" : "fallback only"}</span></div><div className="mt-5 text-sm font-semibold">Gemini planner</div><div className="mt-1 break-all font-mono text-xs text-slate-400">{model}</div><p className="mt-3 text-xs leading-5 text-slate-500">If Gemini is unavailable, the deterministic fallback planner remains behind the same ownership and policy control plane.</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><Database className="size-4" /></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${supabaseConfigured ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{supabaseConfigured ? "COIN14 live" : "local fallback"}</span></div><div className="mt-5 text-sm font-semibold">Persistence</div><div className="mt-1 font-mono text-xs text-slate-400">agentx_* namespace</div><p className="mt-3 text-xs leading-5 text-slate-500">The service-role path is server-side only. When unavailable, the same repository contract uses in-memory demo state.</p></div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Activity className="size-4 text-slate-400" /><div className="mt-4 text-2xl font-semibold">{conversations.length}</div><div className="mt-1 text-xs text-slate-500">conversation threads</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><ShieldCheck className="size-4 text-amber-500" /><div className="mt-4 text-2xl font-semibold">{policy.autoRefundLimit.toLocaleString("vi-VN")}₫</div><div className="mt-1 text-xs text-slate-500">auto-refund threshold</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><ShieldCheck className="size-4 text-indigo-500" /><div className="mt-4 text-2xl font-semibold">{policy.returnWindowDays}d</div><div className="mt-1 text-xs text-slate-500">return window</div></div>
      </div>
    </div>
  );
}
