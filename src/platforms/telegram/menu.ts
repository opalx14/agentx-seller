import type { TelegramInlineKeyboardMarkup } from "@/platforms/telegram/api";
import type { TelegramAccountLink, TelegramLanguage } from "@/platforms/telegram/linking";
import { localizeAgentReply as localizeSupportReply } from "@/features/support/localize-reply";

type CustomerSummary = {
  customerName: string;
  orders: Array<{ id: string; status: string; totalAmount: number }>;
};

const copy = {
  vi: {
    chooseLanguage: "🌐 Chọn ngôn ngữ",
    languageSaved: "✅ Đã chọn Tiếng Việt",
    connected: "🟢 AgentX đã kết nối",
    account: "Tài khoản",
    customer: "Khách hàng",
    latestOrder: "Đơn gần nhất",
    ask: "Bạn cần hỗ trợ gì?",
    me: "👤 Tôi",
    orders: "📦 Đơn hàng",
    shipping: "🚚 Vận chuyển",
    return: "↩️ Trả hàng",
    refund: "💰 Hoàn tiền",
    support: "💬 Hỏi AgentX",
    settings: "⚙️ Cài đặt",
    back: "⬅️ Menu",
    language: "🌐 Ngôn ngữ",
    relink: "🔗 Kết nối lại",
    linked: "Đã liên kết",
    noOrders: "Chưa có đơn hàng",
    profileTitle: "👤 THÔNG TIN CỦA TÔI",
    ordersTitle: "📦 ĐƠN HÀNG",
    shippingTitle: "🚚 VẬN CHUYỂN",
    refundTitle: "💰 HOÀN TIỀN",
    returnTitle: "↩️ TRẢ HÀNG",
    supportTitle: "💬 HỎI AGENTX",
    settingsTitle: "⚙️ CÀI ĐẶT",
    chooseOrder: "Chọn đơn hàng",
    chooseReason: "Chọn lý do",
    wrongSize: "Sai kích cỡ",
    noLongerNeeded: "Không còn nhu cầu",
    otherReason: "Lý do khác",
    damagedItem: "Hàng bị hỏng",
    missingItem: "Thiếu hàng",
    typeSupport: "Gửi câu hỏi của bạn. AgentX sẽ dùng đúng tài khoản đã liên kết để kiểm tra.",
    relinkHint: "Để đổi tài khoản, quay lại AgentX Client và bấm Connect / relink Telegram.",
  },
  hi: {
    chooseLanguage: "🌐 भाषा चुनें",
    languageSaved: "✅ हिन्दी चुनी गई",
    connected: "🟢 AgentX कनेक्ट है",
    account: "अकाउंट",
    customer: "ग्राहक",
    latestOrder: "नवीनतम ऑर्डर",
    ask: "आपको किस चीज़ में मदद चाहिए?",
    me: "👤 मैं",
    orders: "📦 ऑर्डर",
    shipping: "🚚 डिलीवरी",
    return: "↩️ रिटर्न",
    refund: "💰 रिफंड",
    support: "💬 AgentX से पूछें",
    settings: "⚙️ सेटिंग्स",
    back: "⬅️ मेनू",
    language: "🌐 भाषा",
    relink: "🔗 अकाउंट बदलें",
    linked: "कनेक्टेड",
    noOrders: "कोई ऑर्डर नहीं",
    profileTitle: "👤 मेरी जानकारी",
    ordersTitle: "📦 ऑर्डर",
    shippingTitle: "🚚 डिलीवरी",
    refundTitle: "💰 रिफंड",
    returnTitle: "↩️ रिटर्न",
    supportTitle: "💬 AGENTX से पूछें",
    settingsTitle: "⚙️ सेटिंग्स",
    chooseOrder: "ऑर्डर चुनें",
    chooseReason: "कारण चुनें",
    wrongSize: "गलत साइज़",
    noLongerNeeded: "अब ज़रूरत नहीं",
    otherReason: "अन्य कारण",
    damagedItem: "सामान क्षतिग्रस्त है",
    missingItem: "सामान गायब है",
    typeSupport: "अपना सवाल भेजें। AgentX केवल आपके लिंक किए गए अकाउंट का डेटा उपयोग करेगा।",
    relinkHint: "अकाउंट बदलने के लिए AgentX Client में Connect / relink Telegram चुनें।",
  },
  en: {
    chooseLanguage: "🌐 Choose your language",
    languageSaved: "✅ English selected",
    connected: "🟢 AgentX connected",
    account: "Account",
    customer: "Customer",
    latestOrder: "Latest order",
    ask: "How can we help?",
    me: "👤 Me",
    orders: "📦 Orders",
    shipping: "🚚 Shipping",
    return: "↩️ Return",
    refund: "💰 Refund",
    support: "💬 Ask AgentX",
    settings: "⚙️ Settings",
    back: "⬅️ Menu",
    language: "🌐 Language",
    relink: "🔗 Relink account",
    linked: "Linked",
    noOrders: "No orders",
    profileTitle: "👤 MY ACCOUNT",
    ordersTitle: "📦 ORDERS",
    shippingTitle: "🚚 SHIPPING",
    refundTitle: "💰 REFUND",
    returnTitle: "↩️ RETURN",
    supportTitle: "💬 ASK AGENTX",
    settingsTitle: "⚙️ SETTINGS",
    chooseOrder: "Choose an order",
    chooseReason: "Choose a reason",
    wrongSize: "Wrong size",
    noLongerNeeded: "No longer needed",
    otherReason: "Other reason",
    damagedItem: "Item damaged",
    missingItem: "Item missing",
    typeSupport: "Send your question. AgentX will only use the customer account linked to this chat.",
    relinkHint: "To change account, return to AgentX Client and choose Connect / relink Telegram.",
  },
} as const;

