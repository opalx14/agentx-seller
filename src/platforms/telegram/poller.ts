import { processCustomerMessage } from "@/lib/agent";
import { listRuntimeOrders } from "@/lib/repository";
import {
  answerTelegramCallbackQuery,
  editTelegramMessageText,
  getTelegramBotIdentity,
  getTelegramUpdates,
  getTelegramWebhookInfo,
  sendTelegramText,
  type TelegramCallbackQuery,
  type TelegramMessage,
} from "@/platforms/telegram/api";
import {
  actionHintText,
  backKeyboard,
  languagePickerKeyboard,
  languagePickerText,
  languageSavedText,
  localizeAgentReply,
  mainMenuKeyboard,
  mainMenuText,
  normalizeTelegramMessageForAgent,
  orderPickerKeyboard,
  orderPickerText,
  ordersText,
  profileText,
  reasonPickerKeyboard,
  reasonPickerText,
  relinkHintText,
  settingsKeyboard,
  settingsText,
  wizardAgentMessage,
} from "@/platforms/telegram/menu";
import {
  cancelPendingTelegramLink,
  confirmTelegramLink,
  getPendingTelegramLink,
  getTelegramLinkByChatId,
  setTelegramLanguage,
  type PendingTelegramLink,
  type TelegramAccountLink,
  type TelegramLanguage,
} from "@/platforms/telegram/linking";

function parseStartToken(text: string) {
  const match = text.match(/^\/start(?:@[A-Za-z0-9_]+)?(?:\s+([A-Za-z0-9_-]+))?$/i);
  return match ? (match[1] ?? null) : undefined;
}

function parseLanguage(value: string): TelegramLanguage | undefined {
  return value === "vi" || value === "hi" || value === "en" ? value : undefined;
}

async function getCustomerSummary(customerId: string) {
  const orders = (await listRuntimeOrders()).filter((order) => order.customerId === customerId);
  const first = orders[0];
  return {
    customerName: first?.customerName ?? "Customer",
    orders: orders.map((order) => ({
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
    })),
  };
}

async function sendLanguagePicker(chatId: number) {
  await sendTelegramText(chatId, languagePickerText(), { replyMarkup: languagePickerKeyboard() });
}

async function showLanguagePicker(message: TelegramMessage) {
  await editTelegramMessageText(message.chat.id, message.message_id, languagePickerText(), {
    replyMarkup: languagePickerKeyboard(),
  });
}

async function sendMainMenu(chatId: number, link: TelegramAccountLink) {
  if (!link.language) {
    await sendLanguagePicker(chatId);
    return;
  }
  const summary = await getCustomerSummary(link.customerId);
  await sendTelegramText(chatId, mainMenuText(link, summary, link.language), {
    replyMarkup: mainMenuKeyboard(link.language),
  });
}

async function editMainMenu(message: TelegramMessage, link: TelegramAccountLink) {
  if (!link.language) {
    await showLanguagePicker(message);
    return;
  }
  const summary = await getCustomerSummary(link.customerId);
  await editTelegramMessageText(message.chat.id, message.message_id, mainMenuText(link, summary, link.language), {
    replyMarkup: mainMenuKeyboard(link.language),
  });
}

async function buildConfirmationText(pending: PendingTelegramLink) {
  const summary = await getCustomerSummary(pending.customerId);
  return [
    "🔗 CONNECT AGENTX",
    "",
    `👤 AgentX: ${pending.accountName}`,
    `🪪 Customer: ${summary.customerName}`,
    `📦 Access: ${summary.orders.map((order) => order.id).join(", ") || "—"}`,
    "",
    "Confirm this account?",
  ].join("\n");
}

