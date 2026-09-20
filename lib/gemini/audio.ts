import {
  MODELS,
  GeminiError,
  logGeminiError,
  safeJsonParse,
  generateContentResilient,
  getGemini,
} from "./client";
import { TRANSCRIBE_SYSTEM_PROMPT } from "./prompts";
import { transcribeResultSchema, TranscribeResult } from "./schemas";

/**
 * OpenAPI 3.0 subset schema for Gemini's `responseSchema`.
 * Gemini accepts only single-string `type` values; nullable fields use
 * `nullable: true` (NOT `type: ["string", "null"]` which the proto decoder
 * rejects). Hand-written to keep the wire format obvious.
 */
const transcribeResponseSchema = {
  type: "object",
  properties: {
    transcript: { type: "string" },
    detectedLanguage: { type: "string", nullable: true },
    normalizedText: { type: "string", nullable: true },
  },
  required: ["transcript", "detectedLanguage", "normalizedText"],
};

/**
 * Models we know reliably handle "audio input + text instruction → JSON output".
 *
 * As of the latest Gemini lineup (Jan 2026):
 *   - gemini-2.0-flash   → DEPRECATED, 404 NOT_FOUND
 *   - gemini-1.5-flash   → DEPRECATED
 *   - gemini-2.5-flash   → DEPRECATED in many regions / moved to preview
 *   - gemini-3.6-flash   → current stable, audio-capable, recommended
 *   - gemini-3.6-flash-lite → smaller / cheaper, also audio-capable
 *
 * Native transcribe models (gemini-*-transcribe*) often have quirks:
 *   - Reject developer/system instructions
 *   - May or may not support responseMimeType JSON
 *   - The 3.x-transcribe variants published so far do not exist on the API
 *     and return empty responses (model-not-found, finishReason STOP, 0 text out)
 *
 * If GEMINI_TRANSCRIBE_MODEL points to something that fails, we silently fall
 * back through this list. The env var still controls the primary choice —
 * this is just a safety net.
 */
const AUDIO_CAPABLE_FALLBACKS = [
  "gemini-3.6-flash",
  "gemini-3.6-flash-lite",
];

async function pickTranscribeModel(): Promise<string> {
  const primary = (() => {
    try {
      return MODELS.transcribe();
    } catch {
      return "";
    }
  })();
  // If primary is set and looks like a real general-purpose model, use it.
  // Otherwise (empty, unset, or a transcribe variant) pick the first fallback.
  if (primary && !/transcribe/i.test(primary)) return primary;
  return AUDIO_CAPABLE_FALLBACKS[0];
}

/**
 * Transcribe an audio clip using Gemini.
 *
 * Strategy:
 *   1. Try the configured GEMINI_TRANSCRIBE_MODEL with structured output.
 *   2. If it fails (404, empty response, schema rejection), fall back to a
 *      known-working general-purpose audio-capable model
 *      (gemini-3.6-flash → gemini-3.6-flash-lite).
 *   3. Use responseSchema so the model emits strict JSON (no parsing bugs).
 */
export async function transcribeAudio(input: {
  audioBase64: string;
  mimeType: string;
}): Promise<TranscribeResult> {
  const userPrompt = `${TRANSCRIBE_SYSTEM_PROMPT}

The audio file is attached below. Transcribe it verbatim in its original language, detect the language, and provide a normalized English version for internal routing.`;

  const modelsToTry = await collectTranscribeModelsToTry();

  let lastError: GeminiError | null = null;

  for (const candidate of modelsToTry) {
    const resp = await tryTranscribeWithModel(candidate, userPrompt, input);
    if (resp.kind === "ok") return resp.result;
    if (resp.kind === "empty") {
      lastError = resp.error;
      logGeminiError(
        `transcribeAudio: ${candidate} returned empty text, falling back`,
        resp.error
      );
      continue;
    }
    if (resp.kind === "notfound") {
      lastError = resp.error;
      logGeminiError(
        `transcribeAudio: ${candidate} not found (404), falling back`,
        resp.error
      );
      continue;
    }
    // schema mismatch or other real error — propagate immediately
    throw resp.error;
  }

  // All models failed
  throw (
    lastError ??
    new GeminiError(
      "VOICE_EMPTY_RESPONSE",
      "No audio-capable model returned text. Check the server log for finishReason / usageMetadata. " +
        "Common causes: configured model name doesn't exist on Google's side, or audio MIME not supported."
    )
  );
}

