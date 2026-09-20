import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Minimal credential check. In production wire to Supabase Auth.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  let user: {
    id: string;
    auth_user_id: string;
    role: "CITIZEN" | "EMPLOYEE" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN";
    password_hash: string | null;
  } | null;
  try {
    user = await queryOne<{
      id: string;
      auth_user_id: string;
      role: "CITIZEN" | "EMPLOYEE" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN";
      password_hash: string | null;
    }>(
      `SELECT id, auth_user_id, role, password_hash FROM users WHERE email = $1`,
      [parsed.data.email]
    );
  } catch (e) {
    // Surface real DB errors in the terminal so missing-column / connection
    // issues don't get hidden behind a 500 with no context.
    console.error("[auth/login] DB error:", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
  if (!user) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }
  // Dev fallback: if no password_hash set, allow any password (development only).
  // Production deployments should populate password_hash and remove this
  // branch.
  if (user.password_hash && user.password_hash !== parsed.data.password) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }
  setSessionCookie({ authUserId: user.auth_user_id, userId: user.id, role: user.role });
  try {
    await audit({
      actorUserId: user.id,
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
    });
  } catch (e) {
    // Audit logging must never block login. Log + continue.
    console.error("[auth/login] audit error:", e);
  }
  return NextResponse.json({ ok: true, role: user.role });
}

export async function DELETE() {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
