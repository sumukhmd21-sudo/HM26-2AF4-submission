import { notFound, redirect } from "next/navigation";
import { CitizenHeader } from "@/components/layout/header";
import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { STATUS_LABELS, STATUS_ORDER, type ComplaintStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

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

export default async function TrackingPage({
  params,
}: {
  params: { complaintNumber: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/complaints/" + params.complaintNumber);
  const c = await queryOne<{
    id: string;
    complaint_number: string;
    title: string;
    description: string;
    status: string;
    created_at: string;
    address: string | null;
    latitude: number;
    longitude: number;
    category_name: string;
    subcategory_name: string;
  }>(
    `SELECT c.id, c.complaint_number, c.title, c.description, c.status, c.created_at,
            c.address, c.latitude, c.longitude,
            cat.name AS category_name, sub.name AS subcategory_name
     FROM complaints c
     JOIN categories cat ON cat.id = c.category_id
     JOIN subcategories sub ON sub.id = c.subcategory_id
     WHERE c.complaint_number = $1 AND c.citizen_id = $2`,
    [params.complaintNumber, user.id]
  );
  if (!c) notFound();

  const events = await query<{ new_status: string; created_at: string }>(
    `SELECT new_status, created_at FROM complaint_events
     WHERE complaint_id = $1 AND event_type = 'STATUS_CHANGE'
     ORDER BY created_at ASC`,
    [c.id]
  );

  const reached = new Set<string>(["SUBMITTED"]);
  for (const e of events.rows) {
    if (e.new_status) reached.add(e.new_status);
  }
  const reachedOrdered = STATUS_ORDER.filter((s) => reached.has(s));
  const currentIdx = Math.max(
    0,
    reachedOrdered.indexOf(c.status as ComplaintStatus)
  );

  return (
    <>
      <CitizenHeader signedIn />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="glass-card p-6">
          <div className="text-xs uppercase tracking-wider text-white/40">
            Complaint ID
          </div>
          <div className="mt-1 font-mono text-sm text-blue-300">
            {c.complaint_number}
          </div>
          <h1 className="mt-3 text-xl font-semibold">{c.title}</h1>
          <div className="mt-2 flex items-center gap-2 text-xs text-white/60">
            <span>{c.category_name} / {c.subcategory_name}</span>
            <span>·</span>
            <span>{formatDate(c.created_at)}</span>
            <span>·</span>
            <span
              className={`status-pill ${
                STATUS_PILL[c.status] ?? "bg-white/5 text-white/60"
              }`}
            >
              {STATUS_LABELS[c.status as ComplaintStatus] ?? c.status}
            </span>
          </div>
          <p className="mt-4 text-sm text-white/80">{c.description}</p>
          {c.address && (
            <div className="mt-3 text-xs text-white/50">{c.address}</div>
          )}
        </div>

        <div className="glass-card p-6">
          <div className="text-xs uppercase tracking-wider text-white/40">
            Timeline
          </div>
          <ol className="mt-4 space-y-3">
            {STATUS_ORDER.map((s, idx) => {
              const done = idx <= currentIdx;
              const current = idx === currentIdx;
              return (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-[10px] ${
                      current
                        ? "bg-button-gradient text-white"
                        : done
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-white/[0.05] text-white/40"
                    }`}
                  >
                    {done ? "✓" : "○"}
                  </span>
                  <span className={done ? "text-white" : "text-white/40"}>
                    {STATUS_LABELS[s]}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </main>
    </>
  );
}