async function handleStart(message: TelegramMessage, token: string | null) {
  if (!token) {
    const linked = await getTelegramLinkByChatId(message.chat.id);
    if (linked) {
      await sendMainMenu(message.chat.id, linked);
      return;
    }

    await sendTelegramText(message.chat.id, "🔒 AgentX is not linked yet.\nOpen AgentX Client → Connect Telegram.");
    return;
  }

  let pending: PendingTelegramLink | undefined;
  try {
    pending = await getPendingTelegramLink(token);
  } catch {
    pending = undefined;
  }

  if (!pending) {
    await sendTelegramText(message.chat.id, "⚠️ This link has expired or was already used. Create a new link from AgentX Client.");
    return;
  }

  await sendTelegramText(message.chat.id, await buildConfirmationText(pending), {
    replyMarkup: {
      inline_keyboard: [[
        { text: "✅ Confirm", callback_data: `link_confirm:${pending.token}` },
        { text: "❌ Cancel", callback_data: `link_cancel:${pending.token}` },
      ]],
    },
  });
}

async function requireLinked(query: TelegramCallbackQuery, message: TelegramMessage) {
  const linked = await getTelegramLinkByChatId(message.chat.id);
  if (!linked) {
    await answerTelegramCallbackQuery(query.id, "AgentX account is not linked.");
    await editTelegramMessageText(message.chat.id, message.message_id, "🔒 AgentX is not linked yet.\nOpen AgentX Client → Connect Telegram.");
    return undefined;
  }
  return linked;
}

async function handleMenuCallback(query: TelegramCallbackQuery, message: TelegramMessage, action: string) {
  const linked = await requireLinked(query, message);
  if (!linked) return;
  if (!linked.language) {
    await answerTelegramCallbackQuery(query.id);
    await showLanguagePicker(message);
    return;
  }

  const language = linked.language;
  const summary = await getCustomerSummary(linked.customerId);

  if (action === "home") {
    await answerTelegramCallbackQuery(query.id);
    await editMainMenu(message, linked);
    return;
  }

  if (action === "me") {
    await answerTelegramCallbackQuery(query.id);
    await editTelegramMessageText(message.chat.id, message.message_id, profileText(linked, summary, language), {
      replyMarkup: backKeyboard(language),
    });
    return;
  }

  if (action === "orders") {
    await answerTelegramCallbackQuery(query.id);
    await editTelegramMessageText(message.chat.id, message.message_id, ordersText(summary, language), {
      replyMarkup: backKeyboard(language),
    });
    return;
  }

  if (action === "shipping" || action === "refund" || action === "return") {
    await answerTelegramCallbackQuery(query.id);
    await editTelegramMessageText(message.chat.id, message.message_id, orderPickerText(action, language), {
      replyMarkup: orderPickerKeyboard(action, summary.orders, language),
    });
    return;
  }

  if (action === "support") {
    await answerTelegramCallbackQuery(query.id);
    await editTelegramMessageText(message.chat.id, message.message_id, actionHintText("support", language), {
      replyMarkup: backKeyboard(language),
    });
    return;
  }

  if (action === "settings") {
    await answerTelegramCallbackQuery(query.id);
    await editTelegramMessageText(message.chat.id, message.message_id, settingsText(linked, language), {
      replyMarkup: settingsKeyboard(language),
    });
  }
}

async function handleFlowCallback(query: TelegramCallbackQuery, message: TelegramMessage, value: string) {
  const linked = await requireLinked(query, message);
  if (!linked) return;
  if (!linked.language) {
    await answerTelegramCallbackQuery(query.id);
    await showLanguagePicker(message);
    return;
  }

  const language = linked.language;
  const summary = await getCustomerSummary(linked.customerId);
  const [step, rawOrderId, reason] = value.split(":");
  const orderId = rawOrderId?.trim().toUpperCase();
  const ownedOrder = orderId && summary.orders.some((order) => order.id === orderId);
  if (!ownedOrder) {
    await answerTelegramCallbackQuery(query.id, language === "vi" ? "Đơn hàng không thuộc tài khoản này." : language === "hi" ? "यह ऑर्डर इस अकाउंट का नहीं है।" : "This order is not available for this account.");
    return;
  }

  if (step === "return_order" || step === "refund_order") {
    const action = step === "return_order" ? "return" : "refund";
    await answerTelegramCallbackQuery(query.id);
    await editTelegramMessageText(message.chat.id, message.message_id, reasonPickerText(action, orderId, language), {
      replyMarkup: reasonPickerKeyboard(action, orderId, language),
    });
    return;
  }

  const action = step === "shipping_order"
    ? "shipping"
    : step === "return_reason"
      ? "return"
      : step === "refund_reason"
        ? "refund"
        : undefined;
  if (!action) return;

  await answerTelegramCallbackQuery(query.id);
  const agentMessage = wizardAgentMessage(action, orderId, reason);
  const result = await processCustomerMessage(agentMessage, {
    customerId: linked.customerId,
    channel: "telegram",
    externalConversationId: `telegram:${message.chat.id}`,
    externalMessageId: `telegram:callback:${query.id}`,
    locale: language,
  });
  const reply = localizeAgentReply(result.reply, language);
  await editTelegramMessageText(message.chat.id, message.message_id, reply, {
    replyMarkup: backKeyboard(language),
  });
  console.log(`[telegram] wizard action=${action} order=${orderId} customer=${linked.customerId}`);
}

