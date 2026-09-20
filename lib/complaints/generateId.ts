import { queryOne } from "@/lib/db";

// Format: CMP-MYS-YYYY-NNNNNN (database-backed, sequential per year)
export async function generateComplaintNumber(year = new Date().getFullYear()): Promise<string> {
  const row = await queryOne<{ next_seq: number }>(
    `SELECT COALESCE(MAX(
        CAST(SPLIT_PART(complaint_number, '-', 4) AS INTEGER)
      ), 0) + 1 AS next_seq
     FROM complaints
     WHERE complaint_number LIKE $1`,
    [`CMP-MYS-${year}-%`]
  );
  const seq = row?.next_seq ?? 1;
  const padded = String(seq).padStart(6, "0");
  return `CMP-MYS-${year}-${padded}`;
}
