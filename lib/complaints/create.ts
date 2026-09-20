import { query, queryOne, transaction } from "@/lib/db";
import { generateComplaintNumber } from "./generateId";
import { routeDepartment } from "./routing";
import type {
  Complaint,
  ComplaintDraft,
  ComplaintStatus,
  Priority,
  Role,
} from "@/lib/types";

export interface CreateComplaintInput {
  draft: ComplaintDraft;
  citizenId: string;
  title: string;
  description: string;
  originalText: string;
  categoryId: string;
  subcategoryId: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  aiAnalysis: unknown;
  aiModel: string;
  imageId?: string;
}

export async function createComplaintFromDraft(
  input: CreateComplaintInput
): Promise<Complaint> {
  const year = new Date().getFullYear();
  const complaintNumber = await generateComplaintNumber(year);

  // Determine department deterministically by category code
  const catRow = await queryOne<{ code: string }>(
    `SELECT code FROM categories WHERE id = $1`,
    [input.categoryId]
  );
  const deptId = catRow ? await routeDepartment(catRow.code) : null;

  const { rows } = await query<Complaint>(
    `INSERT INTO complaints (
      complaint_number, citizen_id, title, description, original_description,
      category_id, subcategory_id, status, priority,
      latitude, longitude, accuracy_meters,
      address, city, district, state,
      jurisdiction, jurisdiction_verified,
      assigned_department_id, ai_analysis_json, ai_model
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
    ) RETURNING *`,
    [
      complaintNumber,
      input.citizenId,
      input.title,
      input.description,
      input.originalText,
      input.categoryId,
      input.subcategoryId,
      "SUBMITTED",
      "MEDIUM",
      input.latitude,
      input.longitude,
      input.accuracyMeters ?? null,
      input.address ?? null,
      input.city ?? null,
      input.district ?? null,
      input.state ?? null,
      "MYSURU",
      true,
      deptId,
      JSON.stringify(input.aiAnalysis),
      input.aiModel,
    ]
  );

  const complaint = rows[0];

  // Link image to complaint
  if (input.imageId) {
    await query(
      `UPDATE complaint_images SET complaint_id = $1, draft_id = NULL WHERE id = $2`,
      [complaint.id, input.imageId]
    );
  }

  // First event: SUBMITTED
  await query(
    `INSERT INTO complaint_events (complaint_id, event_type, new_status, actor_user_id, actor_role, note)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      complaint.id,
      "STATUS_CHANGE",
      "SUBMITTED",
      input.citizenId,
      "CITIZEN" as Role,
      "Complaint registered",
    ]
  );

  return complaint;
}

const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "ASSIGNED", "REJECTED"],
  UNDER_REVIEW: ["ASSIGNED", "NEEDS_INFORMATION", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS", "NEEDS_INFORMATION", "REJECTED"],
  IN_PROGRESS: ["RESOLVED", "NEEDS_INFORMATION", "REJECTED"],
  NEEDS_INFORMATION: ["UNDER_REVIEW", "REJECTED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
  REJECTED: [],
};

export function canTransition(from: ComplaintStatus, to: ComplaintStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function updateComplaintStatus(input: {
  complaintId: string;
  newStatus: ComplaintStatus;
  actorUserId: string;
  actorRole: Role;
  note?: string;
}): Promise<Complaint> {
  const current = await queryOne<Complaint>(
    `SELECT * FROM complaints WHERE id = $1`,
    [input.complaintId]
  );
  if (!current) throw new Error("Complaint not found");
  if (!canTransition(current.status as ComplaintStatus, input.newStatus)) {
    throw new Error(`Invalid status transition: ${current.status} -> ${input.newStatus}`);
  }
  const updates: string[] = ["status = $2", "updated_at = NOW()"];
  const values: unknown[] = [input.complaintId, input.newStatus];
  if (input.newStatus === "RESOLVED") {
    updates.push("resolved_at = NOW()");
  }
  const { rows } = await query<Complaint>(
    `UPDATE complaints SET ${updates.join(", ")} WHERE id = $1 RETURNING *`,
    values
  );
  await query(
    `INSERT INTO complaint_events (complaint_id, event_type, old_status, new_status, actor_user_id, actor_role, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      input.complaintId,
      "STATUS_CHANGE",
      current.status,
      input.newStatus,
      input.actorUserId,
      input.actorRole,
      input.note ?? null,
    ]
  );
  return rows[0];
}

export async function assignComplaint(input: {
  complaintId: string;
  departmentId?: string;
  employeeId?: string;
  actorUserId: string;
  reason?: string;
}): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.departmentId) {
    updates.push(`assigned_department_id = $${++i}`);
    values.push(input.departmentId);
  }
  if (input.employeeId !== undefined) {
    updates.push(`assigned_employee_id = $${++i}`);
    values.push(input.employeeId);
  }
  if (updates.length === 0) return;
  await query(
    `UPDATE complaints SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $1`,
    [input.complaintId, ...values]
  );
  await query(
    `INSERT INTO complaint_assignments (complaint_id, department_id, employee_id, assigned_by, reason)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      input.complaintId,
      input.departmentId ?? null,
      input.employeeId ?? null,
      input.actorUserId,
      input.reason ?? null,
    ]
  );
}
