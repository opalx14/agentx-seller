import { addAudit } from "@/lib/mock-store";
import { runScenarioSuite } from "@/lib/scenarios";

export async function POST() {
  const results = await runScenarioSuite();
  const passed = results.filter((result) => result.pass).length;
  addAudit("scenario_suite_run", `${passed}/${results.length} read-only safety scenarios passed.`, passed === results.length ? "success" : "warning", "scenarioRunner");
  return Response.json({ results, passed, total: results.length });
}
