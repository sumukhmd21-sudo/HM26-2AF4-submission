import { Pool } from "pg";
import { config as loadEnv } from "dotenv";
import path from "path";

// Load .env from the project root so DATABASE_URL is available to scripts
// run via `tsx` (Next.js itself auto-loads .env, but tsx does not).
// In Next.js, dotenv is a no-op because Next has already populated
// process.env with the same values; `override: false` keeps Next's values.
loadEnv({
  path: path.resolve(process.cwd(), ".env"),
  override: false,
  quiet: true,
});

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in."
    );
  }
  return new Pool({ connectionString, max: 10 });
}

export const pool: Pool = global.__pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") global.__pgPool = pool;

export async function query<T = unknown>(
  text: string,
  params: unknown[] = []
): Promise<{ rows: T[]; rowCount: number }> {
  const res = await pool.query(text, params as never[]);
  return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
}

export async function queryOne<T = unknown>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const r = await query<T>(text, params);
  return r.rows[0] ?? null;
}
