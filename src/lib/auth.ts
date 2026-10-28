import "server-only";
import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminRole, AdminUser } from "@prisma/client";
import { db } from "./db";
import { hashPassword } from "./password";

export { hashPassword, verifyPassword } from "./password";

export const SESSION_COOKIE = "shop_admin_session";
const SESSION_DAYS = 7;

/** Used to keep login timing similar whether or not the email exists. */
let dummyHash: Promise<string> | null = null;
export function getDummyHash() {
  dummyHash ??= hashPassword(crypto.randomBytes(16).toString("hex"));
  return dummyHash;
}

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

export async function createSession(adminId: string, ip: string | null, userAgent: string | null) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.adminSession.create({
    data: { adminId, tokenHash: sha256(token), expiresAt, ip, userAgent: userAgent?.slice(0, 300) ?? null },
  });
  // Opportunistic cleanup of expired sessions.
  await db.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.adminSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export type SessionAdmin = Pick<AdminUser, "id" | "email" | "name" | "role">;

/** Returns the signed-in admin, or null. Always checks the database. */
export async function getCurrentAdmin(): Promise<SessionAdmin | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.adminSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { admin: { select: { id: true, email: true, name: true, role: true, active: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.admin.active) return null;
  const { active: _active, ...admin } = session.admin;
  return admin;
}

/** For admin pages: redirects to login when not signed in, or to the overview when the role is insufficient. */
export async function requireAdminPage(role?: AdminRole): Promise<SessionAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (role === "OWNER" && admin.role !== "OWNER") redirect("/admin?denied=1");
  return admin;
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}
