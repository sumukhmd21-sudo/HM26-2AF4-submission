import { GoogleGenAI, type GenerateContentConfig } from "@google/genai";

let _client: GoogleGenAI | null = null;

/**
 * Serialize every own property on a thrown value. The @google/genai SDK
 * throws objects with non-Error shapes (`{status, code, message, errorDetails}`),
 * and standard `e.message` only captures part of the picture.
 */
function serializeError(e: unknown): Record<string, unknown> {
  if (e === null || e === undefined) return { value: String(e) };
  if (typeof e === "string") return { message: e };
  if (e instanceof Error) {
    return {
      name: e.name,
      message: e.message,
      stack: e.stack?.split("\n").slice(0, 5).join("\n"),
      ...Object.fromEntries(
        Object.getOwnPropertyNames(e)
          .filter((k) => !["name", "message", "stack"].includes(k))
          .map((k) => [k, (e as Record<string, unknown>)[k]])
      ),
    };
  }
  if (typeof e === "object") {
    try {
      return JSON.parse(JSON.stringify(e, Object.getOwnPropertyNames(e)));
    } catch {
      return { value: String(e) };
    }
  }
  return { value: String(e) };
}

export function logGeminiError(context: string, e: unknown): void {
  const detail = serializeError(e);
  console.error(
    `[gemini:${context}] ${detail.name ?? "Error"}: ${detail.message ?? "(no message)"}`,
    JSON.stringify(detail, null, 2)
  );
}

export function getGemini(): GoogleGenAI {
  if (_client) return _client;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new GeminiError(
      "CONFIG_ERROR",
      "GEMINI_API_KEY is not configured. Set it in .env and restart the dev server."
    );
  }
  _client = new GoogleGenAI({ apiKey: key });
  return _client;
}

/**
 * Models that have been confirmed to NOT support audio output but are
 * occasionally misconfigured as the TTS model. If we see one of these
 * fall back to a known-working TTS model rather than silently
 * producing no audio (which manifests as a 503 to the user).
 */
const BAD_TTS_MODEL_NAMES = new Set([
  "gemini-3.6-flash-tts",
  "gemini-3.6-flash",
  "gemini-3.6-pro",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
]);
const FALLBACK_TTS_MODEL = "gemini-2.5-flash-preview-tts";

export const MODELS = {
  analysis: () => requiredEnv("GEMINI_ANALYSIS_MODEL"),
  transcribe: () => requiredEnv("GEMINI_TRANSCRIBE_MODEL"),
  transcribeLive: () => requiredEnv("GEMINI_TRANSCRIBE_LIVE_MODEL"),
  live: () => requiredEnv("GEMINI_LIVE_MODEL"),
  tts: () => {
    const configured = process.env.GEMINI_TTS_MODEL;
    if (configured && !BAD_TTS_MODEL_NAMES.has(configured)) {
      return configured;
    }
    if (configured && BAD_TTS_MODEL_NAMES.has(configured)) {
      console.warn(
        `[gemini] GEMINI_TTS_MODEL=${configured} does not support audio output. ` +
          `Falling back to ${FALLBACK_TTS_MODEL}. Update .env to fix this permanently.`
      );
    }
    return FALLBACK_TTS_MODEL;
  },
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new GeminiError("CONFIG_ERROR", `${name} not set`);
  return v;
}

export class GeminiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "GeminiError";
  }
}

/**
 * Some Gemini model families (notably `gemini-*-transcribe*`, native audio,
 * and image-only variants) reject `systemInstruction` with a 400
 * "Developer instruction is not enabled for this model" error.
 *
 * This helper calls Gemini with the given config and, if the API rejects
 * because of system / developer instructions, retries once without
 * `systemInstruction` (inlining its text into the user prompt instead).
 *
 * It also retries if `responseMimeType: "application/json"` is rejected —
 * `gemini-*-transcribe*` doesn't support structured JSON output either,
 * and we fall back to plain-text parsing of a JSON-looking string.
 */
