import { RedTeamLab } from "@/components/red-team-lab";

export default function HubRedTeamPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="border-b border-slate-200 pb-6">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">Adversarial verification</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Break AgentX</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Try the requests the agent should never be allowed to execute. The point is not whether the model behaves — it is whether the control plane remains authoritative.</p>
      </div>
      <div className="mt-6"><RedTeamLab /></div>
    </div>
  );
}
