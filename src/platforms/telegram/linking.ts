import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const LINK_TTL_MS = 10 * 60 * 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;

export type PendingTelegramLink = {
  token: string;
  customerId: string;
  accountName: string;
  createdAt: string;
  expiresAt: string;
};

export type TelegramLanguage = "vi" | "hi" | "en";

export type TelegramAccountLink = {
  chatId: number;
  telegramUserId: number;
  customerId: string;
  accountName: string;
  linkedAt: string;
  language?: TelegramLanguage;
};

function getStateRoot(stateDir?: string) {
  return stateDir ?? join(process.cwd(), ".agentx", "telegram");
}

function pendingDir(stateDir?: string) {
  return join(getStateRoot(stateDir), "pending");
}

function linksDir(stateDir?: string) {
  return join(getStateRoot(stateDir), "links");
}

async function ensureStateDirs(stateDir?: string) {
  await Promise.all([
    mkdir(pendingDir(stateDir), { recursive: true }),
    mkdir(linksDir(stateDir), { recursive: true }),
  ]);
}

async function writeJsonAtomic(path: string, value: unknown) {
  const temporaryPath = `${path}.tmp-${randomUUID()}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, path);
}

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function validateToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) throw new Error("INVALID_TELEGRAM_LINK_TOKEN");
}

function validateChatId(chatId: number) {
  if (!Number.isSafeInteger(chatId)) throw new Error("INVALID_TELEGRAM_CHAT_ID");
}

export async function issueTelegramLink(
  customerId: string,
  accountName: string,
  stateDir?: string,
): Promise<PendingTelegramLink> {
  const normalizedCustomerId = customerId.trim();
  const normalizedAccountName = accountName.trim();
  if (!normalizedCustomerId) throw new Error("CUSTOMER_ID_REQUIRED");
  if (!normalizedAccountName) throw new Error("ACCOUNT_NAME_REQUIRED");

  await ensureStateDirs(stateDir);
  const token = randomBytes(24).toString("base64url");
  const now = Date.now();
  const pending: PendingTelegramLink = {
    token,
    customerId: normalizedCustomerId,
    accountName: normalizedAccountName,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + LINK_TTL_MS).toISOString(),
  };

  await writeJsonAtomic(join(pendingDir(stateDir), `${token}.json`), pending);
  return pending;
}

export async function getPendingTelegramLink(token: string, stateDir?: string) {
  validateToken(token);
  await ensureStateDirs(stateDir);
  const path = join(pendingDir(stateDir), `${token}.json`);
  const pending = await readJson<PendingTelegramLink>(path);
  if (!pending) return undefined;
  if (Date.parse(pending.expiresAt) <= Date.now()) {
    await rm(path, { force: true });
    return undefined;
  }
  return pending;
}

export async function cancelPendingTelegramLink(token: string, stateDir?: string) {
  validateToken(token);
  await rm(join(pendingDir(stateDir), `${token}.json`), { force: true });
}

export async function getTelegramLinkByChatId(chatId: number, stateDir?: string) {
  validateChatId(chatId);
  await ensureStateDirs(stateDir);
  return readJson<TelegramAccountLink>(join(linksDir(stateDir), `${chatId}.json`));
}

async function listTelegramLinks(stateDir?: string) {
  await ensureStateDirs(stateDir);
  const files = await readdir(linksDir(stateDir));
  const links = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map((file) => readJson<TelegramAccountLink>(join(linksDir(stateDir), file))),
  );
  return links.filter((link): link is TelegramAccountLink => Boolean(link));
}

export async function getTelegramLinkForCustomer(customerId: string, stateDir?: string) {
  const links = await listTelegramLinks(stateDir);
  return links.find((link) => link.customerId === customerId);
}

export async function setTelegramLanguage(
  chatId: number,
  language: TelegramLanguage,
  stateDir?: string,
) {
  const linked = await getTelegramLinkByChatId(chatId, stateDir);
  if (!linked) throw new Error("TELEGRAM_ACCOUNT_NOT_LINKED");
  const updated: TelegramAccountLink = { ...linked, language };
  await writeJsonAtomic(join(linksDir(stateDir), `${chatId}.json`), updated);
  return updated;
}

export async function confirmTelegramLink(
  token: string,
  chatId: number,
  telegramUserId: number,
  stateDir?: string,
): Promise<TelegramAccountLink> {
  validateChatId(chatId);
  if (!Number.isSafeInteger(telegramUserId)) throw new Error("INVALID_TELEGRAM_USER_ID");
  const pending = await getPendingTelegramLink(token, stateDir);
  if (!pending) throw new Error("TELEGRAM_LINK_EXPIRED_OR_USED");

  await ensureStateDirs(stateDir);
  const existingLinks = await listTelegramLinks(stateDir);
  await Promise.all(
    existingLinks
      .filter((link) => link.chatId === chatId || link.customerId === pending.customerId)
      .map((link) => rm(join(linksDir(stateDir), `${link.chatId}.json`), { force: true })),
  );

  const linked: TelegramAccountLink = {
    chatId,
    telegramUserId,
    customerId: pending.customerId,
    accountName: pending.accountName,
    linkedAt: new Date().toISOString(),
  };
  await writeJsonAtomic(join(linksDir(stateDir), `${chatId}.json`), linked);
  await cancelPendingTelegramLink(token, stateDir);
  return linked;
}

export function createTelegramDeepLink(botUsername: string, token: string) {
  const username = botUsername.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{5,32}$/.test(username)) throw new Error("INVALID_TELEGRAM_BOT_USERNAME");
  validateToken(token);
  return `https://t.me/${username}?start=${token}`;
}
