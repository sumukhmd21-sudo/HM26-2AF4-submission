import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET() {
  let user;
  try {
    user = await requireRole("DEPARTMENT_ADMIN", "SUPER_ADMIN");
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const params: unknown[] = [];
  let where = "1=1";
  if (user.role === "DEPARTMENT_ADMIN" && user.department_id) {
    params.push(user.department_id);
    where = `e.department_id = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT e.id, e.employee_code, e.role, e.active, u.full_name, u.email, d.name AS department_name
     FROM employees e JOIN users u ON u.id = e.user_id
     JOIN departments d ON d.id = e.department_id
     WHERE ${where} ORDER BY u.full_name`,
    params
  );
  return NextResponse.json({ employees: rows });
}
