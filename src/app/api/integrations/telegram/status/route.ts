import { getTelegramBotIdentity } from "@/platforms/telegram/api";
import { getTelegramLinkForCustomer } from "@/platforms/telegram/linking";
import { listRuntimeOrders } from "@/lib/repository";

export async function GET(request: Request) {
  const customerId = new URL(request.url).searchParams.get("customerId")?.trim();
  if (!customerId) return Response.json({ error: "CUSTOMER_ID_REQUIRED" }, { status: 400 });

  const orders = await listRuntimeOrders();
  if (!orders.some((order) => order.customerId === customerId)) {
    return Response.json({ error: "CUSTOMER_NOT_FOUND" }, { status: 404 });
  }

  const linked = await getTelegramLinkForCustomer(customerId);
  let botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "") || "";
  if (!botUsername) {
    try {
      botUsername = (await getTelegramBotIdentity()).username ?? "";
    } catch {
      botUsername = "";
    }
  }

  return Response.json({
    connected: Boolean(linked),
    botUsername: botUsername || null,
    telegramUrl: linked && botUsername ? `https://t.me/${botUsername}` : null,
    connectUrl: linked ? null : `/api/integrations/telegram/link?customerId=${encodeURIComponent(customerId)}`,
    language: linked?.language ?? null,
  });
}
