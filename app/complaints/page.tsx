import Link from "next/link";
import { redirect } from "next/navigation";
import { CitizenHeader } from "@/components/layout/header";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { STATUS_LABELS, type ComplaintStatus } from "@/lib/types";
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

export default async function ComplaintsListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/complaints");
  const { rows } = await query<{
    complaint_number: string;
    title: string;
    status: string;
    created_at: string;
    category_code: string;
    category_name: string;
  }>(
    `SELECT c.complaint_number, c.title, c.status, c.created_at,
            cat.code AS category_code, cat.name AS category_name
     FROM complaints c JOIN categories cat ON cat.id = c.category_id
     WHERE c.citizen_id = $1 ORDER BY c.created_at DESC`,
    [user.id]
  );

  return (
    <>
      <CitizenHeader signedIn />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">My Complaints</h1>
          <Link href="/complaints/new" className="btn-primary">Register Complaint</Link>
        </div>
        <div className="mt-6 space-y-3">
          {rows.length === 0 && (
            <div className="glass-card p-8 text-center text-white/50">
              You haven't registered any complaints yet.
            </div>
          )}
          {rows.map((c) => (
            <Link
              key={c.complaint_number}
              href={`/complaints/${c.complaint_number}`}
              className="glass-card flex items-center justify-between p-4 hover:bg-white/[0.05]"
            >
              <div>
                <div className="text-sm font-medium">{c.title}</div>
                <div className="mt-1 text-xs text-white/40">
                  {c.complaint_number} · {c.category_name} · {formatDate(c.created_at)}
                </div>
              </div>
              <span
                className={`status-pill ${
                  STATUS_PILL[c.status] ?? "bg-white/5 text-white/60"
                }`}
              >
                {STATUS_LABELS[c.status as ComplaintStatus] ?? c.status}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
