import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET() {
  try {
    await requireRole("SUPER_ADMIN");
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const { rows } = await query(
    `SELECT u.id, u.full_name, u.email, u.role, u.created_at, d.name AS department_name
     FROM users u LEFT JOIN departments d ON d.id = u.department_id
     ORDER BY u.created_at DESC`
  );
  return NextResponse.json({ users: rows });
}
