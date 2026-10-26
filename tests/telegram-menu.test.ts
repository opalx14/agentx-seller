import { describe, expect, test } from "bun:test";
import {
  languagePickerKeyboard,
  languagePickerText,
  localizeAgentReply,
  mainMenuKeyboard,
  mainMenuText,
  normalizeTelegramMessageForAgent,
  orderPickerKeyboard,
  orderPickerText,
  reasonPickerKeyboard,
  reasonPickerText,
  settingsText,
  wizardAgentMessage,
} from "@/platforms/telegram/menu";
import type { TelegramAccountLink } from "@/platforms/telegram/linking";
import { deterministicFallbackPlan } from "@/core/agent/runtime";

const link: TelegramAccountLink = {
  chatId: 1049527169,
  telegramUserId: 1049527169,
  customerId: "cus_001",
  accountName: "OpalX",
  linkedAt: "2026-10-22T12:00:00.000Z",
  language: "vi",
};

const summary = {
  customerName: "Nguyen Van A",
  orders: [{ id: "A1001", status: "shipped", totalAmount: 450000 }],
};

describe("Telegram multilingual menu", () => {
  test("offers Vietnamese, Hindi and English on first language selection", () => {
    expect(languagePickerText()).toContain("Chọn ngôn ngữ");
    expect(languagePickerText()).toContain("भाषा चुनें");
    const keyboard = languagePickerKeyboard();
    expect(keyboard.inline_keyboard.map((row) => row[0]?.callback_data)).toEqual(["lang:vi", "lang:hi", "lang:en"]);
  });

  test("renders compact localized menus and settings", () => {
    const viMenu = mainMenuText(link, summary, "vi");
    expect(viMenu).toContain("OpalX");
    expect(viMenu).toContain("Nguyen Van A");
    expect(viMenu).toContain("A1001");
    expect(mainMenuKeyboard("vi").inline_keyboard.flat().some((button) => button.text.includes("Cài đặt"))).toBe(true);

    expect(mainMenuKeyboard("hi").inline_keyboard.flat().some((button) => button.text.includes("सेटिंग्स"))).toBe(true);
    expect(mainMenuKeyboard("en").inline_keyboard.flat().some((button) => button.text.includes("Settings"))).toBe(true);
    expect(settingsText({ ...link, language: "hi" }, "hi")).toContain("हिन्दी");
  });

  test("renders button-driven order and reason wizards", () => {
    expect(orderPickerText("return", "vi")).toContain("Chọn đơn hàng");
    expect(orderPickerKeyboard("return", summary.orders, "vi").inline_keyboard[0]?.[0]?.callback_data).toBe("flow:return_order:A1001");
    expect(orderPickerKeyboard("shipping", summary.orders, "en").inline_keyboard[0]?.[0]?.callback_data).toBe("flow:shipping_order:A1001");

    expect(reasonPickerText("return", "A1001", "vi")).toContain("A1001");
    const returnReasons = reasonPickerKeyboard("return", "A1001", "vi").inline_keyboard.flat().map((button) => button.callback_data);
    expect(returnReasons).toContain("flow:return_reason:A1001:wrong_size");
    expect(returnReasons).toContain("flow:return_reason:A1001:no_longer_needed");

    const refundReasons = reasonPickerKeyboard("refund", "A1001", "en").inline_keyboard.flat().map((button) => button.callback_data);
    expect(refundReasons).toContain("flow:refund_reason:A1001:damaged_item");
    expect(wizardAgentMessage("shipping", "A1001")).toBe("Where is my order A1001?");
    expect(wizardAgentMessage("return", "A1001", "wrong_size")).toContain("Return A1001");
    expect(wizardAgentMessage("refund", "A1001", "damaged_item")).toContain("Refund A1001");

    expect(deterministicFallbackPlan(wizardAgentMessage("shipping", "A1001")).name).toBe("getShipment");
    expect(deterministicFallbackPlan(wizardAgentMessage("return", "A1001", "wrong_size")).name).toBe("createReturn");
    expect(deterministicFallbackPlan(wizardAgentMessage("refund", "A1001", "damaged_item")).name).toBe("requestRefund");
  });

  test("localizes common guarded AgentX replies without changing order facts", () => {
    const source = "Order A1001 is in transit with GHN. Estimated delivery: 2026-10-23.";
    const vi = localizeAgentReply(source, "vi");
    const hi = localizeAgentReply(source, "hi");
    expect(vi).toContain("A1001");
    expect(vi).toContain("đang vận chuyển");
    expect(vi).toContain("GHN");
    expect(vi).toContain("2026-10-23");
    expect(hi).toContain("A1001");
    expect(hi).toContain("GHN");
    expect(hi).toContain("2026-10-23");

    const returnDenied = localizeAgentReply("I can’t create that return automatically because: ORDER_NOT_DELIVERED. I can escalate this to a human agent.", "vi");
    expect(returnDenied).toContain("chưa được giao");
    const refundDenied = localizeAgentReply("The refund was not executed: DUPLICATE_REFUND.", "hi");
    expect(refundDenied).toContain("पहले ही");
  });

  test("normalizes common Hindi intents into the existing guarded AgentX core", () => {
    expect(normalizeTelegramMessageForAgent("मेरा A1001 कहाँ है?", "hi")).toBe("Where is my order A1001?");
    expect(normalizeTelegramMessageForAgent("A1001 का रिफंड चाहिए", "hi")).toBe("Refund A1001");
    expect(normalizeTelegramMessageForAgent("A1001 रिटर्न करना है", "hi")).toBe("Return A1001");
  });
});