export function languagePickerText() {
  return ["🌐 Choose your language", "Chọn ngôn ngữ", "भाषा चुनें"].join("\n");
}

export function languagePickerKeyboard(): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "🇻🇳 Tiếng Việt", callback_data: "lang:vi" }],
      [{ text: "🇮🇳 हिन्दी", callback_data: "lang:hi" }],
      [{ text: "🇬🇧 English", callback_data: "lang:en" }],
    ],
  };
}

export function mainMenuKeyboard(language: TelegramLanguage): TelegramInlineKeyboardMarkup {
  const t = copy[language];
  return {
    inline_keyboard: [
      [{ text: t.me, callback_data: "menu:me" }],
      [
        { text: t.orders, callback_data: "menu:orders" },
        { text: t.shipping, callback_data: "menu:shipping" },
      ],
      [
        { text: t.return, callback_data: "menu:return" },
        { text: t.refund, callback_data: "menu:refund" },
      ],
      [{ text: t.support, callback_data: "menu:support" }],
      [{ text: t.settings, callback_data: "menu:settings" }],
    ],
  };
}

export function backKeyboard(language: TelegramLanguage): TelegramInlineKeyboardMarkup {
  return { inline_keyboard: [[{ text: copy[language].back, callback_data: "menu:home" }]] };
}

export function settingsKeyboard(language: TelegramLanguage): TelegramInlineKeyboardMarkup {
  const t = copy[language];
  return {
    inline_keyboard: [
      [{ text: t.language, callback_data: "settings:language" }],
      [{ text: t.relink, callback_data: "settings:relink" }],
      [{ text: t.back, callback_data: "menu:home" }],
    ],
  };
}

export function mainMenuText(link: TelegramAccountLink, summary: CustomerSummary, language: TelegramLanguage) {
  const t = copy[language];
  return [
    "🤖 AgentX Seller",
    "",
    `✅ ${t.connected}`,
    `👤 ${t.account}: ${link.accountName}`,
    `🪪 ${t.customer}: ${summary.customerName}`,
    `📦 ${t.latestOrder}: ${summary.orders[0]?.id ?? "—"}`,
    "",
    t.ask,
  ].join("\n");
}

export function profileText(link: TelegramAccountLink, summary: CustomerSummary, language: TelegramLanguage) {
  const t = copy[language];
  return [
    t.profileTitle,
    "",
    `✅ Telegram: ${t.linked}`,
    `👤 AgentX: ${link.accountName}`,
    `🪪 ${t.customer}: ${summary.customerName}`,
    `📦 ${t.orders}: ${summary.orders.map((order) => order.id).join(", ") || t.noOrders}`,
  ].join("\n");
}

export function ordersText(summary: CustomerSummary, language: TelegramLanguage) {
  const t = copy[language];
  if (!summary.orders.length) return `${t.ordersTitle}\n\n${t.noOrders}`;
  return [
    t.ordersTitle,
    "",
    ...summary.orders.map((order) => `${order.id} · ${order.status} · ${order.totalAmount.toLocaleString("vi-VN")}₫`),
  ].join("\n");
}

