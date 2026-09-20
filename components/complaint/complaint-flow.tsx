"use client";
import { useEffect, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { LocationVerification } from "./location-verification";
import { CameraCapture } from "./camera-capture";
import { ComplaintReview } from "./complaint-review";
import { ComplaintSuccess } from "./complaint-success";
import {
  VoiceAssistant,
  notifyRammanaLocationValid,
} from "./voice-assistant";
import { TextInput } from "./text-input";
import type {
  ComplaintState,
  ImageAnalysisResult,
  LocationReason,
  LocationValidationResult,
} from "@/lib/types";
import { ArrowLeft, Loader2, MessageSquare, Mic } from "lucide-react";

type FlowMode = "image" | "text";

type Action =
  | { type: "VOICE_CAPTURED"; transcript: string }
  | { type: "SKIP_VOICE" }
  | { type: "REQUEST_LOCATION" }
  | { type: "LOCATING" }
  | { type: "LOC_VALIDATING" }
  | { type: "LOC_VALID"; result: LocationValidationResult }
  | { type: "LOC_INVALID"; reason: LocationReason }
  | { type: "LOC_LOW_ACCURACY" }
  | { type: "REQUEST_CAMERA" }
  | { type: "IMAGE_UPLOADING" }
  | { type: "IMAGE_PROCESSING" }
  | {
      type: "IMAGE_VALID";
      imageId: string;
      analysis: ImageAnalysisResult;
      title: string;
      description: string;
      categoryId?: string;
      subcategoryId?: string;
      previewUrl?: string;
    }
  | { type: "IMAGE_INVALID"; reason: string }
  | { type: "SKIP_CAMERA" }
  | {
      type: "DESC_READY";
      text: string;
      normalized: string | null;
      categoryId?: string;
      subcategoryId?: string;
      title: string;
      description: string;
    }
  | { type: "SUBMITTING" }
  | { type: "REGISTERED"; complaintNumber: string }
  | { type: "GOTO"; state: ComplaintState };

interface State {
  step: ComplaintState;
  mode: FlowMode;
  text?: string;
  normalized?: string | null;
  categoryId?: string;
  subcategoryId?: string;
  location?: LocationValidationResult;
  imageId?: string;
  imagePreviewUrl?: string;
  analysis?: ImageAnalysisResult;
  title?: string;
  description?: string;
  complaintNumber?: string;
  errorReason?: string;
}

const initial: State = { step: "VOICE_GREETING", mode: "image" };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "VOICE_CAPTURED":
      return {
        ...s,
        step: "REQUEST_LOCATION",
        text: a.transcript,
        mode: "image",
      };
    case "SKIP_VOICE":
      return { ...s, step: "DESCRIBING", mode: "text" };
    case "REQUEST_LOCATION":
      return { ...s, step: "REQUEST_LOCATION" };
    case "LOCATING":
      return { ...s, step: "LOCATING" };
    case "LOC_VALIDATING":
      return { ...s, step: "LOCATION_VALIDATING" };
    case "LOC_VALID":
      return { ...s, step: "LOCATION_VALID", location: a.result };
    case "LOC_INVALID":
      return { ...s, step: "LOCATION_INVALID", errorReason: a.reason };
    case "LOC_LOW_ACCURACY":
      return { ...s, step: "LOCATION_LOW_ACCURACY", errorReason: "LOW_ACCURACY" };
    case "REQUEST_CAMERA":
      return { ...s, step: "REQUEST_CAMERA" };
    case "IMAGE_UPLOADING":
      return { ...s, step: "IMAGE_UPLOADING" };
    case "IMAGE_PROCESSING":
      return { ...s, step: "IMAGE_PROCESSING" };
    case "IMAGE_VALID":
      return {
        ...s,
        step: "REVIEW",
        mode: "image",
        imageId: a.imageId,
        analysis: a.analysis,
        title: a.title,
        description: a.description,
        categoryId: a.categoryId ?? s.categoryId,
        subcategoryId: a.subcategoryId ?? s.subcategoryId,
        imagePreviewUrl: a.previewUrl,
      };
    case "IMAGE_INVALID":
      return { ...s, step: "IMAGE_INVALID", errorReason: a.reason };
    case "SKIP_CAMERA":
      return { ...s, step: "DESCRIBING", mode: "text" };
    case "DESC_READY":
      return {
        ...s,
        step: "REVIEW",
        mode: "text",
        text: a.text,
        normalized: a.normalized,
        categoryId: a.categoryId,
        subcategoryId: a.subcategoryId,
        title: a.title,
        description: a.description,
      };
    case "SUBMITTING":
      return { ...s, step: "SUBMITTING" };
    case "REGISTERED":
      return { ...s, step: "REGISTERED", complaintNumber: a.complaintNumber };
    case "GOTO":
      return { ...s, step: a.state };
  }
}

