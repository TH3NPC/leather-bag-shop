import { NextResponse } from "next/server";
import { checkOrigin, jsonError } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export async function POST(req: Request) {
  if (!checkOrigin(req)) return jsonError("Request origin not allowed.", 403);
  await destroySession();
  return NextResponse.json({ ok: true });
}
