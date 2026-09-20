import { NextRequest, NextResponse } from "next/server";
import { assignmentSchema } from "@/lib/validation/complaint";
import { requireRole } from "@/lib/auth";
import { assignComplaint, updateComplaintStatus } from "@/lib/complaints/create";
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
  const parsed = assignmentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  try {
    await assignComplaint({
      complaintId: params.id,
      departmentId: parsed.data.departmentId,
      employeeId: parsed.data.employeeId ?? undefined,
      actorUserId: user.id,
      reason: parsed.data.reason,
    });
    // Auto-transition to ASSIGNED if currently SUBMITTED / UNDER_REVIEW
    try {
      await updateComplaintStatus({
        complaintId: params.id,
        newStatus: "ASSIGNED",
        actorUserId: user.id,
        actorRole: user.role,
        note: "Assigned to department/employee",
      });
    } catch {
      // ignore if not in a valid prior state
    }
    await audit({
      actorUserId: user.id,
      action: "complaint.assigned",
      entityType: "complaint",
      entityId: params.id,
      metadata: parsed.data,
    });
    await emit({
      type: "complaint_assigned",
      payload: { complaintId: params.id },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "ASSIGNMENT_FAILED", message: (e as Error).message }, { status: 400 });
  }
}
