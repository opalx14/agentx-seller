type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export type TelegramBotIdentity = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
};

export type TelegramWebhookInfo = {
  url: string;
  pending_update_count: number;
  last_error_message?: string;
};

export type TelegramMessage = {
  message_id: number;
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  text?: string;
};

export type TelegramCallbackQuery = {
  id: string;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  message?: TelegramMessage;
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type TelegramInlineKeyboardMarkup = {
  inline_keyboard: Array<Array<{
    text: string;
    callback_data?: string;
    url?: string;
  }>>;
};

function getToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return token;
}

async function callTelegram<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const token = getToken();
  let response: Response;

  try {
    response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Telegram ${method} network request failed`);
  }

  let payload: TelegramApiResponse<T>;
  try {
    payload = await response.json() as TelegramApiResponse<T>;
  } catch {
    throw new Error(`Telegram ${method} returned a non-JSON response (${response.status})`);
  }

  if (!response.ok || !payload.ok || payload.result === undefined) {
    throw new Error(`Telegram ${method} failed: ${payload.description ?? `HTTP ${response.status}`}`);
  }

  return payload.result;
}

export function getTelegramBotIdentity() {
  return callTelegram<TelegramBotIdentity>("getMe");
}

export function getTelegramWebhookInfo() {
  return callTelegram<TelegramWebhookInfo>("getWebhookInfo");
}

export function getTelegramUpdates(offset?: number, timeoutSeconds = 20) {
  return callTelegram<TelegramUpdate[]>("getUpdates", {
    ...(offset === undefined ? {} : { offset }),
    timeout: timeoutSeconds,
    allowed_updates: ["message", "callback_query"],
  });
}

export async function sendTelegramText(
  chatId: number,
  text: string,
  options: { replyMarkup?: TelegramInlineKeyboardMarkup } = {},
) {
  const result = await callTelegram<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text,
    link_preview_options: { is_disabled: true },
    ...(options.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
  });
  return { sent: true as const, messageId: result.message_id };
}

export async function answerTelegramCallbackQuery(callbackQueryId: string, text?: string) {
  await callTelegram<boolean>("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

export async function editTelegramMessageText(
  chatId: number,
  messageId: number,
  text: string,
  options: { replyMarkup?: TelegramInlineKeyboardMarkup } = {},
) {
  await callTelegram<TelegramMessage | boolean>("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    link_preview_options: { is_disabled: true },
    reply_markup: options.replyMarkup ?? { inline_keyboard: [] },
  });
}
