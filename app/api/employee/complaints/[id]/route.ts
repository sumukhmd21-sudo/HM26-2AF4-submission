import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireRole("EMPLOYEE", "DEPARTMENT_ADMIN", "SUPER_ADMIN");
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const c = await queryOne<Record<string, unknown>>(
    `SELECT c.*, cat.code AS category_code, cat.name AS category_name,
            sub.code AS subcategory_code, sub.name AS subcategory_name,
            d.name AS department_name,
            u.full_name AS assigned_employee_name,
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
  if (!c) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (
    user.role === "EMPLOYEE" &&
    c.assigned_department_id !== user.department_id
  )
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const events = await query(
    `SELECT e.*, u.full_name AS actor_name FROM complaint_events e
     LEFT JOIN users u ON u.id = e.actor_user_id
     WHERE e.complaint_id = $1 ORDER BY e.created_at ASC`,
    [params.id]
  );
  const images = await query(
    `SELECT id, storage_path, mime_type, width, height, image_quality
     FROM complaint_images WHERE complaint_id = $1 ORDER BY created_at ASC`,
    [params.id]
  );
  const notes = await query(
    `SELECT n.*, u.full_name FROM complaint_notes n
     JOIN users u ON u.id = n.employee_id
     WHERE n.complaint_id = $1 ORDER BY n.created_at DESC`,
    [params.id]
  );
  return NextResponse.json({ complaint: c, events: events.rows, images: images.rows, notes: notes.rows });
}
