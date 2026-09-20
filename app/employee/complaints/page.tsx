import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";
import { STATUS_LABELS, type ComplaintStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ComplaintFilters } from "@/components/employee/complaint-filters";

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

export default async function EmployeeComplaintsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  let user;
  try {
    user = await requireRole("EMPLOYEE", "DEPARTMENT_ADMIN", "SUPER_ADMIN");
  } catch {
    return null;
  }

  const params: unknown[] = [];
  const where: string[] = ["1=1"];
  if (user.role === "EMPLOYEE" || user.role === "DEPARTMENT_ADMIN") {
    params.push(user.department_id);
    where.push(`c.assigned_department_id = $${params.length}`);
  } else if (searchParams.department) {
    params.push(searchParams.department);
    where.push(`c.assigned_department_id = $${params.length}`);
  }
  if (searchParams.status) {
    params.push(searchParams.status);
    where.push(`c.status = $${params.length}`);
  }
  if (searchParams.priority) {
    params.push(searchParams.priority);
    where.push(`c.priority = $${params.length}`);
  }
  if (searchParams.category) {
    params.push(searchParams.category);
    where.push(`cat.code = $${params.length}`);
  }
  if (searchParams.q) {
    params.push(`%${searchParams.q}%`);
    where.push(
      `(c.title ILIKE $${params.length} OR c.complaint_number ILIKE $${params.length} OR c.address ILIKE $${params.length})`
    );
  }
  if (searchParams.mine === "1") {
    params.push(user.id);
    where.push(`c.assigned_employee_id = $${params.length}`);
  }

  const limit = 25;
  const offset = Number(searchParams.offset ?? 0);
  params.push(limit);
  params.push(offset);

  const { rows } = await query(
    `SELECT c.id, c.complaint_number, c.title, c.status, c.priority, c.created_at,
            c.address, cat.name AS category_name, u.full_name AS assigned_employee_name
     FROM complaints c
     JOIN categories cat ON cat.id = c.category_id
     LEFT JOIN users u ON u.id = c.assigned_employee_id
     WHERE ${where.join(" AND ")}
     ORDER BY c.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Complaints</h1>
      </div>
      <ComplaintFilters />
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-white/40">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Priority</th>
                <th className="px-4 py-2">Assigned</th>
                <th className="px-4 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c: any) => (
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
                  <td className="px-4 py-2 text-white/60">{c.address ?? "—"}</td>
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
