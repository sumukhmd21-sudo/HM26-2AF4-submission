import { queryOne } from "@/lib/db";

// Deterministic department routing based on category code (section 33).
// Always resolved server-side; never delegated to AI.
export async function routeDepartment(categoryCode: string): Promise<string | null> {
  const map: Record<string, string> = {
    ROAD_INFRASTRUCTURE: "ROADS",
    STREET_LIGHTING: "ELECTRICAL",
    SANITATION: "SANITATION",
    DRAINAGE: "DRAINAGE",
    WATER_SUPPLY: "WATER",
    PARKS: "PARKS",
    TRAFFIC: "TRAFFIC",
    PUBLIC_FACILITIES: "PUBLIC_FACILITIES",
    OTHER: "GENERAL",
  };
  const code = map[categoryCode] ?? "GENERAL";
  const dept = await queryOne<{ id: string }>(
    `SELECT id FROM departments WHERE code = $1 AND active = TRUE LIMIT 1`,
    [code]
  );
  return dept?.id ?? null;
}
