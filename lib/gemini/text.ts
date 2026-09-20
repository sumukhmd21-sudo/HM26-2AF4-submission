import {
  getGemini,
  MODELS,
  GeminiError,
  logGeminiError,
  generateContentResilient,
} from "./client";
import { TEXT_SYSTEM_PROMPT } from "./prompts";
import { parseComplaintIntent, ComplaintIntent } from "./schemas";
import { query } from "@/lib/db";

interface CategoryOption {
  code: string;
  name: string;
  subcategories: { code: string; name: string }[];
}

let cachedCategories: { loadedAt: number; data: CategoryOption[] } | null = null;

async function loadCategories(): Promise<CategoryOption[]> {
  if (cachedCategories && Date.now() - cachedCategories.loadedAt < 60_000) {
    return cachedCategories.data;
  }
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
  const data = Array.from(map.values());
  cachedCategories = { loadedAt: Date.now(), data };
  return data;
}

/**
 * OpenAPI 3.0 subset schema for Gemini's `responseSchema`.
 *
 * Important constraints (Gemini does NOT accept full JSON Schema):
 *   - `type` must be a single string, NOT an array. Nullable fields use
 *     `type: "string"` + `nullable: true` (OpenAPI 3.0 pattern), NOT
 *     `type: ["string", "null"]` (JSON Schema pattern).
 *   - No `$ref`, no `anyOf`/`oneOf`/`allOf`, no `additionalProperties`.
 *   - `required` is an array of property names; every required field must
 *     appear in `properties`.
 *
 * We hand-write the schema here so the exact shape Gemini receives is
 * obvious in code review and cannot drift through an auto-converter.
 */
const intentResponseSchema = {
  type: "object",
  properties: {
    intentDetected: { type: "boolean" },
    category: { type: "string", nullable: true },
    subcategory: { type: "string", nullable: true },
    normalizedStatement: { type: "string", nullable: true },
    needsClarification: { type: "boolean" },
    clarificationQuestion: { type: "string", nullable: true },
  },
  required: [
    "intentDetected",
    "category",
    "subcategory",
    "normalizedStatement",
    "needsClarification",
    "clarificationQuestion",
  ],
};

export async function analyzeComplaintText(
  text: string,
  opts: { signal?: AbortSignal } = {}
): Promise<ComplaintIntent> {
  const categories = await loadCategories();
  const allowed = categories
    .map(
      (c) =>
        `${c.code} (${c.name}): ${c.subcategories.map((s) => `${s.code} (${s.name})`).join(", ")}`
    )
    .join("\n");

  const prompt = `Allowed categories and subcategories:\n${allowed}\n\nCitizen complaint:\n"""${text}"""`;

  let model: string;
  try {
    model = MODELS.analysis();
  } catch (e) {
    throw new GeminiError("CONFIG_ERROR", `GEMINI_ANALYSIS_MODEL not set: ${(e as Error).message}`);
  }

  try {
    const resp = await generateContentResilient({
      context: "analyzeComplaintText",
      model,
      contents: prompt,
      config: {
        systemInstruction: TEXT_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: intentResponseSchema,
        temperature: 0.2,
        maxOutputTokens: 600,
      },
      inlineSystemText: TEXT_SYSTEM_PROMPT,
    });

    // With responseSchema set, resp.text IS already strict JSON.
    // We still go through parseComplaintIntent for belt-and-braces alias
    // normalization (in case a model variant emits snake_case aliases).
    let parsed: unknown;
    const raw = resp.text ?? "";
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Last-resort lenient parse in case the model wraps output in fences
      const { safeJsonParse } = await import("./client");
      parsed = safeJsonParse(raw);
    }

    const validated = parseComplaintIntent(parsed);
    if (!validated.success) {
      throw new GeminiError(
        "AI_INVALID_OUTPUT",
        `Schema mismatch: ${validated.error.message}. Raw response: ${raw.slice(0, 300)}`
      );
    }
    const v = validated.data;
    if (v.category && !categories.find((c) => c.code === v.category)) {
      v.category = "OTHER";
      v.subcategory = "OTHER";
    } else if (v.category) {
      const c = categories.find((c) => c.code === v.category)!;
      if (v.subcategory && !c.subcategories.find((s) => s.code === v.subcategory))
        v.subcategory = c.subcategories[0]?.code ?? null;
    }
    return v;
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    throw new GeminiError("AI_TIMEOUT", (e as Error).message);
  }
}

export async function normalizeComplaint(text: string): Promise<string> {
  try {
    const ai = getGemini();
    const resp = await ai.models.generateContent({
      model: MODELS.analysis(),
      contents: `Normalize this civic complaint into a concise, objective English statement (1 sentence). Preserve key facts. Return only the normalized text.\n\nText: """${text}"""`,
      config: { temperature: 0.1, maxOutputTokens: 120 },
    });
    return (resp.text ?? text).trim();
  } catch (e) {
    logGeminiError("normalizeComplaint", e);
    return text;
  }
}
