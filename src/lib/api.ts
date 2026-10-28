import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import type { AdminRole } from "@prisma/client";
import { getCurrentAdmin, type SessionAdmin } from "./auth";

/** An error whose message is safe to show to the user. */
export class AppError extends Error {
  constructor(message: string, public status = 400, public fields?: Record<string, string>) {
    super(message);
  }
}

export function jsonError(message: string, status = 400, fields?: Record<string, string>) {
  return NextResponse.json({ error: message, fields }, { status });
}

function zodFields(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Converts known errors to JSON responses and logs unexpected ones. */
export function handleError(err: unknown) {
  if (err instanceof AppError) return jsonError(err.message, err.status, err.fields);
  if (err instanceof ZodError) return jsonError("Please check the highlighted fields.", 422, zodFields(err));
  console.error("[api] Unexpected error:", err);
  return jsonError("Something went wrong on our side. Please try again.", 500);
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError("Invalid request body.", 400);
  }
  return schema.parse(body);
}

function allowedOrigins(): string[] {
  const list = [process.env.APP_URL, ...(process.env.ALLOWED_ORIGINS ?? "").split(",")]
    .map((o) => o?.trim().replace(/\/$/, ""))
    .filter(Boolean) as string[];
  return list;
}

/**
 * CSRF defence for cookie-authenticated mutations: the request must come from
 * the same host (or an explicitly allowed origin).
 */
export function checkOrigin(req: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host === host) return true;
  } catch {
    return false;
  }
  return allowedOrigins().includes(origin.replace(/\/$/, ""));
}

type Handler<C> = (req: Request, ctx: C, admin: SessionAdmin) => Promise<Response>;

/** Wraps an admin API route: origin check, authentication, optional role check and error handling. */
export function adminRoute<C = unknown>(handler: Handler<C>, opts: { role?: AdminRole } = {}) {
  return async (req: Request, ctx: C) => {
    try {
      if (!checkOrigin(req)) return jsonError("Request origin not allowed.", 403);
      const admin = await getCurrentAdmin();
      if (!admin) return jsonError("Please sign in again.", 401);
      if (opts.role === "OWNER" && admin.role !== "OWNER") return jsonError("Only the shop owner can do this.", 403);
      return await handler(req, ctx, admin);
    } catch (err) {
      return handleError(err);
    }
  };
}
