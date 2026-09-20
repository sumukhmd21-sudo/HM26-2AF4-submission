import { NextRequest, NextResponse } from "next/server";
import { transcribeBodySchema } from "@/lib/validation/complaint";
import { transcribeAudio } from "@/lib/gemini/audio";
import { updateDraft } from "@/lib/complaints/draft";
import { GeminiError, logGeminiError } from "@/lib/gemini/client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("audio") as File | null;
  const draftId = form.get("draftId") as string | null;
  const mimeType = (form.get("mimeType") as string | null) ?? file?.type ?? "";
  const parsed = transcribeBodySchema.safeParse({
    mimeType,
    draftId: draftId ?? undefined,
  });
  if (!parsed.success || !file) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const startedAt = Date.now();
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await transcribeAudio({
      audioBase64: buf.toString("base64"),
      mimeType,
    });
    if (draftId) {
      await updateDraft(draftId, {
        voice_transcript: result.transcript,
        normalized_text: result.normalizedText ?? undefined,
      });
    }
    return NextResponse.json({ result });
  } catch (e) {
    const durationMs = Date.now() - startedAt;
    logGeminiError(`voice/transcribe (${durationMs}ms)`, e);

    if (e instanceof GeminiError) {
      const status = e.code === "CONFIG_ERROR" ? 500 : 502;
      return NextResponse.json(
        {
          error: e.code,
          message: e.message,
          durationMs,
          hint:
            e.code === "CONFIG_ERROR"
              ? "Check .env has GEMINI_API_KEY and GEMINI_TRANSCRIBE_MODEL set."
              : "Gemini transcription failed — see server terminal.",
        },
        { status }
      );
    }
    return NextResponse.json(
      {
        error: "VOICE_ERROR",
        message: (e as Error)?.message ?? "Unknown error",
        durationMs,
      },
      { status: 502 }
    );
  }
}
