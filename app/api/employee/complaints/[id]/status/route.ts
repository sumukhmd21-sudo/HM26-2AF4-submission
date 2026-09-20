import { NextRequest, NextResponse } from "next/server";
import { statusUpdateSchema } from "@/lib/validation/complaint";
import { requireRole } from "@/lib/auth";
import { updateComplaintStatus } from "@/lib/complaints/create";
import { audit } from "@/lib/audit";
import { emit } from "@/lib/notifications";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireRole("EMPLOYEE", "DEPARTMENT_ADMIN", "SUPER_ADMIN");
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = statusUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  try {
    const complaint = await updateComplaintStatus({
      complaintId: params.id,
      newStatus: parsed.data.status,
      actorUserId: user.id,
      actorRole: user.role,
      note: parsed.data.note,
    });
    await audit({
      actorUserId: user.id,
      action: "complaint.status_changed",
      entityType: "complaint",
      entityId: params.id,
      metadata: { newStatus: parsed.data.status, note: parsed.data.note },
    });
    await emit({
      type: "status_changed",
      userId: complaint.citizen_id,
      payload: { complaintNumber: complaint.complaint_number, status: parsed.data.status },
    });
    return NextResponse.json({ complaint });
  } catch (e) {
    return NextResponse.json({ error: "INVALID_TRANSITION", message: (e as Error).message }, { status: 400 });
  }
}