export async function generateContentResilient(args: {
  context: string;
  model: string;
  contents: Parameters<GoogleGenAI["models"]["generateContent"]>[0]["contents"];
  config: GenerateContentConfig;
  /** If true, we will not include systemInstruction even on first try. */
  disableSystemInstruction?: boolean;
  /** If true, we will not request JSON output even on first try. */
  disableJsonOutput?: boolean;
  /** Optional text to append to the last user-content part if we have to
   *  drop the system instruction. */
  inlineSystemText?: string;
}): Promise<Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>> {
  const ai = getGemini();
  const triedNoSys = { v: false };
  const triedNoJson = { v: false };

  const buildConfig = (): GenerateContentConfig => {
    const cfg: GenerateContentConfig = { ...args.config };
    if (args.disableSystemInstruction) delete cfg.systemInstruction;
    if (args.disableJsonOutput) delete (cfg as Record<string, unknown>).responseMimeType;
    return cfg;
  };

  const buildContents = (withInlinedSys: boolean) => {
    if (!withInlinedSys || !args.inlineSystemText) return args.contents;
    return inlineIntoLastUserTurn(args.contents, args.inlineSystemText);
  };

  // First attempt
  let resp;
  try {
    resp = await ai.models.generateContent({
      model: args.model,
      contents: buildContents(false),
      config: buildConfig(),
    });
    return resp;
  } catch (e) {
    const reason = isDeveloperInstructionError(e);
    if (reason && !triedNoSys.v && args.config.systemInstruction) {
      triedNoSys.v = true;
      logGeminiError(
        `${args.context}: model rejected systemInstruction, retrying without`,
        e
      );
      try {
        resp = await ai.models.generateContent({
          model: args.model,
          contents: buildContents(true),
          config: (() => {
            const c = { ...args.config };
            delete c.systemInstruction;
            return c;
          })(),
        });
        return resp;
      } catch (e2) {
        // fall through
        e = e2;
      }
    }
    const jsonReason = isResponseMimeTypeError(e);
    if (jsonReason && !triedNoJson.v) {
      triedNoJson.v = true;
      logGeminiError(
        `${args.context}: model rejected responseMimeType=application/json, retrying as text`,
        e
      );
      try {
        resp = await ai.models.generateContent({
          model: args.model,
          contents: buildContents(triedNoSys.v),
          config: (() => {
            const c = { ...args.config };
            if (triedNoSys.v) delete c.systemInstruction;
            delete (c as Record<string, unknown>).responseMimeType;
            return c;
          })(),
        });
        return resp;
      } catch {
        throw e;
      }
    }
    throw e;
  }
}

function isDeveloperInstructionError(e: unknown): boolean {
  const s = serializeError(e);
  const msg = String(s.message ?? "").toLowerCase();
  const code = String((s as { code?: string }).code ?? "").toUpperCase();
  return (
    code === "INVALID_ARGUMENT" &&
    (msg.includes("developer instruction") ||
      msg.includes("system instruction") ||
      msg.includes("system_instruction") ||
      msg.includes("not enabled for this model"))
  );
}

function isResponseMimeTypeError(e: unknown): boolean {
  const s = serializeError(e);
  const msg = String(s.message ?? "").toLowerCase();
  const code = String((s as { code?: string }).code ?? "").toUpperCase();
  return (
    code === "INVALID_ARGUMENT" &&
    (msg.includes("response mime") ||
      msg.includes("application/json") ||
      msg.includes("structured output") ||
      msg.includes("not enabled for this model"))
  );
}

function inlineIntoLastUserTurn(
  contents: Parameters<GoogleGenAI["models"]["generateContent"]>[0]["contents"],
  extra: string
): Parameters<GoogleGenAI["models"]["generateContent"]>[0]["contents"] {
  if (typeof contents === "string") return `${extra}\n\n${contents}`;
  const arr = contents as Array<{ text?: string; inlineData?: unknown }>;
  const lastIdx = arr.length - 1;
  if (lastIdx < 0) return arr;
  const last = arr[lastIdx];
  if (typeof (last as { text?: string }).text === "string") {
    arr[lastIdx] = {
      ...last,
      text: `${extra}\n\n${(last as { text: string }).text}`,
    };
  } else {
    arr.push({ text: extra });
  }
  return arr;
}

/**
 * Lenient JSON parser. Tries, in order:
 *   1. Direct parse
 *   2. Strip ```json / ``` fences
 *   3. Extract the first {...} or [...] block
 *   4. If the response looks like prose with embedded JSON, return { _raw: text }
 *      so the caller can still surface useful error info instead of crashing.
 */
export function safeJsonParse(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new GeminiError("AI_INVALID_OUTPUT", "Model returned empty response");
  }

  // Direct
  try {
    return JSON.parse(trimmed);
  } catch {
    /* continue */
  }

  // Strip fences (```json, ```JSON, ```, with optional trailing language tag)
  const fenced = trimmed
    .replace(/^```(?:json|JSON)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  if (fenced !== trimmed) {
    try {
      return JSON.parse(fenced);
    } catch {
      /* continue */
    }
  }

  // Strip leading prose like "Here is the JSON:\n{...}"
  const firstBrace = fenced.indexOf("{");
  const firstBracket = fenced.indexOf("[");
  let start = -1;
  if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);

  if (start >= 0) {
    const lastBrace = fenced.lastIndexOf("}");
    const lastBracket = fenced.lastIndexOf("]");
    const end = Math.max(lastBrace, lastBracket);
    if (end > start) {
      const candidate = fenced.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        /* fall through */
      }
    }
  }

  // Last resort: log the raw text we couldn't parse
  throw new GeminiError(
    "AI_INVALID_OUTPUT",
    `Model returned non-JSON (first 200 chars): ${trimmed.slice(0, 200)}`
  );
}
