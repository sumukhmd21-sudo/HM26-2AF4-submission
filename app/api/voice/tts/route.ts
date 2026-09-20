import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { synthesizeSpeech, TtsError } from "@/lib/gemini/audio";

const schema = z.object({
  text: z.string().min(1).max(500),
  voice: z.string().optional(),
  // "kn" selects the Kannada-flavoured voice; any other value falls back
  // to the default. The actual TTS is multilingual — the voice persona
  // just nudges pronunciation.
  language: z.enum(["en", "kn"]).optional(),
});

// Retry budget for transient Gemini TTS failures (no-audio-data, transient
// 5xx, network errors). Rate-limit / quota failures skip retries — see
// TtsError.isTerminal below.
const TTS_MAX_ATTEMPTS = 3;
// Exponential backoff: 500ms, then 1000ms, then 2000ms between attempts.
// Matters most for rate limits, where immediate retry just hits the limit.
const TTS_BACKOFF_MS = [500, 1000, 2000];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  let result: Awaited<ReturnType<typeof synthesizeSpeech>> = null;
  let lastError: TtsError | null = null;

  for (let attempt = 0; attempt < TTS_MAX_ATTEMPTS; attempt++) {
    try {
      result = await synthesizeSpeech(parsed.data);
      if (result) break;
    } catch (e) {
      if (!(e instanceof TtsError)) {
        // Unexpected non-TTS error — log and bail.
        console.error("[tts/route] unexpected error:", e);
        return NextResponse.json(
          { error: "TTS_UNAVAILABLE" },
          { status: 503 }
        );
      }
      lastError = e;
      // Rate-limit / quota failures don't get better with retry — bail.
      if (e.isTerminal) break;
      // Otherwise fall through to backoff + retry.
    }
    if (attempt < TTS_MAX_ATTEMPTS - 1) {
      await sleep(TTS_BACKOFF_MS[attempt] ?? 2000);
    }
  }

  if (!result) {
    if (lastError && (lastError.kind === "RATE_LIMITED" || lastError.kind === "QUOTA_EXHAUSTED")) {
      return NextResponse.json(
        {
          error: "TTS_RATE_LIMITED",
          kind: lastError.kind,
          httpStatus: lastError.httpStatus,
        },
        { status: 429 }
      );
    }
    return NextResponse.json(
      {
        error: "TTS_UNAVAILABLE",
        kind: lastError?.kind,
        httpStatus: lastError?.httpStatus,
      },
      { status: 503 }
    );
  }
  return NextResponse.json(result);
}