async function handleSettingsCallback(query: TelegramCallbackQuery, message: TelegramMessage, action: string) {
  const linked = await requireLinked(query, message);
  if (!linked) return;
  const language = linked.language ?? "en";

  if (action === "language") {
    await answerTelegramCallbackQuery(query.id);
    await showLanguagePicker(message);
    return;
  }

  if (action === "relink") {
    await answerTelegramCallbackQuery(query.id);
    await editTelegramMessageText(message.chat.id, message.message_id, relinkHintText(language), {
      replyMarkup: backKeyboard(language),
    });
  }
}

async function handleCallback(query: TelegramCallbackQuery) {
  const message = query.message;
  const data = query.data;
  if (!message || message.chat.type !== "private" || !data) return;

  if (query.from.id !== message.chat.id) {
    await answerTelegramCallbackQuery(query.id, "Only the private chat owner can use this action.");
    return;
  }

  const separator = data.indexOf(":");
  if (separator < 0) return;
  const action = data.slice(0, separator);
  const value = data.slice(separator + 1);

  if (action === "link_cancel") {
    try {
      await cancelPendingTelegramLink(value);
    } catch {
      // Malformed and expired links are safe to treat as cancelled.
    }
    await answerTelegramCallbackQuery(query.id, "Cancelled.");
    await editTelegramMessageText(message.chat.id, message.message_id, "❌ AgentX connection cancelled.");
    return;
  }

  if (action === "link_confirm") {
    try {
      const linked = await confirmTelegramLink(value, message.chat.id, query.from.id);
      await answerTelegramCallbackQuery(query.id, "Connected.");
      await showLanguagePicker(message);
      console.log(`[telegram] linked chat=${message.chat.id} customer=${linked.customerId} account=${linked.accountName}`);
    } catch {
      await answerTelegramCallbackQuery(query.id, "Link expired or already used.");
      await editTelegramMessageText(message.chat.id, message.message_id, "⚠️ This link has expired. Create a new link from AgentX Client.");
    }
    return;
  }

  if (action === "lang") {
    const language = parseLanguage(value);
    if (!language) return;
    try {
      const linked = await setTelegramLanguage(message.chat.id, language);
      const summary = await getCustomerSummary(linked.customerId);
      await answerTelegramCallbackQuery(query.id, languageSavedText(language));
      await editTelegramMessageText(message.chat.id, message.message_id, mainMenuText(linked, summary, language), {
        replyMarkup: mainMenuKeyboard(language),
      });
      console.log(`[telegram] language chat=${message.chat.id} language=${language}`);
    } catch {
      await answerTelegramCallbackQuery(query.id, "AgentX account is not linked.");
    }
    return;
  }

  if (action === "menu") {
    await handleMenuCallback(query, message, value);
    return;
  }

  if (action === "flow") {
    await handleFlowCallback(query, message, value);
    return;
  }

  if (action === "settings") {
    await handleSettingsCallback(query, message, value);
  }
}

