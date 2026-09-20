"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function TextInput({
  draftId,
  initial,
  note,
  onDone,
}: {
  draftId: string;
  initial: string;
  note?: string;
  onDone: (v: {
    text: string;
    normalized: string | null;
    categoryId?: string;
    subcategoryId?: string;
  }) => void;
}) {
  const [text, setText] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setText(initial), [initial]);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/complaints/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, draftId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "AI_FAILURE");
      if (!j.result.intentDetected) {
        setError(
          j.result.clarificationQuestion ??
            "We couldn't understand this as a civic complaint. Please try rephrasing."
        );
        return;
      }
      onDone({
        text,
        normalized: j.result.normalizedStatement,
        categoryId: j.categoryId,
        subcategoryId: j.subcategoryId,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-medium">Describe the problem</h2>
      <p className="mt-1 text-sm text-white/60">
        In a few words, describe the civic issue you want to report.
      </p>
      {note && (
        <p className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
          {note}
        </p>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="e.g., There is a large pothole near the bus stop."
        className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
      />
      {error && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <button
          className="btn-primary disabled:opacity-50"
          disabled={loading || text.trim().length < 3}
          onClick={submit}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
        </button>
      </div>
    </div>
  );
}
