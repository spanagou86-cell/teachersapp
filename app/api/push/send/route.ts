import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { pushConfigured, sendAll, type PushMessage } from "@/lib/push";

export const runtime = "nodejs";

/** Called by the database job once a minute with the reminders that are due. */
export async function POST(req: NextRequest) {
  const secret = process.env.PUSH_SECRET ?? "";
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  const ok = secret.length >= 32 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!pushConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { messages?: unknown };
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .slice(0, 500)
    .filter((m): m is PushMessage => !!m && typeof m === "object" && ["endpoint", "p256dh", "auth", "title", "body"].every((k) => typeof (m as Record<string, unknown>)[k] === "string"));
  return NextResponse.json(await sendAll(messages));
}
