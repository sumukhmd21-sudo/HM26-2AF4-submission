import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";

const schema = z.object({ sessionId: z.string(), transcript: z.array(z.unknown()).optional() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  await query(
    `UPDATE ai_sessions SET closed_at = NOW(), transcript = $2 WHERE gemini_session_id = $1`,
    [parsed.data.sessionId, parsed.data.transcript ? JSON.stringify(parsed.data.transcript) : null]
  );
  return NextResponse.json({ ok: true });
}
