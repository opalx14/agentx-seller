import { IncidentSimulator } from "@/components/incident-simulator";
import { simulateCarrierDelay } from "@/lib/incidents";

export default async function HubIncidentsPage() {
  const initial = await simulateCarrierDelay("A1001");

  return (
    <div className="mx-auto max-w-7xl">
      <div className="border-b border-slate-200 pb-6">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600">Event-driven autonomy</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Proactive Incident Agent</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Instead of waiting for a customer complaint, simulate a carrier event and let AgentX identify the verified customer who would need proactive support.</p>
      </div>
      <div className="mt-6"><IncidentSimulator initial={initial} /></div>
    </div>
  );
}
