import { getTelegramBotIdentity } from "@/platforms/telegram/api";
import { createTelegramDeepLink, getTelegramLinkForCustomer, issueTelegramLink } from "@/platforms/telegram/linking";
import { listRuntimeOrders } from "@/lib/repository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId")?.trim();
  if (!customerId) {
    return Response.json({ error: "CUSTOMER_ID_REQUIRED" }, { status: 400 });
  }

  const orders = await listRuntimeOrders();
  const customerOrders = orders.filter((order) => order.customerId === customerId);
  if (customerOrders.length === 0) {
    return Response.json({ error: "CUSTOMER_NOT_FOUND" }, { status: 404 });
  }

  const bot = await getTelegramBotIdentity();
  if (!bot.username) {
    return Response.json({ error: "TELEGRAM_BOT_USERNAME_UNAVAILABLE" }, { status: 503 });
  }

  const linked = await getTelegramLinkForCustomer(customerId);
  if (linked) return Response.redirect(`https://t.me/${bot.username}`, 302);

  const accountName = process.env.TELEGRAM_ACCOUNT_NAME?.trim() || "OpalX";
  const pending = await issueTelegramLink(customerId, accountName);
  const deepLink = createTelegramDeepLink(bot.username, pending.token);
  return Response.redirect(deepLink, 302);
}
