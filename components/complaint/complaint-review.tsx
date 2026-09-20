"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { LocationValidationResult } from "@/lib/types";

const ReviewMap = dynamic(() => import("./location-map"), { ssr: false });

export function ComplaintReview({
  draftId,
  title,
  description,
  categoryId,
  subcategoryId,
  categoryLabel,
  imagePreviewUrl,
  location,
  originalText,
  canRetakePhoto,
  onSubmitting,
  onRegistered,
  onRetake,
}: {
  draftId: string;
  title: string;
  description: string;
  categoryId?: string;
  subcategoryId?: string;
  categoryLabel?: string;
  imagePreviewUrl?: string;
  location: LocationValidationResult;
  originalText?: string;
  canRetakePhoto: boolean;
  onSubmitting: () => void;
  onRegistered: (complaintNumber: string) => void;
  onRetake: () => void;
}) {
  const router = useRouter();
  const [t, setT] = useState(title);
  const [d, setD] = useState(description);
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!categoryId || !subcategoryId) {
      setError("Missing category. Please go back and try again.");
      return;
    }
    const finalDescription = extra.trim()
      ? `${d.trim()}\n\nAdditional details from citizen: ${extra.trim()}`
      : d.trim();
    setBusy(true);
    setError(null);
    onSubmitting();
    try {
      const r = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          title: t.trim(),
          description: finalDescription,
          categoryId,
          subcategoryId,
        }),
      });
      if (r.status === 401) {
        // Not signed in — send the user to login, then back here.
        router.push(`/auth/login?next=${encodeURIComponent(`/complaints/new?draft=${draftId}`)}`);
        return;
      }
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "SUBMISSION_ERROR");
      onRegistered(j.complaint.complaint_number);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="glass-card space-y-5 p-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-white/40">
          Complaint review
        </div>
        <h2 className="mt-1 text-lg font-medium">Confirm before submitting</h2>
        <p className="mt-1 text-sm text-white/50">
          {canRetakePhoto
            ? "We analyzed your photo and filled this in for you. Edit anything below, or add extra details — all optional."
            : "Review the complaint details below. You can edit them before submitting."}
        </p>
      </div>

      <Field label="Title">
        <input
          value={t}
          onChange={(e) => setT(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/40"
        />
      </Field>

      <Field label="Category">
        <div className="text-sm text-white/80">
          {categoryLabel?.replace(/_/g, " ") ?? "Auto-classified"}
        </div>
      </Field>

      <Field label="Description">
        <textarea
          value={d}
          onChange={(e) => setD(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/40"
        />
      </Field>

      <Field label="Add details or corrections (optional)">
        <textarea
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          rows={3}
          placeholder="Anything else we should know? Landmark, how long it's been there, etc."
          className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
        />
      </Field>

      <Field label="Location">
        <div className="text-sm text-white/80">
          ✓ Location verified — {location.city ?? "Mysuru"}, {location.state ?? "Karnataka"}
        </div>
        {typeof location.latitude === "number" && typeof location.longitude === "number" && (
          <div className="mt-2">
            <ReviewMap
              coords={{
                lat: location.latitude,
                lng: location.longitude,
                accuracy: location.accuracyMeters,
              }}
            />
          </div>
        )}
      </Field>

      {imagePreviewUrl && (
        <Field label="Photo evidence">
          <img
            src={imagePreviewUrl}
            alt="Complaint evidence"
            className="aspect-video w-full rounded-xl border border-white/10 object-cover"
          />
        </Field>
      )}
      {!imagePreviewUrl && !canRetakePhoto && (
        <Field label="Photo evidence">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/50">
            No photo attached — filed without photographic evidence.
          </div>
        </Field>
      )}

      {originalText && (
        <Field label="Original report">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/70">
            &ldquo;{originalText}&rdquo;
          </div>
        </Field>
      )}

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {canRetakePhoto && (
          <button className="btn-ghost" onClick={onRetake}>
            Retake Photo
          </button>
        )}
        <button className="btn-primary" disabled={busy || t.trim().length < 3 || d.trim().length < 10} onClick={submit}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Submit Complaint
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-wider text-white/40">
        {label}
      </div>
      {children}
    </div>
  );
}
