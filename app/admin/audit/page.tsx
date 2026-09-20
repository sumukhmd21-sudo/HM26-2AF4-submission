import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";

export default async function AuditLogsPage() {
  try {
    await requireRole("SUPER_ADMIN");
  } catch {
    return null;
  }
  const { rows } = await query<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata: any;
    created_at: string;
    actor_name: string | null;
  }>(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at, u.full_name AS actor_name
     FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
     ORDER BY a.created_at DESC LIMIT 100`
  );
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Audit logs</h1>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-white/40">
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Entity</th>
              <th className="px-4 py-2">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5 align-top">
                <td className="px-4 py-2 text-white/60">
                  {new Date(r.created_at).toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2 text-white/60">{r.actor_name ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
                <td className="px-4 py-2 text-white/60">
                  {r.entity_type} <span className="font-mono text-xs">{r.entity_id?.slice(0, 8) ?? ""}</span>
                </td>
                <td className="max-w-md truncate px-4 py-2 text-xs text-white/50">
                  {r.metadata ? JSON.stringify(r.metadata) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
