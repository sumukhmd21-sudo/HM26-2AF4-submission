import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Issues an ephemeral session marker for Gemini Live usage.
// Real Gemini Live integration requires WebSocket from the client; the
// client uses GEMINI_API_KEY (read-only ephemeral) for short-lived sessions.
// In production use a server-issued token that expires in minutes.
export async function POST(_req: NextRequest) {
  const user = await getCurrentUser();
  const sessionId = nanoid();
  await query(
    `INSERT INTO ai_sessions (citizen_id, mode, gemini_session_id)
     VALUES ($1, $2, $3)`,
    [user?.id ?? null, "LIVE", sessionId]
  );
  // The browser uses ephemeral tokens (Gemini Live models support
  // short-lived auth). Here we return a session marker, not the API key.
  return NextResponse.json({ sessionId, mode: "LIVE" });
}
