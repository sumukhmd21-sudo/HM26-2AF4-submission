import { readFile } from "fs/promises";
import path from "path";
import { pool } from "../lib/db";

async function main() {
  const sql = await readFile(path.join(__dirname, "migration.sql"), "utf8");
  const seed = await readFile(path.join(__dirname, "seed.sql"), "utf8");
  console.log("Running migration...");
  await pool.query(sql);
  console.log("Seeding...");
  await pool.query(seed);
  console.log("Done.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
