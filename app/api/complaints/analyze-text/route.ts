import { NextRequest, NextResponse } from "next/server";
import { analyzeTextBodySchema } from "@/lib/validation/complaint";
import { analyzeComplaintText } from "@/lib/gemini/text";
import { updateDraft } from "@/lib/complaints/draft";
import { queryOne } from "@/lib/db";
import { GeminiError, logGeminiError } from "@/lib/gemini/client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = analyzeTextBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { text, draftId } = parsed.data;
  const startedAt = Date.now();

  try {
    const result = await analyzeComplaintText(text);
    let catId: string | undefined;
    let subId: string | undefined;
    if (result.category) {
      const c = await queryOne<{ id: string }>(
        `SELECT id FROM categories WHERE code = $1`,
        [result.category]
      );
      catId = c?.id;
      if (catId && result.subcategory) {
        const s = await queryOne<{ id: string }>(
          `SELECT id FROM subcategories WHERE category_id = $1 AND code = $2`,
          [catId, result.subcategory]
        );
        subId = s?.id;
      }
    }
    if (draftId) {
      await updateDraft(draftId, {
        original_text: text,
        normalized_text: result.normalizedStatement ?? undefined,
        category_id: catId,
        subcategory_id: subId,
      });
    }
    return NextResponse.json({
      result,
      categoryId: catId,
      subcategoryId: subId,
    });
  } catch (e) {
    const durationMs = Date.now() - startedAt;
    logGeminiError(`analyze-text (${durationMs}ms, draft=${draftId ?? "none"})`, e);

    if (e instanceof GeminiError) {
      const status =
        e.code === "CONFIG_ERROR"
          ? 500
          : e.code === "AI_INVALID_OUTPUT"
          ? 502
          : 502;
      return NextResponse.json(
        {
          error: e.code,
          message: e.message,
          durationMs,
          hint:
            e.code === "CONFIG_ERROR"
              ? "Check .env has GEMINI_API_KEY and GEMINI_ANALYSIS_MODEL set, and that the dev server was restarted after editing .env."
              : e.code === "AI_INVALID_OUTPUT"
              ? "Gemini returned a response that did not match the expected JSON schema. Check the raw response in the server terminal."
              : "The Gemini API request failed. Check the error object above for status, code, and errorDetails.",
        },
        { status }
      );
    }

    // Unknown error shape — still log everything
    return NextResponse.json(
      {
        error: "AI_FAILURE",
        message: (e as Error)?.message ?? "Unknown error",
        durationMs,
      },
      { status: 502 }
    );
  }
}
