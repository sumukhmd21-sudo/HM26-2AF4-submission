import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET() {
  let user;
  try {
    user = await requireRole("EMPLOYEE", "DEPARTMENT_ADMIN", "SUPER_ADMIN");
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const params: unknown[] = [];
  let where = "1=1";
  if (user.role === "EMPLOYEE" || user.role === "DEPARTMENT_ADMIN") {
    params.push(user.department_id);
    where = `c.assigned_department_id = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT c.id, c.complaint_number, c.title, c.latitude, c.longitude,
            c.status, c.priority, cat.code AS category_code
     FROM complaints c JOIN categories cat ON cat.id = c.category_id
     WHERE ${where}`,
    params
  );
  return NextResponse.json({ markers: rows });
}
