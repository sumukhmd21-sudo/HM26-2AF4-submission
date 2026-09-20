import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireRole("EMPLOYEE", "DEPARTMENT_ADMIN", "SUPER_ADMIN");
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const category = url.searchParams.get("category");
  const subcategory = url.searchParams.get("subcategory");
  const department = url.searchParams.get("department");
  const employee = url.searchParams.get("employee");
  const priority = url.searchParams.get("priority");
  const search = url.searchParams.get("q");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const sort = url.searchParams.get("sort") ?? "newest";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  const where: string[] = ["1=1"];
  const params: unknown[] = [];

  // Department scoping for employees (not admins)
  if (user.role === "EMPLOYEE") {
    params.push(user.department_id);
    where.push(`c.assigned_department_id = $${params.length}`);
  } else if (user.role === "DEPARTMENT_ADMIN" && user.department_id) {
    params.push(user.department_id);
    where.push(`c.assigned_department_id = $${params.length}`);
  } else if (department) {
    params.push(department);
    where.push(`c.assigned_department_id = $${params.length}`);
  }

  if (status) { params.push(status); where.push(`c.status = $${params.length}`); }
  if (category) { params.push(category); where.push(`cat.code = $${params.length}`); }
  if (subcategory) { params.push(subcategory); where.push(`sub.code = $${params.length}`); }
  if (priority) { params.push(priority); where.push(`c.priority = $${params.length}`); }
  if (employee) { params.push(employee); where.push(`c.assigned_employee_id = $${params.length}`); }
  if (from) { params.push(from); where.push(`c.created_at >= $${params.length}`); }
  if (to) { params.push(to); where.push(`c.created_at <= $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(c.title ILIKE $${params.length} OR c.complaint_number ILIKE $${params.length} OR c.address ILIKE $${params.length})`
    );
  }

  const order =
    sort === "oldest"
      ? "c.created_at ASC"
      : sort === "priority"
      ? "CASE c.priority WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, c.created_at DESC"
      : sort === "status"
      ? "c.status, c.created_at DESC"
      : "c.created_at DESC";

  params.push(limit); params.push(offset);
  const { rows } = await query(
    `SELECT c.id, c.complaint_number, c.title, c.status, c.priority, c.created_at,
            c.address, c.assigned_employee_id, c.assigned_department_id,
            cat.code AS category_code, cat.name AS category_name,
            d.name AS department_name,
            u.full_name AS assigned_employee_name
     FROM complaints c
     JOIN categories cat ON cat.id = c.category_id
     JOIN subcategories sub ON sub.id = c.subcategory_id
     LEFT JOIN departments d ON d.id = c.assigned_department_id
     LEFT JOIN users u ON u.id = c.assigned_employee_id
     WHERE ${where.join(" AND ")}
     ORDER BY ${order}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  // total for pagination
  const countParams = params.slice(0, params.length - 2);
  const countRes = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM complaints c
     JOIN categories cat ON cat.id = c.category_id
     JOIN subcategories sub ON sub.id = c.subcategory_id
     WHERE ${where.join(" AND ")}`,
    countParams
  );
  return NextResponse.json({
    complaints: rows,
    total: Number(countRes.rows[0]?.count ?? 0),
    limit,
    offset,
  });
}
