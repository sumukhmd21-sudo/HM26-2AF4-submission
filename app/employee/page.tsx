import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { STATUS_LABELS, type ComplaintStatus } from "@/lib/types";

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

export default async function EmployeeDashboard() {
  let user;
  try {
    user = await requireRole("EMPLOYEE", "DEPARTMENT_ADMIN", "SUPER_ADMIN");
  } catch {
    return null;
  }

  const params: unknown[] = [];
  let where = "1=1";
  if (user.role === "EMPLOYEE" || user.role === "DEPARTMENT_ADMIN") {
    params.push(user.department_id);
    where = `c.assigned_department_id = $${params.length}`;
  }

  const summary = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count FROM complaints c WHERE ${where} GROUP BY status`,
    params
  );
  const map: Record<string, number> = {};
  let total = 0;
  for (const r of summary.rows) {
    map[r.status] = Number(r.count);
    total += Number(r.count);
  }

  const recent = await query<{
    id: string;
    complaint_number: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
    category_name: string;
    address: string | null;
    assigned_employee_name: string | null;
  }>(
    `SELECT c.id, c.complaint_number, c.title, c.status, c.priority, c.created_at,
            c.address, cat.name AS category_name, u.full_name AS assigned_employee_name
     FROM complaints c JOIN categories cat ON cat.id = c.category_id
     LEFT JOIN users u ON u.id = c.assigned_employee_id
     WHERE ${where} ORDER BY c.created_at DESC LIMIT 10`,
    params
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Link href="/employee/complaints" className="btn-ghost">
          View all complaints
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Total" value={total} />
        <Stat label="Pending Review" value={(map.UNDER_REVIEW ?? 0) + (map.SUBMITTED ?? 0)} />
        <Stat label="Assigned" value={map.ASSIGNED ?? 0} />
        <Stat label="In Progress" value={map.IN_PROGRESS ?? 0} />
        <Stat label="Resolved" value={map.RESOLVED ?? 0} />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-white/5 px-4 py-3 text-sm font-medium">
          Recent complaints
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-white/40">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Priority</th>
                <th className="px-4 py-2">Assigned</th>
                <th className="px-4 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {recent.rows.map((c) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-2">
                    <Link
                      href={`/employee/complaints/${c.id}`}
                      className="font-mono text-xs text-blue-300 hover:underline"
                    >
                      {c.complaint_number}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-4 py-2">{c.title}</td>
                  <td className="px-4 py-2 text-white/60">{c.category_name}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`status-pill ${
                        STATUS_PILL[c.status] ?? "bg-white/5 text-white/60"
                      }`}
                    >
                      {STATUS_LABELS[c.status as ComplaintStatus] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-white/60">{c.priority}</td>
                  <td className="px-4 py-2 text-white/60">
                    {c.assigned_employee_name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-white/60">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
