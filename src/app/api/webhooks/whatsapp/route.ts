import { handleWhatsAppWebhook, verifyWhatsAppWebhook } from "@/platforms/whatsapp/webhook";

export const GET = verifyWhatsAppWebhook;
export const POST = handleWhatsAppWebhook;
