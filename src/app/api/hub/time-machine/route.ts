import { replayA1002Refund } from "@/lib/decision-replay";

export async function GET() {
  return Response.json({ replay: await replayA1002Refund() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { simulatedAutoRefundLimit?: number };
  try {
    const replay = await replayA1002Refund(body.simulatedAutoRefundLimit ?? 2_000_000);
    return Response.json({ replay });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "replay failed" }, { status: 422 });
  }
}
