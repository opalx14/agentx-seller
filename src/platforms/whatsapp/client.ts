export type WhatsAppSendResult =
  | { sent: true; messageId?: string }
  | { sent: false; reason: string };

export async function sendWhatsAppText(to: string, text: string): Promise<WhatsAppSendResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION;

  if (!accessToken || !phoneNumberId || !graphVersion) {
    return { sent: false, reason: "WHATSAPP_OUTBOUND_NOT_CONFIGURED" };
  }

  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  });

  if (!response.ok) {
    return { sent: false, reason: `WHATSAPP_HTTP_${response.status}` };
  }

  const payload = await response.json() as { messages?: Array<{ id?: string }> };
  return { sent: true, messageId: payload.messages?.[0]?.id };
}
