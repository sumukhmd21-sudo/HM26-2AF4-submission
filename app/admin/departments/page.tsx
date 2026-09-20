import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";

export default async function DepartmentsPage() {
  try {
    await requireRole("DEPARTMENT_ADMIN", "SUPER_ADMIN");
  } catch {
    return null;
  }
  const { rows } = await query<{
    id: string;
    name: string;
    code: string;
    description: string | null;
    active: boolean;
  }>(`SELECT id, name, code, description, active FROM departments ORDER BY name`);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Departments</h1>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-white/40">
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-b border-white/5">
                <td className="px-4 py-2 font-mono text-xs">{d.code}</td>
                <td className="px-4 py-2">{d.name}</td>
                <td className="px-4 py-2 text-white/60">{d.description ?? "—"}</td>
                <td className="px-4 py-2 text-white/60">{d.active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
