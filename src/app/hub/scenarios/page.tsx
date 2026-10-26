import { ScenarioRunner } from "@/components/scenario-runner";

export default function HubScenariosPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="border-b border-slate-200 pb-6"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Verification</div><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Scenario runner</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Validate the safety invariants that matter to the product without depending on a channel integration or mutating customer business state.</p></div>
      <div className="mt-6"><ScenarioRunner /></div>
    </div>
  );
}
