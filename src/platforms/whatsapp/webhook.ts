import { processCustomerMessage } from "@/lib/agent";
import { addAudit } from "@/lib/mock-store";
import { findRuntimeCustomerByPhone, hasRuntimeExternalMessage } from "@/lib/repository";
import { sendWhatsAppText } from "@/platforms/whatsapp/client";

export async function verifyWhatsAppWebhook(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge);
  }
  return new Response("Forbidden", { status: 403 });
}

export async function handleWhatsAppWebhook(request: Request) {
  const payload = await request.json() as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            id?: string;
            from?: string;
            type?: string;
            text?: { body?: string };
          }>;
        };
      }>;
    }>;
  };

  const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const text = message?.type === "text" ? message.text?.body?.trim() : undefined;
  if (!message?.from || !text) return Response.json({ ok: true, ignored: true });

  if (message.id && await hasRuntimeExternalMessage(message.id)) {
    return Response.json({ ok: true, duplicate: true });
  }

  const normalizedPhone = message.from.startsWith("+") ? message.from : `+${message.from}`;
  const customer = await findRuntimeCustomerByPhone(normalizedPhone);
  const result = await processCustomerMessage(text, {
    customerId: customer?.id,
    customerPhone: normalizedPhone,
    channel: "whatsapp",
    externalConversationId: `whatsapp:${message.from}`,
    externalMessageId: message.id,
  });

  const outbound = await sendWhatsAppText(message.from, result.reply);
  if (outbound.sent) {
    addAudit("message_sent", `WhatsApp reply sent${outbound.messageId ? ` (${outbound.messageId})` : ""}.`, "success", "whatsapp");
  } else if (outbound.reason !== "WHATSAPP_OUTBOUND_NOT_CONFIGURED") {
    addAudit("message_send_error", `WhatsApp reply failed: ${outbound.reason}.`, "error", "whatsapp");
  }

  return Response.json({
    ok: true,
    from: message.from,
    customerVerified: Boolean(customer),
    outbound,
    result,
  });
}