async function handleCommand(message: TelegramMessage, linked: TelegramAccountLink, text: string) {
  if (text === "/language") {
    await sendLanguagePicker(message.chat.id);
    return true;
  }

  if (!linked.language) {
    await sendLanguagePicker(message.chat.id);
    return true;
  }

  const summary = await getCustomerSummary(linked.customerId);
  if (text === "/menu") {
    await sendTelegramText(message.chat.id, mainMenuText(linked, summary, linked.language), {
      replyMarkup: mainMenuKeyboard(linked.language),
    });
    return true;
  }
  if (text === "/me") {
    await sendTelegramText(message.chat.id, profileText(linked, summary, linked.language), {
      replyMarkup: backKeyboard(linked.language),
    });
    return true;
  }
  if (text === "/settings") {
    await sendTelegramText(message.chat.id, settingsText(linked, linked.language), {
      replyMarkup: settingsKeyboard(linked.language),
    });
    return true;
  }
  return false;
}

async function handleMessage(message: TelegramMessage) {
  const text = message.text?.trim();
  if (!text || message.from?.is_bot || message.chat.type !== "private") return;

  const startToken = parseStartToken(text);
  if (startToken !== undefined) {
    await handleStart(message, startToken);
    return;
  }

  const linked = await getTelegramLinkByChatId(message.chat.id);
  if (!linked) {
    await sendTelegramText(message.chat.id, "🔒 AgentX is not linked yet.\nOpen AgentX Client → Connect Telegram.");
    return;
  }

  if (await handleCommand(message, linked, text.toLowerCase())) return;
  if (!linked.language) {
    await sendLanguagePicker(message.chat.id);
    return;
  }

  try {
    console.log(`[telegram] inbound chat=${message.chat.id} customer=${linked.customerId} language=${linked.language} message=${message.message_id}`);
    const normalizedMessage = normalizeTelegramMessageForAgent(text, linked.language);
    const result = await processCustomerMessage(normalizedMessage, {
      customerId: linked.customerId,
      channel: "telegram",
      externalConversationId: `telegram:${message.chat.id}`,
      externalMessageId: `telegram:${message.message_id}`,
      locale: linked.language,
    });
    const reply = localizeAgentReply(result.reply, linked.language);
    const outbound = await sendTelegramText(message.chat.id, reply, {
      replyMarkup: backKeyboard(linked.language),
    });
    console.log(`[telegram] outbound message=${outbound.messageId}`);
  } catch (error) {
    console.error(`[telegram] processing failed: ${error instanceof Error ? error.message : "unknown error"}`);
    try {
      const fallback = linked.language === "vi"
        ? "⚠️ Hiện chưa thể xử lý yêu cầu này. Hãy thử lại hoặc dùng AgentX web."
        : linked.language === "hi"
          ? "⚠️ अभी यह अनुरोध पूरा नहीं हो सका। कृपया फिर कोशिश करें या AgentX web का उपयोग करें।"
          : "⚠️ I can’t process that request right now. Please try again or use AgentX web.";
      await sendTelegramText(message.chat.id, fallback, { replyMarkup: backKeyboard(linked.language) });
    } catch {
      console.error("[telegram] fallback reply also failed");
    }
  }
}

export async function runTelegramPoller() {
  let nextOffset: number | undefined;
  let running = true;
  const stop = () => { running = false; };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  try {
    const bot = await getTelegramBotIdentity();
    const webhook = await getTelegramWebhookInfo();

    if (webhook.url) {
      throw new Error("Telegram polling cannot start while a webhook URL is configured for this bot");
    }

    console.log(`[telegram] bot @${bot.username ?? bot.id} is reachable`);
    console.log("[telegram] account linking + language selection required before private commerce access");

    while (running) {
      let updates;
      try {
        updates = await getTelegramUpdates(nextOffset, 20);
      } catch (error) {
        console.error(`[telegram] poll failed: ${error instanceof Error ? error.message : "unknown error"}`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }

      for (const update of updates) {
        nextOffset = update.update_id + 1;
        try {
          if (update.callback_query) await handleCallback(update.callback_query);
          if (update.message) await handleMessage(update.message);
        } catch (error) {
          console.error(`[telegram] update ${update.update_id} failed: ${error instanceof Error ? error.message : "unknown error"}`);
        }
      }
    }
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }

  console.log("[telegram] polling stopped");
}
