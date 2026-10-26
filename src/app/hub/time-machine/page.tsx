import { DecisionTimeMachine } from "@/components/decision-time-machine";
import { replayA1002Refund } from "@/lib/decision-replay";

export default async function HubTimeMachinePage() {
  const initial = await replayA1002Refund();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="border-b border-slate-200 pb-6">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600">Counterfactual control</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Decision Time Machine</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Freeze the verified request and AI proposal, then replay the exact decision under a different seller policy. Nothing is executed.</p>
      </div>
      <div className="mt-6"><DecisionTimeMachine initial={initial} /></div>
    </div>
  );
}
