import { requireRole } from "@/lib/auth";
import { EmployeeMap } from "@/components/employee/complaint-map";
import { query } from "@/lib/db";

export default async function MapPage() {
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
  const { rows } = await query<{
    id: string;
    complaint_number: string;
    title: string;
    latitude: number;
    longitude: number;
    status: string;
    priority: string;
    category_code: string;
  }>(
    `SELECT c.id, c.complaint_number, c.title, c.latitude, c.longitude,
            c.status, c.priority, cat.code AS category_code
     FROM complaints c JOIN categories cat ON cat.id = c.category_id
     WHERE ${where}`,
    params
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Complaints map</h1>
      <EmployeeMap markers={rows} />
    </div>
  );
}
