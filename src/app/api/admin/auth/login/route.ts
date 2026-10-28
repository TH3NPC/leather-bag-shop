import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkOrigin, handleError, jsonError, parseJson } from "@/lib/api";
import { clientIp, createSession, getDummyHash, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    if (!checkOrigin(req)) return jsonError("Request origin not allowed.", 403);
    const ip = (await clientIp()) ?? "local";
    const ipLimit = rateLimit(`login-ip:${ip}`, 20, 15 * 60_000);
    if (!ipLimit.ok) return jsonError("Too many sign-in attempts. Please wait 15 minutes.", 429);

    const { email, password } = await parseJson(req, loginSchema);
    const accountKey = `login-acct:${email}`;
    const acctLimit = rateLimit(accountKey, 6, 15 * 60_000);
    if (!acctLimit.ok) return jsonError("Too many sign-in attempts for this account. Please wait 15 minutes.", 429);

    const admin = await db.adminUser.findUnique({ where: { email } });
    // Always run a hash comparison so response time does not reveal whether the email exists.
    const valid = await verifyPassword(password, admin?.passwordHash ?? (await getDummyHash()));
    if (!admin || !valid || !admin.active) return jsonError("Incorrect email or password.", 401);

    resetRateLimit(accountKey);
    await createSession(admin.id, ip, req.headers.get("user-agent"));
    await db.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
