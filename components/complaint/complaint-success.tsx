"use client";
import Link from "next/link";
import { Check, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Numbers 0-9 in Kannada script — used to render the tracking ID in
 * the local script so citizens who can't read English can copy it down.
 */
const KN_DIGITS = ["೦", "೧", "೨", "೩", "೪", "೫", "೬", "೭", "೮", "೯"];

function toKannadaDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => KN_DIGITS[Number(d)]);
}

export function ComplaintSuccess({
  complaintNumber,
  imagePreviewUrl,
}: {
  complaintNumber: string;
  imagePreviewUrl?: string;
}) {
  const [spoken, setSpoken] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Auto-speak the tracking ID in Kannada on mount.
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `ನಿಮ್ಮ ದೂರಿನ ಸಂಖ್ಯೆ ${complaintNumber}. ದೂರು ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ.`,
            language: "kn",
          }),
        });
        if (!r.ok || cancelled) return;
        const j = await r.json();
        const audio = new Audio(`data:${j.mimeType};base64,${j.audioBase64}`);
        audioRef.current = audio;
        audio.onended = () => setSpoken(true);
        audio.play().catch(() => setSpoken(true));
      } catch {
        setSpoken(true);
      }
    })();
    return () => {
      cancelled = true;
      audioRef.current?.pause();
    };
  }, [complaintNumber]);

  const replay = async () => {
    setSpoken(false);
    try {
      const r = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `ನಿಮ್ಮ ದೂರಿನ ಸಂಖ್ಯೆ ${complaintNumber}.`,
          language: "kn",
        }),
      });
      if (!r.ok) return;
      const j = await r.json();
      const audio = new Audio(`data:${j.mimeType};base64,${j.audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => setSpoken(true);
      audio.play().catch(() => setSpoken(true));
    } catch {
      setSpoken(true);
    }
  };

  return (
    <div className="glass-card space-y-5 p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
        <Check className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Complaint Registered</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-white/60">
          ದೂರು ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ — your complaint has been successfully submitted to Mysuru Gov.
        </p>
      </div>

      {imagePreviewUrl && (
        <img
          src={imagePreviewUrl}
          alt="Issue evidence"
          className="mx-auto aspect-video max-h-56 w-full max-w-md rounded-xl border border-white/10 object-cover"
        />
      )}

      <div className="mx-auto inline-block rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3">
        <div className="text-xs uppercase tracking-wider text-white/40">
          Tracking ID
        </div>
        <div className="font-mono text-lg text-blue-300">{complaintNumber}</div>
        <div className="mt-1 font-mono text-lg text-blue-300/80" lang="kn">
          {toKannadaDigits(complaintNumber)}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-white/50">
        <Volume2 className="h-3.5 w-3.5" />
        {spoken ? "Spoken in Kannada" : "Speaking…"}
        <button className="btn-ghost ml-2 text-xs" onClick={replay}>
          Replay
        </button>
      </div>

      <p className="text-xs text-white/40">
        Save this ID — you'll need it to track your complaint.
        <br />
        ಈ ಸಂಖ್ಯೆಯನ್ನು ಉಳಿಸಿಕೊಳ್ಳಿ.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href={`/complaints/${complaintNumber}`} className="btn-primary">
          Track Complaint
        </Link>
        <Link href="/" className="btn-ghost">
          Register Another Complaint
        </Link>
      </div>
    </div>
  );
}