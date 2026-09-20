import { NextRequest, NextResponse } from "next/server";
import { createDraft } from "@/lib/complaints/draft";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const sessionId = req.headers.get("x-session-id") ?? undefined;
  const user = await getCurrentUser();
  const draft = await createDraft({ citizenId: user?.id, sessionId });
  return NextResponse.json({ draft });
}
