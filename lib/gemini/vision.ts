import {
  MODELS,
  GeminiError,
  safeJsonParse,
  generateContentResilient,
} from "./client";
import { IMAGE_SYSTEM_PROMPT } from "./prompts";
import {
  imageAnalysisSchema,
  complaintDescriptionSchema,
  ImageAnalysis,
  ComplaintDescription,
} from "./schemas";
import { query } from "@/lib/db";

interface CategoryOption {
  code: string;
  name: string;
  subcategories: { code: string; name: string }[];
}

async function loadCategories(): Promise<CategoryOption[]> {
  const { rows } = await query<{
    cat_code: string;
    cat_name: string;
    sub_code: string;
    sub_name: string;
  }>(
    `SELECT c.code AS cat_code, c.name AS cat_name, s.code AS sub_code, s.name AS sub_name
     FROM categories c LEFT JOIN subcategories s ON s.category_id = c.id
     WHERE c.active = TRUE AND (s.active IS NULL OR s.active = TRUE)`
  );
  const map = new Map<string, CategoryOption>();
  for (const r of rows) {
    if (!map.has(r.cat_code))
      map.set(r.cat_code, { code: r.cat_code, name: r.cat_name, subcategories: [] });
    if (r.sub_code)
      map.get(r.cat_code)!.subcategories.push({ code: r.sub_code, name: r.sub_name });
  }
  return Array.from(map.values());
}

/**
 * OpenAPI 3.0 subset schema for Gemini's `responseSchema`.
 * Gemini accepts only single-string `type` values; nullable fields use
 * `nullable: true` (NOT `type: ["string", "null"]` which is rejected by
 * the proto decoder: "Proto field is not repeating, cannot start list").
 * Hand-written to keep the wire format obvious.
 */
const imageResponseSchema = {
  type: "object",
  properties: {
    imageValid: { type: "boolean" },
    problemVisible: { type: "boolean" },
    reportedProblemSupported: { type: "boolean" },
    imageQuality: { type: "string", enum: ["GOOD", "ACCEPTABLE", "POOR", "UNUSABLE"] },
    category: { type: "string", nullable: true },
    subcategory: { type: "string", nullable: true },
    title: { type: "string", nullable: true },
    description: { type: "string", nullable: true },
    retakeRecommended: { type: "boolean" },
    confidence: { type: "number" },
  },
  required: [
    "imageValid",
    "problemVisible",
    "reportedProblemSupported",
    "imageQuality",
    "category",
    "subcategory",
    "title",
    "description",
    "retakeRecommended",
    "confidence",
  ],
};

const descriptionResponseSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
  },
  required: ["title", "description"],
};

export async function analyzeComplaintImage(input: {
  imageBase64: string;
  mimeType: string;
  originalText?: string;
  normalizedText?: string;
}): Promise<ImageAnalysis> {
  const categories = await loadCategories();
  const allowed = categories
    .map(
      (c) =>
        `${c.code} (${c.name}): ${c.subcategories.map((s) => `${s.code} (${s.name})`).join(", ")}`
    )
    .join("\n");

  const userPrompt = `Allowed categories and subcategories:\n${allowed}\n\nOriginal citizen statement: ${input.originalText ?? ""}\nNormalized statement: ${input.normalizedText ?? ""}`;

  try {
    const resp = await generateContentResilient({
      context: "analyzeComplaintImage",
      model: MODELS.analysis(),
      contents: [
        { text: userPrompt },
        { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
      ],
      config: {
        systemInstruction: IMAGE_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: imageResponseSchema,
        temperature: 0.2,
        maxOutputTokens: 800,
      },
      inlineSystemText: IMAGE_SYSTEM_PROMPT,
    });

    const raw = resp.text ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = safeJsonParse(raw);
    }
    const v = imageAnalysisSchema.safeParse(parsed);
    if (!v.success) {
      throw new GeminiError(
        "AI_INVALID_OUTPUT",
        `Schema mismatch: ${v.error.message}. Raw response: ${raw.slice(0, 300)}`
      );
    }
    const out = v.data;
    if (out.category && !categories.find((c) => c.code === out.category)) {
      out.category = "OTHER";
      out.subcategory = "OTHER";
    } else if (out.category) {
      const c = categories.find((c) => c.code === out.category)!;
      if (out.subcategory && !c.subcategories.find((s) => s.code === out.subcategory))
        out.subcategory = c.subcategories[0]?.code ?? null;
    }
    return out;
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    throw new GeminiError("AI_TIMEOUT", (e as Error).message);
  }
}

export async function generateComplaintDescription(input: {
  originalText: string;
  normalizedText?: string;
  imageAnalysis: ImageAnalysis;
}): Promise<ComplaintDescription> {
  try {
    const prompt = `Produce the final formal complaint title and description (1-3 sentences) using the citizen statement and the image analysis below. Keep it concise, objective, evidence-based, editable.

Citizen statement: ${input.originalText}
Normalized: ${input.normalizedText ?? ""}
Detected issue: ${input.imageAnalysis.title} (${input.imageAnalysis.category}/${input.imageAnalysis.subcategory})
Image quality: ${input.imageAnalysis.imageQuality}`;

    const resp = await generateContentResilient({
      context: "generateComplaintDescription",
      model: MODELS.analysis(),
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: descriptionResponseSchema,
        temperature: 0.2,
        maxOutputTokens: 400,
      },
    });
    const raw = resp.text ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = safeJsonParse(raw);
    }
    const v = complaintDescriptionSchema.safeParse(parsed);
    if (v.success) return v.data;
    return {
      title: input.imageAnalysis.title ?? "Civic complaint",
      description:
        input.imageAnalysis.description ?? input.normalizedText ?? input.originalText,
    };
  } catch {
    return {
      title: input.imageAnalysis.title ?? "Civic complaint",
      description:
        input.imageAnalysis.description ?? input.normalizedText ?? input.originalText,
    };
  }
}
