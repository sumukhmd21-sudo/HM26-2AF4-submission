import { NextRequest, NextResponse } from "next/server";
import { internalNoteSchema } from "@/lib/validation/complaint";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireRole("EMPLOYEE", "DEPARTMENT_ADMIN", "SUPER_ADMIN");
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = internalNoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  await query(
    `INSERT INTO complaint_notes (complaint_id, employee_id, note, internal_only)
     VALUES ($1,$2,$3,TRUE)`,
    [params.id, user.id, parsed.data.note]
  );
  await audit({
    actorUserId: user.id,
    action: "complaint.note_added",
    entityType: "complaint",
    entityId: params.id,
  });
  return NextResponse.json({ ok: true });
}
