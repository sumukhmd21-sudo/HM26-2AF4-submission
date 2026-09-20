import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { mode } = await req.json().catch(() => ({ mode: "TRANSCRIBE" }));
  const user = await getCurrentUser();
  const sessionId = nanoid();
  await query(
    `INSERT INTO ai_sessions (citizen_id, mode, gemini_session_id)
     VALUES ($1, $2, $3)`,
    [user?.id ?? null, mode, sessionId]
  );
  return NextResponse.json({ sessionId });
}