type WizardAction = "shipping" | "return" | "refund";
type WizardReasonAction = Exclude<WizardAction, "shipping">;

export function orderPickerText(action: WizardAction, language: TelegramLanguage) {
  const t = copy[language];
  const title = action === "shipping" ? t.shippingTitle : action === "return" ? t.returnTitle : t.refundTitle;
  return `${title}\n\n${t.chooseOrder}`;
}

export function orderPickerKeyboard(
  action: WizardAction,
  orders: Array<{ id: string }>,
  language: TelegramLanguage,
): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...orders.map((order) => [{ text: `📦 ${order.id}`, callback_data: `flow:${action}_order:${order.id}` }]),
      [{ text: copy[language].back, callback_data: "menu:home" }],
    ],
  };
}

export function reasonPickerText(action: WizardReasonAction, orderId: string, language: TelegramLanguage) {
  const t = copy[language];
  const title = action === "return" ? t.returnTitle : t.refundTitle;
  return `${title}\n\n📦 ${orderId}\n${t.chooseReason}`;
}

export function reasonPickerKeyboard(
  action: WizardReasonAction,
  orderId: string,
  language: TelegramLanguage,
): TelegramInlineKeyboardMarkup {
  const t = copy[language];
  const reasons = action === "return"
    ? [
        [t.wrongSize, "wrong_size"],
        [t.noLongerNeeded, "no_longer_needed"],
        [t.otherReason, "customer_request"],
      ]
    : [
        [t.damagedItem, "damaged_item"],
        [t.missingItem, "missing_item"],
        [t.otherReason, "customer_request"],
      ];
  return {
    inline_keyboard: [
      ...reasons.map(([label, reason]) => [{ text: label, callback_data: `flow:${action}_reason:${orderId}:${reason}` }]),
      [{ text: copy[language].back, callback_data: `menu:${action}` }],
    ],
  };
}

export function wizardAgentMessage(action: WizardAction, orderId: string, reason?: string) {
  if (action === "shipping") return `Where is my order ${orderId}?`;
  if (action === "return") {
    if (reason === "wrong_size") return `Return ${orderId} because the size is wrong.`;
    if (reason === "no_longer_needed") return `Return ${orderId} because I no longer need it.`;
    return `Return ${orderId} because the customer requested a return.`;
  }
  if (reason === "damaged_item") return `Refund ${orderId} because the item is damaged.`;
  if (reason === "missing_item") return `Refund ${orderId} because the item is missing.`;
  return `Refund ${orderId} because the customer requested a refund.`;
}

export function actionHintText(action: "support", language: TelegramLanguage) {
  const t = copy[language];
  return `${t.supportTitle}\n\n${t.typeSupport}`;
}

export function settingsText(link: TelegramAccountLink, language: TelegramLanguage) {
  const t = copy[language];
  const languageLabel = language === "vi" ? "Tiếng Việt" : language === "hi" ? "हिन्दी" : "English";
  return [
    t.settingsTitle,
    "",
    `🌐 ${t.language}: ${languageLabel}`,
    `🔗 Telegram: ${t.linked}`,
    `👤 AgentX: ${link.accountName}`,
  ].join("\n");
}

export function relinkHintText(language: TelegramLanguage) {
  return copy[language].relinkHint;
}

export function languageSavedText(language: TelegramLanguage) {
  return copy[language].languageSaved;
}

export function localizeAgentReply(reply: string, language: TelegramLanguage) {
  return localizeSupportReply(reply, language);
}

export function normalizeTelegramMessageForAgent(message: string, language: TelegramLanguage) {
  if (language !== "hi") return message;
  const lower = message.toLowerCase();
  const orderId = message.toUpperCase().match(/A\d{4}/)?.[0] ?? "";
  if (/रिफंड|पैसे वापस|वापसी/.test(lower)) return `Refund ${orderId}`.trim();
  if (/रिटर्न|वापस करना|वापस भेज/.test(lower)) return `Return ${orderId}`.trim();
  if (/कहाँ|डिलीवरी|शिपिंग|ट्रैकिंग|कब/.test(lower)) return `Where is my order ${orderId}?`.trim();
  if (/इंसान|मानव|एजेंट/.test(lower)) return "I want to talk to a human agent.";
  return message;
}
