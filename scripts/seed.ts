import { readFile } from "fs/promises";
import path from "path";
import { pool } from "../lib/db";

async function main() {
  const sql = await readFile(path.join(__dirname, "seed.sql"), "utf8");
  await pool.query(sql);
  console.log("Seeded categories/departments.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
