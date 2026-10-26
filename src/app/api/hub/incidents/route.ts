import { simulateCarrierDelay } from "@/lib/incidents";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { orderId?: string };
  const simulation = await simulateCarrierDelay(body.orderId ?? "A1001");
  return Response.json({ simulation }, { status: simulation.matched ? 200 : 404 });
}