export function ComplaintFlow({ draftId }: { draftId: string }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [describeWithVoice, setDescribeWithVoice] = useState(false);
  const router = useRouter();

  // Pick up any optional text the citizen typed on the home page and attach
  // it to the draft. The AI image analysis uses it as context; it is NOT
  // required — the photo alone is enough.
  useEffect(() => {
    const stashed = sessionStorage.getItem(`mgov_draft_text_${draftId}`);
    if (stashed && stashed.trim().length >= 3) {
      fetch(`/api/complaints/draft/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original_text: stashed.trim() }),
      }).catch(() => undefined);
    }
  }, [draftId]);

  const stepLabel = (() => {
    switch (state.step) {
      case "REQUEST_LOCATION":
      case "LOCATING":
      case "LOCATION_VALIDATING":
      case "LOCATION_VALID":
      case "LOCATION_INVALID":
      case "LOCATION_LOW_ACCURACY":
        return "Step 2 of 4 — Verify location";
      case "REQUEST_CAMERA":
      case "CAMERA_OPEN":
      case "IMAGE_UPLOADING":
      case "IMAGE_PROCESSING":
      case "IMAGE_INVALID":
        return "Step 3 of 4 — Photo evidence";
      case "VOICE_GREETING":
      case "VOICE_LISTENING":
        return "Step 1 of 4 — Tell Rammana your issue";
      case "DESCRIBING":
      case "DESCRIPTION_READY":
        return "Step 3 of 4 — Describe the issue";
      case "REVIEW":
        return "Step 4 of 4 — Review & submit";
      case "SUBMITTING":
        return "Submitting";
      case "REGISTERED":
        return "Done";
      default:
        return "Register complaint";
    }
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="text-xs uppercase tracking-wider text-white/40">{stepLabel}</div>
      </div>

      {/* STEP 1 — Rammana greets and captures the issue in Kannada */}
      {(state.step === "VOICE_GREETING" || state.step === "VOICE_LISTENING") && (
        <VoiceAssistant
          draftId={draftId}
          onLocationRequired={(transcript) => {
            dispatch({ type: "VOICE_CAPTURED", transcript });
          }}
          onCameraRequired={() => {
            dispatch({ type: "REQUEST_CAMERA" });
          }}
          onSkip={() => dispatch({ type: "SKIP_VOICE" })}
        />
      )}

      {/* STEP 2 — verify the citizen is inside the Mysuru service area */}
      {state.step === "REQUEST_LOCATION" && (
        <LocationVerification
          draftId={draftId}
          onLocating={() => dispatch({ type: "LOCATING" })}
          onValidating={() => dispatch({ type: "LOC_VALIDATING" })}
          onValid={(result) => {
            dispatch({ type: "LOC_VALID", result });
            // If we got here through the voice flow, let Rammana know
            // the user can now take a photo. The component reads from
            // window.__rammana; safe no-op if voice was skipped.
            notifyRammanaLocationValid();
            dispatch({ type: "REQUEST_CAMERA" });
          }}
          onInvalid={(reason) => dispatch({ type: "LOC_INVALID", reason })}
          onLowAccuracy={() => dispatch({ type: "LOC_LOW_ACCURACY" })}
        />
      )}

      {(state.step === "LOCATION_INVALID" || state.step === "LOCATION_LOW_ACCURACY") && (() => {
        const reason: LocationReason =
          state.step === "LOCATION_LOW_ACCURACY"
            ? "LOW_ACCURACY"
            : (state.errorReason as LocationReason) ?? "OUTSIDE_SERVICE_AREA";

        const { title, body } = (() => {
          switch (reason) {
            case "LOCATION_PERMISSION_DENIED":
              return {
                title: "Location permission needed",
                body:
                  "This portal only accepts complaints from inside the Mysuru service area. Please enable location access in your browser settings and try again.",
              };
            case "LOCATION_NETWORK_ERROR":
              return {
                title: "Couldn't reach the location service",
                body:
                  "We could not contact the server to verify your location. Check your internet connection and try again.",
              };
            case "GEOCODER_UNAVAILABLE":
              return {
                title: "Couldn't enrich your address",
                body:
                  "Your coordinates are inside the Mysuru service area, but our address lookup is temporarily unavailable. Please try again in a moment.",
              };
            case "INVALID_COORDINATES":
              return {
                title: "Invalid location coordinates",
                body:
                  "The location returned by your device was unreadable. Please try again in a moment.",
              };
            case "LOW_ACCURACY":
              return {
                title: "Couldn't accurately verify your location",
                body:
                  "Please move to an area with better GPS reception and try again.",
              };
            case "OUTSIDE_SERVICE_AREA":
            default:
              return {
                title: "Location outside service area",
                body:
                  "This complaint cannot currently be registered through the Mysuru Gov Complaint Portal because the selected location is outside the supported service area.",
              };
          }
        })();

        return (
          <div className="glass-card p-6 text-center">
            <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-rose-500/15 text-rose-300">
              ✕
            </div>
            <div className="text-lg font-medium">{title}</div>
            <div className="mx-auto mt-2 max-w-md text-sm text-white/60">{body}</div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button className="btn-ghost" onClick={() => dispatch({ type: "REQUEST_LOCATION" })}>
                Try Again
              </button>
              <button className="btn-ghost" onClick={() => router.push("/")}>
                Go Back
              </button>
            </div>
          </div>
        );
      })()}

      {/* STEP 2 — camera immediately after location */}
      {state.step === "REQUEST_CAMERA" && (
        <CameraCapture
          draftId={draftId}
          complaintText={state.text ?? ""}
          onUploading={() => dispatch({ type: "IMAGE_UPLOADING" })}
          onProcessing={() => dispatch({ type: "IMAGE_PROCESSING" })}
          onValid={(imageId, analysis, title, description, categoryId, subcategoryId, previewUrl) =>
            dispatch({
              type: "IMAGE_VALID",
              imageId,
              analysis,
              title,
              description,
              categoryId,
              subcategoryId,
              previewUrl,
            })
          }
          onInvalid={(reason) => dispatch({ type: "IMAGE_INVALID", reason })}
          onSkip={() => dispatch({ type: "SKIP_CAMERA" })}
          onCancel={() => dispatch({ type: "REQUEST_LOCATION" })}
        />
      )}

      {state.step === "IMAGE_INVALID" && (
        <div className="glass-card p-6 text-center">
          <div className="text-lg font-medium">Couldn't clearly identify the problem</div>
          <div className="mx-auto mt-2 max-w-md text-sm text-white/60">
            Please take a clearer photo showing the issue, or describe it in text instead.
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button className="btn-primary" onClick={() => dispatch({ type: "REQUEST_CAMERA" })}>
              Retake Photo
            </button>
            <button className="btn-ghost" onClick={() => dispatch({ type: "SKIP_CAMERA" })}>
              Describe without a photo
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 (fallback) — describe in text or voice when camera is skipped */}
      {state.step === "DESCRIBING" && (
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            <button
              className={`btn-ghost ${!describeWithVoice ? "bg-white/[0.08]" : ""}`}
              onClick={() => setDescribeWithVoice(false)}
            >
              <MessageSquare className="h-4 w-4" /> Type it
            </button>
            <button
              className={`btn-ghost ${describeWithVoice ? "bg-white/[0.08]" : ""}`}
              onClick={() => setDescribeWithVoice(true)}
            >
              <Mic className="h-4 w-4" /> Speak it
            </button>
          </div>

          {!describeWithVoice ? (
            <TextInput
              draftId={draftId}
              initial=""
              note="You're describing the issue without a photo. A clear description helps us route it correctly."
              onDone={({ text, normalized, categoryId, subcategoryId }) => {
                const desc = (normalized ?? text).trim();
                dispatch({
                  type: "DESC_READY",
                  text,
                  normalized,
                  categoryId,
                  subcategoryId,
                  title: desc.length > 80 ? desc.slice(0, 77) + "…" : desc,
                  description: desc,
                });
              }}
            />
          ) : (
            // "Speak it" inside the DESCRIBING step is now just a launcher
            // for the full Rammana flow at the start of the pipeline.
            <div className="space-y-3 text-center">
              <p className="text-sm text-white/60">
                Rammana needs to ask a couple of questions first — turn on your
                microphone and location to continue.
              </p>
              <button
                className="btn-primary"
                onClick={() => dispatch({ type: "GOTO", state: "VOICE_GREETING" })}
              >
                <Mic className="h-4 w-4" /> Start with Rammana
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 3 — review (shared between image mode and text mode) */}
      {state.step === "REVIEW" && state.location && (
        <ComplaintReview
          draftId={draftId}
          title={state.title ?? ""}
          description={state.description ?? ""}
          categoryId={state.categoryId}
          subcategoryId={state.subcategoryId}
          categoryLabel={
            state.mode === "image" && state.analysis
              ? `${state.analysis.category ?? ""}${state.analysis.subcategory ? " / " + state.analysis.subcategory : ""}`
              : undefined
          }
          imagePreviewUrl={state.imagePreviewUrl}
          location={state.location}
          originalText={state.text}
          canRetakePhoto={state.mode === "image"}
          onSubmitting={() => dispatch({ type: "SUBMITTING" })}
          onRegistered={(num) => dispatch({ type: "REGISTERED", complaintNumber: num })}
          onRetake={() => dispatch({ type: "REQUEST_CAMERA" })}
        />
      )}

      {state.step === "SUBMITTING" && (
        <div className="glass-card flex items-center justify-center gap-3 p-10 text-white/70">
          <Loader2 className="h-5 w-5 animate-spin" /> Submitting your complaint...
        </div>
      )}

      {state.step === "REGISTERED" && state.complaintNumber && (
        <ComplaintSuccess
          complaintNumber={state.complaintNumber}
          imagePreviewUrl={state.imagePreviewUrl}
        />
      )}
    </div>
  );
}
