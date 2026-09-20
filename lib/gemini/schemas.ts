import { z } from "zod";

/**
 * Gemini sometimes invents field names (e.g. `clarifyingQuestion` instead of
 * our two-field `needsClarification` + `clarificationQuestion` shape).
 * We pre-process the parsed JSON to normalize those aliases into the canonical
 * fields before validating with the strict schema.
 */
function normalizeIntentAliases(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const o = input as Record<string, unknown>;

  // Accept `clarifyingQuestion` (singular) as a fallback for both
  // `needsClarification` (boolean) and `clarificationQuestion` (string).
  if (typeof o.clarifyingQuestion === "string") {
    if (typeof o.needsClarification !== "boolean") {
      o.needsClarification = o.clarifyingQuestion.trim().length > 0;
    }
    if (typeof o.clarificationQuestion !== "string") {
      o.clarificationQuestion = o.clarifyingQuestion;
    }
    delete o.clarifyingQuestion;
  }

  // Common aliases for other fields
  if (typeof o.normalized_text === "string" && typeof o.normalizedStatement !== "string") {
    o.normalizedStatement = o.normalized_text;
    delete o.normalized_text;
  }
  if (typeof o.intent_detected === "boolean" && typeof o.intentDetected !== "boolean") {
    o.intentDetected = o.intent_detected;
    delete o.intent_detected;
  }
  if (typeof o.needs_clarification === "boolean" && typeof o.needsClarification !== "boolean") {
    o.needsClarification = o.needs_clarification;
    delete o.needs_clarification;
  }

  return o;
}

export const complaintIntentSchema = z.object({
  intentDetected: z.boolean(),
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
  normalizedStatement: z.string().nullable(),
  needsClarification: z.boolean(),
  clarificationQuestion: z.string().nullable(),
});

export const imageAnalysisSchema = z.object({
  imageValid: z.boolean(),
  problemVisible: z.boolean(),
  reportedProblemSupported: z.boolean(),
  imageQuality: z.enum(["GOOD", "ACCEPTABLE", "POOR", "UNUSABLE"]),
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  retakeRecommended: z.boolean(),
  confidence: z.number().min(0).max(1),
});

export const complaintDescriptionSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(600),
});

export const transcribeResultSchema = z.object({
  transcript: z.string(),
  detectedLanguage: z.string().nullable(),
  normalizedText: z.string().nullable(),
});

/**
 * Parses + normalizes a Gemini text response against the complaint-intent schema.
 * Applies alias normalization (e.g. `clarifyingQuestion` → split into the two
 * canonical fields) before strict validation.
 */
export function parseComplaintIntent(raw: unknown) {
  return complaintIntentSchema.safeParse(normalizeIntentAliases(raw));
}

export type ComplaintIntent = z.infer<typeof complaintIntentSchema>;
export type ImageAnalysis = z.infer<typeof imageAnalysisSchema>;
export type ComplaintDescription = z.infer<typeof complaintDescriptionSchema>;
export type TranscribeResult = z.infer<typeof transcribeResultSchema>;
