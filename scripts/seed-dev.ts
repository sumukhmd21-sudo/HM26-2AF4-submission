import { pool } from "../lib/db";

interface SeedUser {
  email: string;
  full_name: string;
  role: "CITIZEN" | "EMPLOYEE" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN";
  department_code?: string;
}

const USERS: SeedUser[] = [
  // Citizens
  { email: "citizen@test.com", full_name: "Test Citizen", role: "CITIZEN" },
  { email: "priya@test.com", full_name: "Priya Sharma", role: "CITIZEN" },

  // Super admin (sees everything)
  {
    email: "admin@test.com",
    full_name: "Super Admin",
    role: "SUPER_ADMIN",
  },

  // Department admins + employees, one per department
  {
    email: "roads.admin@test.com",
    full_name: "Roads Department Admin",
    role: "DEPARTMENT_ADMIN",
    department_code: "ROADS",
  },
  {
    email: "roads.emp@test.com",
    full_name: "Roads Employee",
    role: "EMPLOYEE",
    department_code: "ROADS",
  },
  {
    email: "electrical.admin@test.com",
    full_name: "Electrical Department Admin",
    role: "DEPARTMENT_ADMIN",
    department_code: "ELECTRICAL",
  },
  {
    email: "electrical.emp@test.com",
    full_name: "Electrical Employee",
    role: "EMPLOYEE",
    department_code: "ELECTRICAL",
  },
  {
    email: "sanitation.admin@test.com",
    full_name: "Sanitation Department Admin",
    role: "DEPARTMENT_ADMIN",
    department_code: "SANITATION",
  },
  {
    email: "water.admin@test.com",
    full_name: "Water Department Admin",
    role: "DEPARTMENT_ADMIN",
    department_code: "WATER",
  },
];

async function main() {
  console.log("Seeding dev users...\n");

  for (const u of USERS) {
    let departmentId: string | null = null;
    if (u.department_code) {
      const dept = await pool.query<{ id: string }>(
        `SELECT id FROM departments WHERE code = $1 LIMIT 1`,
        [u.department_code]
      );
      if (dept.rows.length === 0) {
        console.warn(
          `  ⚠ Department ${u.department_code} not found for ${u.email} — skipping department link`
        );
      } else {
        departmentId = dept.rows[0].id;
      }
    }

    // Insert user (idempotent on email)
    const userRes = await pool.query<{ id: string; auth_user_id: string }>(
      `INSERT INTO users (auth_user_id, full_name, email, role, department_id)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET full_name = EXCLUDED.full_name,
             role = EXCLUDED.role,
             department_id = EXCLUDED.department_id
       RETURNING id, auth_user_id`,
      [u.full_name, u.email, u.role, departmentId]
    );
    const userRow = userRes.rows[0];

    // For EMPLOYEE / DEPARTMENT_ADMIN, also create an employees row
    if (u.role === "EMPLOYEE" || u.role === "DEPARTMENT_ADMIN") {
      if (!departmentId) {
        console.warn(
          `  ⚠ ${u.email} is ${u.role} but has no department — skipping employees row`
        );
      } else {
        const employeeCode = `${u.department_code}-${u.role === "DEPARTMENT_ADMIN" ? "ADM" : "EMP"}-${userRow.id.slice(0, 4).toUpperCase()}`;
        await pool.query(
          `INSERT INTO employees (user_id, employee_code, department_id, role, active)
           VALUES ($1, $2, $3, $4, TRUE)
           ON CONFLICT (employee_code) DO NOTHING`,
          [userRow.id, employeeCode, departmentId, u.role]
        );
      }
    }

    console.log(
      `  ✓ ${u.role.padEnd(18)} ${u.email}${u.department_code ? `  (${u.department_code})` : ""}`
    );
  }

  console.log(`\nDone. ${USERS.length} users seeded (idempotent — re-run safely).`);
  console.log("\nLogins (any password works in dev — no password_hash is checked):");
  for (const u of USERS) {
    console.log(`  ${u.email.padEnd(32)} → ${u.role}`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