/**
 * Returns true if the thrown error looks like a "model does not exist / not
 * available" 404 from the Gemini API (deprecated model, bad name, region
 * disabled). For these we want to fall back to another model, not surface
 * the error to the user.
 */
function isModelNotFoundError(e: unknown): boolean {
  if (!e) return false;
  // The GoogleGenAI SDK throws ApiError-like objects with a `status` field
  // and sometimes a `code` like "NOT_FOUND".
  const status = (e as { status?: number }).status;
  if (status === 404) return true;
  const code = String((e as { code?: string }).code ?? "").toUpperCase();
  if (code === "NOT_FOUND") return true;
  const message = String((e as { message?: string }).message ?? "").toLowerCase();
  if (
    message.includes("is no longer available") ||
    message.includes("model not found") ||
    message.includes("not found") ||
    message.includes("404")
  ) {
    return true;
  }
  return false;
}

async function tryTranscribeWithModel(
  model: string,
  userPrompt: string,
  input: { audioBase64: string; mimeType: string }
): Promise<
  | { kind: "ok"; result: TranscribeResult }
  | { kind: "empty"; error: GeminiError }
  | { kind: "notfound"; error: GeminiError }
  | { kind: "error"; error: GeminiError }
> {
  try {
    const resp = await generateContentResilient({
      context: `transcribeAudio[${model}]`,
      model,
      contents: [
        { text: userPrompt },
        { inlineData: { mimeType: input.mimeType, data: input.audioBase64 } },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: transcribeResponseSchema,
        temperature: 0.1,
        maxOutputTokens: 500,
      },
      disableSystemInstruction: true,
    });

    const raw = resp.text ?? "";
    if (!raw.trim()) {
      console.error(
        `[transcribeAudio] ${model} returned empty text. finishReason=${resp.candidates?.[0]?.finishReason}, parts=${JSON.stringify(
          resp.candidates?.[0]?.content?.parts?.map((p: { text?: string; inlineData?: { mimeType?: string } }) => ({
            hasText: typeof p.text === "string",
            textLen: typeof p.text === "string" ? p.text.length : 0,
            inlineMime: p.inlineData?.mimeType,
          }))
        )}, usage=${JSON.stringify(resp.usageMetadata)}`
      );
      return {
        kind: "empty",
        error: new GeminiError(
          "VOICE_EMPTY_RESPONSE",
          `Model ${model} returned empty text`
        ),
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = safeJsonParse(raw);
    }
    const v = transcribeResultSchema.safeParse(parsed);
    if (!v.success) {
      return {
        kind: "error",
        error: new GeminiError(
          "AI_INVALID_OUTPUT",
          `Schema mismatch from ${model}: ${v.error.message}. Raw: ${raw.slice(0, 300)}`
        ),
      };
    }
    return { kind: "ok", result: v.data };
  } catch (e) {
    if (isModelNotFoundError(e)) {
      return {
        kind: "notfound",
        error: new GeminiError(
          "MODEL_NOT_FOUND",
          `Model ${model} is not available: ${(e as Error).message}`
        ),
      };
    }
    if (e instanceof GeminiError) {
      return { kind: "error", error: e };
    }
    return {
      kind: "error",
      error: new GeminiError("VOICE_ERROR", (e as Error).message),
    };
  }
}

async function collectTranscribeModelsToTry(): Promise<string[]> {
  const tried = new Set<string>();
  const out: string[] = [];
  const primary = await pickTranscribeModel();
  if (primary) {
    out.push(primary);
    tried.add(primary);
  }
  for (const m of AUDIO_CAPABLE_FALLBACKS) {
    if (!tried.has(m)) {
      out.push(m);
      tried.add(m);
    }
  }
  return out;
}

/**
 * Typed error for TTS synthesis failures. The Gemini SDK throws
 * `ClientError` (4xx) or `ServerError` (5xx) with the HTTP status
 * embedded in the message string ("got status: 429 …"). We unwrap that
 * here so callers can branch on `kind`.
 */
export class TtsError extends Error {
  constructor(
    public readonly kind:
      | "RATE_LIMITED"
      | "QUOTA_EXHAUSTED"
      | "CLIENT_ERROR"
      | "SERVER_ERROR"
      | "NO_AUDIO",
    message: string,
    public readonly httpStatus?: number
  ) {
    super(message);
    this.name = "TtsError";
  }
  /** True when retrying won't help (rate limit / quota). */
  get isTerminal(): boolean {
    return this.kind === "RATE_LIMITED" || this.kind === "QUOTA_EXHAUSTED";
  }
}

/**
 * Inspect an SDK-thrown error and pull out the HTTP status + body if
 * present. The SDK encodes the status in the error message as
 * "got status: 429 Too Many Requests. {error: {...}}".
 */
function unwrapHttpStatus(e: unknown): { status?: number; bodySnippet?: string } {
  const msg = (e instanceof Error ? e.message : String(e)) ?? "";
  const m = /got status:\s*(\d{3})/.exec(msg);
  const status = m ? Number(m[1]) : undefined;
  // The body sits after the status text. Take everything after the first
  // "{". Truncate so we don't flood logs.
  const braceIdx = msg.indexOf("{");
  const bodySnippet =
    braceIdx >= 0 ? msg.slice(braceIdx, braceIdx + 300) : undefined;
  return { status, bodySnippet };
}

export async function synthesizeSpeech(input: {
  text: string;
  voice?: string;
  language?: "en" | "kn";
}): Promise<{ audioBase64: string; mimeType: string } | null> {
  const ai = getGemini();
  // Pick a voice that reads Kannada script well. Gemini TTS prebuilt
  // voices are multilingual; we use "Aoede" for Kannada because its
  // pacing reads non-Latin scripts clearly, and fall back to the
  // caller-supplied voice otherwise.
  const voiceName =
    input.voice ??
    (input.language === "kn" ? "Aoede" : "Kore");
  try {
    const resp = await ai.models.generateContent({
      model: MODELS.tts(),
      contents: [{ text: input.text }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } },
        },
      },
    });
    const part = resp.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part?.inlineData) {
      const finishReason = resp.candidates?.[0]?.finishReason;
      console.error(
        `[synthesizeSpeech] model=${MODELS.tts()} returned no audio data. ` +
          `finishReason=${finishReason}, parts=${JSON.stringify(
            resp.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => ({
              hasText: typeof p.text === "string",
              textLen: typeof p.text === "string" ? p.text.length : 0,
            }))
          )}`
      );
      throw new TtsError(
        "NO_AUDIO",
        `model=${MODELS.tts()} returned no audio data (finishReason=${finishReason})`
      );
    }
    return {
      audioBase64: part.inlineData.data ?? "",
      mimeType: part.inlineData.mimeType ?? "audio/wav",
    };
  } catch (e) {
    if (e instanceof TtsError) throw e;
    const { status, bodySnippet } = unwrapHttpStatus(e);
    // Log the full error detail before swallowing — this is the only place
    // we get to see HTTP status / body for SDK-thrown failures.
    logGeminiError("synthesizeSpeech", e);
    console.error(
      `[synthesizeSpeech] http status=${status ?? "(unknown)"}, body=${bodySnippet ?? "(no body)"}`
    );
    let kind: TtsError["kind"] = "CLIENT_ERROR";
    if (status === 429) kind = "RATE_LIMITED";
    else if (
      status !== undefined &&
      (status === 402 || /quota|exhausted|resource_exhausted/i.test(bodySnippet ?? ""))
    )
      kind = "QUOTA_EXHAUSTED";
    else if (status !== undefined && status >= 500) kind = "SERVER_ERROR";
    throw new TtsError(
      kind,
      `Gemini TTS failed (status=${status ?? "?"}): ${e instanceof Error ? e.message : String(e)}`,
      status
    );
  }
}

// Live session is opened from the client using ephemeral tokens
// (see app/api/voice/token). The server-side helpers below are used
// only to record session metadata.

export async function startLiveSessionServer(input: {
  draftId?: string;
  citizenId?: string;
}): Promise<{ sessionId: string }> {
  // Live API requires WebSocket from the client. Server only manages metadata.
  const { nanoid } = await import("nanoid");
  return { sessionId: nanoid() };
}
