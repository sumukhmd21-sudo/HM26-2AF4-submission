import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { complaintNumber: string } }) {
  const user = await getCurrentUser();
  const c = await queryOne<{ id: string; citizen_id: string }>(
    `SELECT id, citizen_id FROM complaints WHERE complaint_number = $1`,
    [params.complaintNumber]
  );
  if (!c) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!user || c.citizen_id !== user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const { rows } = await query(
    `SELECT new_status, actor_role, note, created_at
     FROM complaint_events
     WHERE complaint_id = $1 AND event_type = 'STATUS_CHANGE'
     ORDER BY created_at ASC`,
    [c.id]
  );
  return NextResponse.json({ events: rows });
}
