import "server-only";
import crypto from "node:crypto";

export interface TelegramUser {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
}

/** Init data older than this is rejected to limit replay of a leaked string. */
const MAX_AGE_SECONDS = 24 * 60 * 60;

export const telegramConfigured = () => Boolean(process.env.TELEGRAM_BOT_TOKEN);

/**
 * Validates Telegram Mini App init data as described in
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * Returns the user only when the signature is valid and fresh.
 */
export function verifyInitData(initData: string | null | undefined): TelegramUser | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !initData || initData.length > 4096) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash || !/^[a-f0-9]{64}$/.test(hash)) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const expected = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(hash, "hex"))) return null;

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > MAX_AGE_SECONDS) return null;

  try {
    const user = JSON.parse(params.get("user") ?? "null");
    if (!user || typeof user.id !== "number") return null;
    return {
      id: String(user.id),
      firstName: String(user.first_name ?? "").slice(0, 100),
      lastName: user.last_name ? String(user.last_name).slice(0, 100) : undefined,
      username: user.username ? String(user.username).slice(0, 64) : undefined,
    };
  } catch {
    return null;
  }
}

/** Escapes text for Telegram's HTML parse mode. */
export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Sends a message through the Bot API. Never throws: notification failures must
 * not break order placement, but they are logged.
 */
export async function sendTelegramMessage(chatId: string, html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[telegram] sendMessage failed (${res.status}): ${body.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[telegram] sendMessage error:", err instanceof Error ? err.message : err);
    return false;
  }
}
