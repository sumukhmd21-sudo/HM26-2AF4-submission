"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Plus, ArrowRight, Loader2 } from "lucide-react";

export function ComplaintInput() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function start(textArg?: string) {
    const value = (textArg ?? text).trim();
    setLoading(true);
    try {
      const r = await fetch("/api/complaints/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const j = await r.json();
      if (j.draft?.id) {
        // Optional context text — the flow works with or without it.
        if (value.length >= 3) {
          sessionStorage.setItem(`mgov_draft_text_${j.draft.id}`, value);
        }
        router.push(`/complaints/new?draft=${j.draft.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="pill-input"
      onSubmit={(e) => {
        e.preventDefault();
        start();
      }}
    >
      <button
        type="button"
        aria-label="Start a complaint"
        className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
        onClick={() => start()}
      >
        <Plus className="h-4 w-4" />
      </button>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe your issue (optional)..."
        className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
        aria-label="Describe your issue (optional)"
      />

      <button
        type="button"
        aria-label="Start with voice"
        onClick={() => start()}
        className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
      >
        <Mic className="h-4 w-4" />
      </button>

      <button
        type="submit"
        aria-label="Start complaint"
        disabled={loading}
        className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
