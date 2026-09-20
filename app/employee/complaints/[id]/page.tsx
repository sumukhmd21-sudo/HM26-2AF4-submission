import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { STATUS_LABELS, type ComplaintStatus } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { ComplaintActions } from "@/components/employee/complaint-actions";
import { signedUrl } from "@/lib/storage";
import dynamic from "next/dynamic";

const DetailMap = dynamic(() => import("@/components/complaint/location-map"), {
  ssr: false,
});

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

export default async function EmployeeComplaintDetail({
  params,
}: {
  params: { id: string };
}) {
  let user;
  try {
    user = await requireRole("EMPLOYEE", "DEPARTMENT_ADMIN", "SUPER_ADMIN");
  } catch {
    return null;
  }

  const c = await queryOne<any>(
    `SELECT c.*, cat.name AS category_name, sub.name AS subcategory_name,
            d.name AS department_name, u.full_name AS assigned_employee_name,
            cit.full_name AS citizen_name
     FROM complaints c
     JOIN categories cat ON cat.id = c.category_id
     JOIN subcategories sub ON sub.id = c.subcategory_id
     LEFT JOIN departments d ON d.id = c.assigned_department_id
     LEFT JOIN users u ON u.id = c.assigned_employee_id
     LEFT JOIN users cit ON cit.id = c.citizen_id
     WHERE c.id = $1`,
    [params.id]
  );
  if (!c) notFound();
  if (
    user.role === "EMPLOYEE" &&
    c.assigned_department_id !== user.department_id
  )
    return <div className="p-6 text-white/60">Forbidden</div>;

  const events = await query(
    `SELECT e.*, u.full_name AS actor_name FROM complaint_events e
     LEFT JOIN users u ON u.id = e.actor_user_id
     WHERE e.complaint_id = $1 ORDER BY e.created_at ASC`,
    [params.id]
  );
  const images = await query<{ id: string; storage_path: string; mime_type: string }>(
    `SELECT id, storage_path, mime_type FROM complaint_images
     WHERE complaint_id = $1 ORDER BY created_at ASC`,
    [params.id]
  );
  const notes = await query<{ id: string; note: string; created_at: string; full_name: string }>(
    `SELECT n.id, n.note, n.created_at, u.full_name FROM complaint_notes n
     JOIN users u ON u.id = n.employee_id WHERE n.complaint_id = $1
     ORDER BY n.created_at DESC`,
    [params.id]
  );
  const departments = await query<{ id: string; name: string }>(
    `SELECT id, name FROM departments WHERE active = TRUE ORDER BY name`
  );
  const employees = await query<{ id: string; full_name: string }>(
    `SELECT u.id, u.full_name FROM users u WHERE u.role IN ('EMPLOYEE','DEPARTMENT_ADMIN') ORDER BY u.full_name`
  );

  const imageUrls = images.rows.map((i) => ({
    id: i.id,
    url: signedUrl(i.storage_path),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/40">
            Complaint
          </div>
          <div className="mt-1 font-mono text-sm text-blue-300">
            {c.complaint_number}
          </div>
          <h1 className="mt-2 text-xl font-semibold">{c.title}</h1>
        </div>
        <Link href="/employee/complaints" className="btn-ghost">
          Back
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="glass-card p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
              <span className={`status-pill ${STATUS_PILL[c.status]}`}>
                {STATUS_LABELS[c.status as ComplaintStatus]}
              </span>
              <span>·</span>
              <span>Priority: {c.priority}</span>
              <span>·</span>
              <span>{c.category_name} / {c.subcategory_name}</span>
              <span>·</span>
              <span>{formatDateTime(c.created_at)}</span>
            </div>
            <p className="mt-3 text-sm text-white/80">{c.description}</p>
          </div>

          <div className="glass-card p-5">
            <div className="text-xs uppercase tracking-wider text-white/40">
              Citizen statement
            </div>
            <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/80">
              {c.original_description ?? c.description}
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="text-xs uppercase tracking-wider text-white/40">
              Evidence
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {imageUrls.length === 0 && (
                <div className="text-sm text-white/50">No images.</div>
              )}
              {imageUrls.map((i) => (
                <a key={i.id} href={i.url} target="_blank" className="block">
                  <img
                    src={i.url}
                    alt="Evidence"
                    className="aspect-video w-full rounded-lg border border-white/10 object-cover"
                  />
                </a>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="text-xs uppercase tracking-wider text-white/40">
              AI analysis
            </div>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-white/70">
              {JSON.stringify(c.ai_analysis_json ?? {}, null, 2)}
            </pre>
          </div>

          <div className="glass-card p-5">
            <div className="text-xs uppercase tracking-wider text-white/40">
              Location
            </div>
            <div className="mt-2 text-sm text-white/80">
              {c.address ?? "—"} <br />
              Lat {Number(c.latitude).toFixed(5)}, Lng {Number(c.longitude).toFixed(5)}
              {c.accuracy_meters ? ` (±${Math.round(c.accuracy_meters)} m)` : ""}
            </div>
            <div className="mt-3">
              <DetailMap
                coords={{
                  lat: Number(c.latitude),
                  lng: Number(c.longitude),
                  accuracy: c.accuracy_meters ? Number(c.accuracy_meters) : undefined,
                }}
              />
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="text-xs uppercase tracking-wider text-white/40">
              Assignment
            </div>
            <div className="mt-2 text-sm text-white/80">
              Department: {c.department_name ?? "—"} <br />
              Employee: {c.assigned_employee_name ?? "—"}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <ComplaintActions
            id={params.id}
            currentStatus={c.status}
            departments={departments.rows}
            employees={employees.rows}
            currentDepartmentId={c.assigned_department_id}
            currentEmployeeId={c.assigned_employee_id}
          />

          <div className="glass-card p-5">
            <div className="text-xs uppercase tracking-wider text-white/40">
              Timeline
            </div>
            <ol className="mt-3 space-y-2">
              {events.rows.map((e: any) => (
                <li key={e.id} className="text-xs text-white/70">
                  <span className="font-mono text-white/40">
                    {formatDateTime(e.created_at)}
                  </span>{" "}
                  — {e.event_type}
                  {e.new_status ? ` · ${e.new_status}` : ""}
                  {e.actor_name ? ` · ${e.actor_name}` : ""}
                  {e.note ? ` · ${e.note}` : ""}
                </li>
              ))}
            </ol>
          </div>

          <div className="glass-card p-5">
            <div className="text-xs uppercase tracking-wider text-white/40">
              Internal notes
            </div>
            <ul className="mt-3 space-y-2 text-xs text-white/70">
              {notes.rows.length === 0 && (
                <li className="text-white/40">No notes.</li>
              )}
              {notes.rows.map((n) => (
                <li key={n.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                  <div className="text-white/40">
                    {n.full_name} · {formatDateTime(n.created_at)}
                  </div>
                  <div className="mt-1">{n.note}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
