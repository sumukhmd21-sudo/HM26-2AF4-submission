import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";

export default async function AdminUsersPage() {
  try {
    await requireRole("SUPER_ADMIN");
  } catch {
    return null;
  }
  const { rows } = await query<{
    id: string;
    full_name: string;
    email: string;
    role: string;
    created_at: string;
    department_name: string | null;
  }>(
    `SELECT u.id, u.full_name, u.email, u.role, u.created_at, d.name AS department_name
     FROM users u LEFT JOIN departments d ON d.id = u.department_id
     ORDER BY u.created_at DESC`
  );
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Users</h1>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-white/40">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Department</th>
              <th className="px-4 py-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-white/5">
                <td className="px-4 py-2">{u.full_name}</td>
                <td className="px-4 py-2 text-white/60">{u.email}</td>
                <td className="px-4 py-2 text-white/60">{u.role}</td>
                <td className="px-4 py-2 text-white/60">{u.department_name ?? "—"}</td>
                <td className="px-4 py-2 text-white/60">
                  {new Date(u.created_at).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
