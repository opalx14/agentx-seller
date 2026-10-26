import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cancelPendingTelegramLink,
  confirmTelegramLink,
  createTelegramDeepLink,
  getPendingTelegramLink,
  getTelegramLinkByChatId,
  getTelegramLinkForCustomer,
  issueTelegramLink,
  setTelegramLanguage,
} from "@/platforms/telegram/linking";

const temporaryDirs: string[] = [];

async function makeStateDir() {
  const directory = await mkdtemp(join(tmpdir(), "agentx-telegram-linking-"));
  temporaryDirs.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Telegram account linking", () => {
  test("issues an opaque one-time deep link and confirms the exact customer", async () => {
    const stateDir = await makeStateDir();
    const pending = await issueTelegramLink("cus_001", "OpalX", stateDir);

    expect(pending.token).not.toContain("cus_001");
    expect(pending.token.length).toBeLessThanOrEqual(64);
    expect(createTelegramDeepLink("agentx_seller_bot", pending.token)).toBe(
      `https://t.me/agentx_seller_bot?start=${pending.token}`,
    );
    expect((await getPendingTelegramLink(pending.token, stateDir))?.customerId).toBe("cus_001");

    const linked = await confirmTelegramLink(pending.token, 123456, 123456, stateDir);
    expect(linked.accountName).toBe("OpalX");
    expect(linked.customerId).toBe("cus_001");
    expect((await getTelegramLinkByChatId(123456, stateDir))?.customerId).toBe("cus_001");
    expect((await getTelegramLinkForCustomer("cus_001", stateDir))?.chatId).toBe(123456);
    expect(await getPendingTelegramLink(pending.token, stateDir)).toBeUndefined();
  });

  test("relinking preserves one chat per customer and one customer per chat", async () => {
    const stateDir = await makeStateDir();
    const first = await issueTelegramLink("cus_001", "OpalX", stateDir);
    await confirmTelegramLink(first.token, 111, 111, stateDir);

    const second = await issueTelegramLink("cus_001", "OpalX", stateDir);
    await confirmTelegramLink(second.token, 222, 222, stateDir);
    expect(await getTelegramLinkByChatId(111, stateDir)).toBeUndefined();
    expect((await getTelegramLinkByChatId(222, stateDir))?.customerId).toBe("cus_001");

    const third = await issueTelegramLink("cus_002", "OpalX", stateDir);
    await confirmTelegramLink(third.token, 222, 222, stateDir);
    expect(await getTelegramLinkForCustomer("cus_001", stateDir)).toBeUndefined();
    expect((await getTelegramLinkByChatId(222, stateDir))?.customerId).toBe("cus_002");
  });

  test("persists language preference on the linked Telegram chat", async () => {
    const stateDir = await makeStateDir();
    const pending = await issueTelegramLink("cus_001", "OpalX", stateDir);
    await confirmTelegramLink(pending.token, 444, 444, stateDir);

    expect((await getTelegramLinkByChatId(444, stateDir))?.language).toBeUndefined();
    const updated = await setTelegramLanguage(444, "hi", stateDir);
    expect(updated.language).toBe("hi");
    expect((await getTelegramLinkByChatId(444, stateDir))?.language).toBe("hi");
  });

  test("cancelled links cannot be confirmed", async () => {
    const stateDir = await makeStateDir();
    const pending = await issueTelegramLink("cus_003", "OpalX", stateDir);
    await cancelPendingTelegramLink(pending.token, stateDir);

    expect(await getPendingTelegramLink(pending.token, stateDir)).toBeUndefined();
    await expect(confirmTelegramLink(pending.token, 333, 333, stateDir)).rejects.toThrow("TELEGRAM_LINK_EXPIRED_OR_USED");
  });
});
