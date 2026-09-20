import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeComplaintImage, generateComplaintDescription } from "@/lib/gemini/vision";
import { readBuffer } from "@/lib/storage";
import { getDraft, updateDraft } from "@/lib/complaints/draft";
import { query, queryOne } from "@/lib/db";
import { GeminiError, logGeminiError } from "@/lib/gemini/client";

export const runtime = "nodejs";
export const maxDuration = 120;

const schema = z.object({ draftId: z.string().uuid(), imageId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const draft = await getDraft(parsed.data.draftId);
  if (!draft) return NextResponse.json({ error: "DRAFT_NOT_FOUND" }, { status: 404 });
  const img = await queryOne<{
    id: string;
    storage_path: string;
    mime_type: string;
  }>(
    `SELECT id, storage_path, mime_type FROM complaint_images WHERE id = $1`,
    [parsed.data.imageId]
  );
  if (!img) return NextResponse.json({ error: "IMAGE_NOT_FOUND" }, { status: 404 });

  await query(
    `UPDATE complaint_images SET analysis_status = 'PROCESSING' WHERE id = $1`,
    [img.id]
  );

  const startedAt = Date.now();
  try {
    const buf = await readBuffer(img.storage_path);
    const analysis = await analyzeComplaintImage({
      imageBase64: buf.toString("base64"),
      mimeType: img.mime_type,
      originalText: draft.original_text ?? draft.voice_transcript ?? "",
      normalizedText: draft.normalized_text ?? undefined,
    });

    let catId: string | undefined;
    let subId: string | undefined;
    if (analysis.category) {
      const c = await queryOne<{ id: string }>(
        `SELECT id FROM categories WHERE code = $1`,
        [analysis.category]
      );
      catId = c?.id;
      if (catId && analysis.subcategory) {
        const s = await queryOne<{ id: string }>(
          `SELECT id FROM subcategories WHERE category_id = $1 AND code = $2`,
          [catId, analysis.subcategory]
        );
        subId = s?.id;
      }
    }

    await query(
      `UPDATE complaint_images
       SET analysis_status='COMPLETED', image_valid=$1, problem_visible=$2,
           image_quality=$3, ai_analysis_json=$4, ai_model=$5
       WHERE id=$6`,
      [
        analysis.imageValid,
        analysis.problemVisible,
        analysis.imageQuality,
        JSON.stringify(analysis),
        process.env.GEMINI_ANALYSIS_MODEL,
        img.id,
      ]
    );

    let final = {
      title: analysis.title ?? "Civic complaint",
      description:
        analysis.description ?? draft.normalized_text ?? draft.original_text ?? "",
    };
    if (analysis.imageValid && analysis.problemVisible) {
      const generated = await generateComplaintDescription({
        originalText: draft.original_text ?? draft.voice_transcript ?? "",
        normalizedText: draft.normalized_text ?? undefined,
        imageAnalysis: analysis,
      });
      final = generated;
    }

    await updateDraft(parsed.data.draftId, {
      category_id: catId,
      subcategory_id: subId,
      ai_analysis_json: analysis,
    });

    return NextResponse.json({
      analysis,
      final,
      categoryId: catId,
      subcategoryId: subId,
    });
  } catch (e) {
    const durationMs = Date.now() - startedAt;
    await query(
      `UPDATE complaint_images SET analysis_status = 'FAILED' WHERE id = $1`,
      [img.id]
    );
    logGeminiError(`analyze-image (${durationMs}ms, image=${img.id})`, e);

    if (e instanceof GeminiError) {
      const status = e.code === "CONFIG_ERROR" ? 500 : 502;
      return NextResponse.json(
        {
          error: e.code,
          message: e.message,
          durationMs,
          hint:
            e.code === "CONFIG_ERROR"
              ? "Check .env has GEMINI_API_KEY and GEMINI_ANALYSIS_MODEL set."
              : "Gemini API call failed — see server terminal for full error object.",
        },
        { status }
      );
    }
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
