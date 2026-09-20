"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, Volume2, VolumeX, Play } from "lucide-react";

type Message = { role: "user" | "assistant"; text: string; kn?: string };

export type RammanaStep =
  | { kind: "GREETING" }
  | { kind: "AWAITING_ISSUE" }
  | { kind: "PROCESSING_ISSUE" }
  | { kind: "AWAITING_LOCATION"; voiceTranscript: string }
  | { kind: "AWAITING_CAMERA"; voiceTranscript: string };

const GREETING_KN =
  "ನಮಸ್ಕಾರ. ನನ್ನ ಹೆಸರು ರಾಮ್ಮಣ. ನಿಮ್ಮ ಸಮಸ್ಯೆ ಯೇನು? ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ವಿವರಿಸಿ.";
const GREETING_TRANSCRIPT =
  "Namaskara. Nanna hesaru Rammana. Nimma sankatake yenu? Dayavittu svalpa vivarishu.";

/**
 * Rammana — the Kannada-speaking voice assistant for the complaint portal.
 *
 * Browser autoplay policy requires a user gesture before any audio can
 * play. We therefore start in a "Press to begin" state: tapping the big
 * primary button unlocks the AudioContext, primes a silent HTMLAudio
 * element by playing it once, and kicks off the Kannada greeting.
 * Every later utterance happens after a user gesture (mic tap, etc.),
 * so they always play.
 *
 * State machine:
 *   GREETING ──tap──▶ AWAITING_ISSUE ──mic──▶ PROCESSING_ISSUE
 *       ──▶ AWAITING_LOCATION ──(parent notifies location ok)──▶ AWAITING_CAMERA
 */
