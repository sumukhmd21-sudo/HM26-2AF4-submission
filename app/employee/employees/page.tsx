import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";

export default async function EmployeesPage() {
  let user;
  try {
    user = await requireRole("DEPARTMENT_ADMIN", "SUPER_ADMIN");
  } catch {
    return null;
  }
  const params: unknown[] = [];
  let where = "1=1";
  if (user.role === "DEPARTMENT_ADMIN" && user.department_id) {
    params.push(user.department_id);
    where = `e.department_id = $${params.length}`;
  }
  const { rows } = await query<{
    id: string;
    employee_code: string;
    role: string;
    active: boolean;
    full_name: string;
    email: string;
    department_name: string;
  }>(
    `SELECT e.id, e.employee_code, e.role, e.active, u.full_name, u.email, d.name AS department_name
     FROM employees e JOIN users u ON u.id = e.user_id
     JOIN departments d ON d.id = e.department_id
     WHERE ${where} ORDER BY u.full_name`,
    params
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Employees</h1>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-white/40">
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Department</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="px-4 py-2 font-mono text-xs">{r.employee_code}</td>
                <td className="px-4 py-2">{r.full_name}</td>
                <td className="px-4 py-2 text-white/60">{r.email}</td>
                <td className="px-4 py-2 text-white/60">{r.department_name}</td>
                <td className="px-4 py-2 text-white/60">{r.role}</td>
                <td className="px-4 py-2 text-white/60">{r.active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
