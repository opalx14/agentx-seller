import { runRedTeamSuite } from "@/lib/red-team";

export async function POST() {
  const results = await runRedTeamSuite();
  const passed = results.filter((result) => result.pass).length;
  return Response.json({ results, passed, total: results.length });
}
