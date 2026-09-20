import { cookies } from "next/headers";
import { queryOne } from "@/lib/db";
import type { Role, User } from "@/lib/types";

const SESSION_COOKIE = "mgov_session";

// Simple dev-friendly session: stores {auth_user_id, role}. In production
// replace with Supabase Auth session verification.
export interface Session {
  authUserId: string;
  userId: string;
  role: Role;
}

export async function getSession(): Promise<Session | null> {
  const c = cookies().get(SESSION_COOKIE)?.value;
  if (!c) return null;
  try {
    const json = JSON.parse(Buffer.from(c, "base64").toString("utf8"));
    return json as Session;
  } catch {
    return null;
  }
}

export function setSessionCookie(session: Session) {
  const value = Buffer.from(JSON.stringify(session)).toString("base64");
  cookies().set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const s = await getSession();
  if (!s) return null;
  return queryOne<User>(
    `SELECT id, auth_user_id, full_name, email, phone, role, department_id
     FROM users WHERE auth_user_id = $1 LIMIT 1`,
    [s.authUserId]
  );
}

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) throw new Error("UNAUTHORIZED");
  return u;
}

export async function requireRole(...roles: Role[]): Promise<User> {
  const u = await requireUser();
  if (!roles.includes(u.role)) throw new Error("FORBIDDEN");
  return u;
}
