"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { STATUS_LABELS, type ComplaintStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RecentComplaint {
  complaint_number: string;
  title: string;
  status: string;
  created_at: string;
}

const STATUS_PILL: Record<string, string> = {
  SUBMITTED: "bg-blue-500/15 text-blue-300",
  UNDER_REVIEW: "bg-indigo-500/15 text-indigo-300",
  ASSIGNED: "bg-violet-500/15 text-violet-300",
  IN_PROGRESS: "bg-amber-500/15 text-amber-300",
  NEEDS_INFORMATION: "bg-orange-500/15 text-orange-300",
  RESOLVED: "bg-emerald-500/15 text-emerald-300",
  CLOSED: "bg-slate-500/15 text-slate-300",
  REJECTED: "bg-rose-500/15 text-rose-300",
};

export function CitizenSidebar({
  user,
  complaints,
}: {
  user: { id: string; name: string } | null;
  complaints: RecentComplaint[];
}) {
  const [count, setCount] = useState<number>(complaints.length);
  useEffect(() => setCount(complaints.length), [complaints.length]);

  return (
    <aside className="space-y-4">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider text-white/40">
            Your complaints
          </div>
          <div className="rounded-full bg-white/[0.05] px-2 py-0.5 text-xs text-white/70">
            {count}
          </div>
        </div>
        {user ? (
          <div className="mt-2 text-sm text-white/80">{user.name}</div>
        ) : (
          <div className="mt-2 text-sm text-white/50">Sign in to view your complaints.</div>
        )}
      </div>

      <div className="glass-card p-2">
        {complaints.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-white/40">
            No complaints yet.
          </div>
        ) : (
          <ul className="space-y-1">
            {complaints.map((c) => (
              <li key={c.complaint_number}>
                <Link
                  href={`/complaints/${c.complaint_number}`}
                  className="block rounded-lg px-3 py-2 hover:bg-white/[0.04]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm text-white/80">{c.title}</div>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-white/40">{c.complaint_number}</span>
                    <span
                      className={cn(
                        "status-pill",
                        STATUS_PILL[c.status] ?? "bg-white/5 text-white/60"
                      )}
                    >
                      {STATUS_LABELS[c.status as ComplaintStatus] ?? c.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
