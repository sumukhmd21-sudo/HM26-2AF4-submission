"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function ComplaintFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [priority, setPriority] = useState(params.get("priority") ?? "");

  const apply = (next: Record<string, string>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) sp.set(k, v);
    router.push(`/employee/complaints?${sp.toString()}`);
  };

  return (
    <div className="glass-card p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ID, title, address..."
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30"
        >
          <option value="">All statuses</option>
          {[
            "SUBMITTED",
            "UNDER_REVIEW",
            "ASSIGNED",
            "IN_PROGRESS",
            "NEEDS_INFORMATION",
            "RESOLVED",
            "CLOSED",
            "REJECTED",
          ].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30"
        >
          <option value="">All priorities</option>
          {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          className="btn-primary"
          onClick={() => apply({ q, status, priority })}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
