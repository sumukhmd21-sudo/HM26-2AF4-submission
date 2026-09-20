import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET() {
  try {
    await requireRole("SUPER_ADMIN");
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const cats = await query(`SELECT * FROM categories ORDER BY name`);
  const subs = await query(`SELECT * FROM subcategories ORDER BY name`);
  return NextResponse.json({ categories: cats.rows, subcategories: subs.rows });
}