export function VoiceAssistant({
  draftId,
  onLocationRequired,
  onCameraRequired,
  onSkip,
}: {
  draftId: string;
  onLocationRequired: (voiceTranscript: string) => void;
  onCameraRequired: (voiceTranscript: string) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState<RammanaStep>({ kind: "GREETING" });
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  // Messages start empty — the greeting is appended exactly once, when the
  // user taps "Press to begin". Seeding it here caused a duplicate bubble
  // when the same utterance was later appended by beginConversation / speak.
  const [messages, setMessages] = useState<Message[]>([]);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stepRef = useRef(step);
  stepRef.current = step;
  // Tracks whether the user has interacted with the page yet. Without this
  // flag we'd try to .play() audio from a useEffect on mount, which every
  // browser blocks because there's been no user gesture.
  const interactedRef = useRef(false);
  // Tracks messages already appended by id (kn|text), so retries / dup
  // paths don't re-append the same bubble to the conversation.
  const messageIdsRef = useRef<Set<string>>(new Set());

  /**
   * Unlock the browser's audio pipeline on a user gesture.
   * Two complementary tricks:
   *   1. Create (and resume) an AudioContext — unlocks Web Audio in
   *      Chrome/Safari.
   *   2. Build a silent HTMLAudioElement and play() it once. Even with
   *      no real source, this counts as a gesture-initiated media
   *      element so subsequent fetch()-based audio.play() works.
   */
  const unlockAudio = async () => {
    try {
      const Ctx =
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext ?? window.AudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        audioCtxRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume();
      }
    } catch {
      // ignore — some browsers expose AudioContext differently
    }
    try {
      // 1-byte WAV header + silence. Plays instantly, primes the
      // <audio> element so later fetch()-based playback is allowed.
      const a = new Audio(
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA="
      );
      a.muted = true;
      await a.play().catch(() => undefined);
    } catch {
      // ignore
    }
  };

  const speak = async (text: string, kn?: string) => {
    setTtsError(null);
    // Dedup: if the same utterance already exists in the conversation,
    // don't re-append it. This stops retry attempts / multi-call paths
    // from producing duplicate bubbles.
    const id = `${kn ?? ""}|${text}`;
    if (messageIdsRef.current.has(id)) return;
    messageIdsRef.current.add(id);
    setMessages((m) => [...m, { role: "assistant", text, kn }]);
    if (muted) return;
    // Don't try to play audio before the user has interacted. Audio
    // play() is silently blocked by every browser until first user
    // gesture, and retrying only spams logs.
    if (!interactedRef.current) return;
    try {
      const r = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: kn ?? text, language: "kn" }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        if (body.error === "TTS_RATE_LIMITED") {
          setTtsError(
            "Rammana's voice is rate-limited right now. Showing text only — please try again in a minute."
          );
        } else {
          setTtsError(
            `TTS unavailable (${r.status}${body.error ? ": " + body.error : ""}). Showing text only.`
          );
        }
        return;
      }
      const j = await r.json();
      const audio = new Audio(`data:${j.mimeType};base64,${j.audioBase64}`);
      try {
        await audio.play();
      } catch {
        setTtsError("Browser blocked audio playback. Tap the mic to retry.");
      }
    } catch (e) {
      setTtsError(
        `TTS request failed: ${(e as Error).message}. Showing text only.`
      );
    }
  };

  /**
   * Called from the big "Press to begin" button. Marks the user as
   * interacted, unlocks audio, then speaks the greeting.
   */
  const beginConversation = async () => {
    interactedRef.current = true;
    await unlockAudio();
    await speak(GREETING_TRANSCRIPT, GREETING_KN);
    setStep({ kind: "AWAITING_ISSUE" });
  };

  const start = async () => {
    setError(null);
    interactedRef.current = true;
    // The mic tap is a fresh user gesture — re-unlock in case the OS
    // suspended our AudioContext while the tab was backgrounded.
    await unlockAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await sendAudio();
      };
      rec.start();
      mediaRef.current = rec;
      setRecording(true);
    } catch {
      setError(
        "Voice assistance is unavailable. You can continue by typing your complaint."
      );
    }
  };

  const stop = () => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    setRecording(false);
  };

  async function sendAudio() {
    setBusy(true);
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const fd = new FormData();
      fd.append("audio", blob, "recording.webm");
      fd.append("draftId", draftId);
      fd.append("mimeType", blob.type);
      const r = await fetch("/api/voice/transcribe", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "VOICE_ERROR");
      const transcript: string = j.result.transcript?.trim() ?? "";
      if (!transcript) {
        await speak(
          "Kshaminisu, nanage aravagilla. Dayavittu modalu vivarisisi.",
          "ಕ್ಷಮಿಸಿ, ನನಗೆ ಅರ್ವಗಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ವಿವರಿಸಿ."
        );
        setStep({ kind: "AWAITING_ISSUE" });
        return;
      }

      setMessages((m) => [...m, { role: "user", text: transcript }]);

      const current = stepRef.current;
      if (current.kind === "AWAITING_ISSUE") {
        setStep({ kind: "PROCESSING_ISSUE" });
        await speak(
          "Dhanyavada. Idu nimma sthaladalli ideyannu nirnayisuva nimma live location on madi.",
          "ಧನ್ಯವಾದ. ಇದು ನಿಮ್ಮ ಸ್ಥಳದಲ್ಲಿ ಇದೆಯಂತೆ ನಿರ್ಣಯಿಸಲು ನಿಮ್ಮ live location on ಮಾಡಿ."
        );
        setStep({ kind: "AWAITING_LOCATION", voiceTranscript: transcript });
        onLocationRequired(transcript);
        return;
      }

      if (current.kind === "AWAITING_LOCATION") {
        await speak(
          "Dhanyavada. Idu nimma sthaladalli ideyannu nirnayisuva nimma live location on madi.",
          "ಧನ್ಯವಾದ. ಇದು ನಿಮ್ಮ ಸ್ಥಳದಲ್ಲಿ ಇದೆಯಂತೆ ನಿರ್ಣಯಿಸಲು ನಿಮ್ಮ live location on ಮಾಡಿ."
        );
        return;
      }

      if (current.kind === "AWAITING_CAMERA") {
        await speak(
          "Dayavittu problem clear ga gottagutte foto turi.",
          "ದಯವಿಟ್ಟು ಸಮಸ್ಯೆ ಸ್ಪಷ್ಟವಾಗಿ ಗೊತ್ತಾಗುವಂತೆ ಫೋಟೋ ತೆಗೆಯಿರಿ."
        );
        return;
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Called by the parent once location is validated. Tells Rammana to
   * advance to the camera phase.
   */
  function announceCameraReady() {
    const current = stepRef.current;
    if (current.kind === "AWAITING_LOCATION") {
      setStep({ kind: "AWAITING_CAMERA", voiceTranscript: current.voiceTranscript });
    }
    speak(
      "Sthalaviddu. Dayavittu photo turi, problem clear ga gottagutte.",
      "ಸ್ಥಳ ಸರಿಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಫೋಟೋ ತೆಗೆಯಿರಿ, ಸಮಸ್ಯೆ ಸ್ಪಷ್ಟವಾಗಿ ಗೊತ್ತಾಗುವಂತೆ."
    ).then(() => {
      const t = stepRef.current;
      if (t.kind === "AWAITING_CAMERA") onCameraRequired(t.voiceTranscript);
    });
  }

  // Expose imperative handle for the parent.
  useEffect(() => {
    (window as unknown as Record<string, unknown>)["__rammana"] = {
      announceCameraReady,
    };
    return () => {
      delete (window as unknown as Record<string, unknown>)["__rammana"];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const micLabel = (() => {
    if (recording) return "Tap to stop";
    switch (step.kind) {
      case "GREETING":
        return "Press the big button to begin";
      case "AWAITING_ISSUE":
        return "Tap to describe the issue";
      case "PROCESSING_ISSUE":
        return "Processing...";
      case "AWAITING_LOCATION":
        return "Location required — open the location step";
      case "AWAITING_CAMERA":
        return "Location verified — open the camera";
    }
  })();

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-button-gradient text-white shadow-glow">
          <Volume2 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-medium">Rammana</h2>
          <p className="text-xs text-white/50">
            ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುವ ಸಹಾಯಕ — your Kannada-speaking helper
          </p>
        </div>
        <button
          className="btn-ghost"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute Rammana" : "Mute Rammana"}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-button-gradient text-white"
                  : "bg-white/[0.05] text-white/80"
              }`}
            >
              {m.kn && (
                <div className="mb-1 text-base font-medium leading-snug" lang="kn">
                  {m.kn}
                </div>
              )}
              {m.text && m.text !== m.kn && (
                <div className="text-xs text-white/50">{m.text}</div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Loader2 className="h-3 w-3 animate-spin" /> Processing...
          </div>
        )}
      </div>

      {ttsError && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {ttsError}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-col items-center gap-2">
        {step.kind === "GREETING" ? (
          <button
            onClick={beginConversation}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base shadow-glow"
            aria-label="Press to begin with Rammana"
          >
            <Play className="h-5 w-5" />
            ಪ್ರಾರಂಭಿಸಿ — Press to begin
          </button>
        ) : (
          <div className="flex items-center gap-3">
            {!recording ? (
              <button
                onClick={start}
                disabled={step.kind === "PROCESSING_ISSUE"}
                className="grid h-16 w-16 place-items-center rounded-full bg-button-gradient shadow-glow disabled:opacity-50"
                aria-label="Start recording"
              >
                <Mic className="h-6 w-6" />
              </button>
            ) : (
              <button
                onClick={stop}
                className="grid h-16 w-16 place-items-center rounded-full bg-rose-500 shadow-glow"
                aria-label="Stop recording"
              >
                <Square className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="text-xs text-white/50">{micLabel}</div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-white/40">
        <span>Audio responses when available.</span>
        <button className="btn-ghost text-xs" onClick={onSkip}>
          Skip voice — type instead
        </button>
      </div>
    </div>
  );
}

/**
 * Helper that the parent calls once location validation succeeds.
 * Looks up the imperative Rammana handle that the active instance
 * stashed on `window` and tells it to advance to the camera phase.
 */
export function notifyRammanaLocationValid(): void {
  const handle = (
    window as unknown as {
      __rammana?: { announceCameraReady?: () => void };
    }
  ).__rammana;
  handle?.announceCameraReady?.();
}