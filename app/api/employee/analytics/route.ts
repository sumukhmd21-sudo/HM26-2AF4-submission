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
  let scope = "";
  if (user.role === "EMPLOYEE" || user.role === "DEPARTMENT_ADMIN") {
    params.push(user.department_id);
    scope = ` WHERE c.assigned_department_id = $${params.length}`;
  }

  const byStatus = await query<{ status: string; count: string }>(
    `SELECT c.status, COUNT(*)::text AS count FROM complaints c${scope} GROUP BY c.status`,
    params
  );
  const byCategory = await query<{ code: string; name: string; count: string }>(
    `SELECT cat.code, cat.name, COUNT(*)::text AS count
     FROM complaints c JOIN categories cat ON cat.id = c.category_id${scope}
     GROUP BY cat.code, cat.name ORDER BY COUNT(*) DESC`,
    params
  );
  const byPriority = await query<{ priority: string; count: string }>(
    `SELECT c.priority, COUNT(*)::text AS count FROM complaints c${scope} GROUP BY c.priority`,
    params
  );
  const total = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM complaints c${scope}`,
    params
  );
  const open = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM complaints c${scope ? scope + " AND" : " WHERE"} c.status NOT IN ('RESOLVED','CLOSED','REJECTED')`,
    params
  );
  const avgResolution = await query<{ avg_hours: string | null }>(
    `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::text AS avg_hours
     FROM complaints c${scope ? scope + " AND" : " WHERE"} resolved_at IS NOT NULL`,
    params
  );
  const overTime = await query<{ day: string; count: string }>(
    `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::text AS count
     FROM complaints c${scope}
     GROUP BY day ORDER BY day ASC LIMIT 30`,
    params
  );
  const byDepartment = await query<{ name: string; count: string }>(
    `SELECT d.name, COUNT(*)::text AS count FROM complaints c
     JOIN departments d ON d.id = c.assigned_department_id${scope}
     GROUP BY d.name`,
    params
  );

  return NextResponse.json({
    total: Number(total.rows[0]?.count ?? 0),
    open: Number(open.rows[0]?.count ?? 0),
    avgResolutionHours: Number(avgResolution.rows[0]?.avg_hours ?? 0),
    byStatus: byStatus.rows.map((r) => ({ status: r.status, count: Number(r.count) })),
    byCategory: byCategory.rows.map((r) => ({ code: r.code, name: r.name, count: Number(r.count) })),
    byPriority: byPriority.rows.map((r) => ({ priority: r.priority, count: Number(r.count) })),
    byDepartment: byDepartment.rows.map((r) => ({ name: r.name, count: Number(r.count) })),
    overTime: overTime.rows.map((r) => ({ day: r.day, count: Number(r.count) })),
  });
}
