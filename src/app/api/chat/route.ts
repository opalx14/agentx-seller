import { processCustomerMessage } from "@/lib/agent";

export async function POST(request: Request) {
  const body = (await request.json()) as { message?: string; customerId?: string; locale?: "vi" | "en" | "hi" };
  const message = body.message?.trim();
  if (!message) return Response.json({ error: "message is required" }, { status: 400 });

  const result = await processCustomerMessage(message, {
    customerId: body.customerId,
    channel: "web",
    externalConversationId: body.customerId ? `web:${body.customerId}` : undefined,
    locale: body.locale,
  });
  return Response.json(result);
}
