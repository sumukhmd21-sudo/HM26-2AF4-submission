import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("q");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  const where: string[] = ["c.citizen_id = $1"];
  const params: unknown[] = [user.id];
  if (status) { params.push(status); where.push(`c.status = $${params.length}`); }
  if (category) { params.push(category); where.push(`cat.code = $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(c.title ILIKE $${params.length} OR c.complaint_number ILIKE $${params.length})`
    );
  }
  params.push(limit); params.push(offset);
  const { rows } = await query(
    `SELECT c.id, c.complaint_number, c.title, c.status, c.priority, c.created_at,
            cat.code AS category_code, cat.name AS category_name
     FROM complaints c
     JOIN categories cat ON cat.id = c.category_id
     WHERE ${where.join(" AND ")}
     ORDER BY c.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return NextResponse.json({ complaints: rows, limit, offset });
}
