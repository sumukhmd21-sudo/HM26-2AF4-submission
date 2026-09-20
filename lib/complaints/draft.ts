import { query, queryOne } from "@/lib/db";
import { nanoid } from "nanoid";
import type { ComplaintDraft } from "@/lib/types";

export async function createDraft(input: {
  citizenId?: string;
  sessionId?: string;
}): Promise<ComplaintDraft> {
  const sessionId = input.sessionId ?? nanoid();
  const { rows } = await query<ComplaintDraft>(
    `INSERT INTO complaint_drafts (citizen_id, session_id)
     VALUES ($1, $2)
     RETURNING *`,
    [input.citizenId ?? null, sessionId]
  );
  return rows[0];
}

export async function getDraft(id: string): Promise<ComplaintDraft | null> {
  return queryOne<ComplaintDraft>(`SELECT * FROM complaint_drafts WHERE id = $1`, [id]);
}

export async function updateDraft(
  id: string,
  patch: Partial<Pick<ComplaintDraft,
    "original_text" | "voice_transcript" | "normalized_text" |
    "category_id" | "subcategory_id" | "location_json" |
    "image_id" | "ai_analysis_json" | "status"
  >>
): Promise<ComplaintDraft | null> {
  const keys = Object.keys(patch);
  if (keys.length === 0) return getDraft(id);
  const set = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = keys.map((k) => (patch as Record<string, unknown>)[k]);
  await query(
    `UPDATE complaint_drafts SET ${set}, updated_at = NOW() WHERE id = $1`,
    [id, ...values]
  );
  return getDraft(id);
}
