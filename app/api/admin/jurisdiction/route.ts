import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { MYSURU_POLYGON } from "@/lib/location/jurisdiction";

export async function GET() {
  try {
    await requireRole("SUPER_ADMIN");
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  return NextResponse.json({ polygon: MYSURU_POLYGON });
}
