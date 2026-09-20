import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { complaintNumber: string } }) {
  const user = await getCurrentUser();
  const c = await queryOne<Record<string, unknown>>(
    `SELECT c.*, cat.code AS category_code, cat.name AS category_name,
            sub.code AS subcategory_code, sub.name AS subcategory_name,
            d.name AS department_name
     FROM complaints c
     JOIN categories cat ON cat.id = c.category_id
     JOIN subcategories sub ON sub.id = c.subcategory_id
     LEFT JOIN departments d ON d.id = c.assigned_department_id
     WHERE c.complaint_number = $1`,
    [params.complaintNumber]
  );
  if (!c) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const isOwner = user && c.citizen_id === user.id;
  const isStaff = user && ["EMPLOYEE", "DEPARTMENT_ADMIN", "SUPER_ADMIN"].includes(user.role);
  if (!isOwner && !isStaff)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  // Scope employee visibility by department
  if (isStaff && user!.role === "EMPLOYEE" && c.assigned_department_id !== user!.department_id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const events = isOwner
    ? await query(
        `SELECT id, event_type, new_status, actor_role, note, created_at
         FROM complaint_events WHERE complaint_id = $1
         AND event_type IN ('STATUS_CHANGE','ASSIGNED','REASSIGNED','CREATED')
         ORDER BY created_at ASC`,
        [c.id]
      )
    : await query(
        `SELECT * FROM complaint_events WHERE complaint_id = $1 ORDER BY created_at ASC`,
        [c.id]
      );

  const images = await query(
    `SELECT id, storage_path, mime_type, width, height, image_quality
     FROM complaint_images WHERE complaint_id = $1 ORDER BY created_at ASC`,
    [c.id]
  );

  const notes = !isOwner
    ? await query(
        `SELECT n.id, n.note, n.created_at, u.full_name
         FROM complaint_notes n JOIN users u ON u.id = n.employee_id
         WHERE n.complaint_id = $1 AND n.internal_only = TRUE ORDER BY n.created_at DESC`,
        [c.id]
      )
    : { rows: [] };

  return NextResponse.json({ complaint: c, events: events.rows, images: images.rows, notes: notes.rows });
}
