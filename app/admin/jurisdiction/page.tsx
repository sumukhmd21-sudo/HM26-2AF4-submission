import { requireRole } from "@/lib/auth";
import { MYSURU_POLYGON } from "@/lib/location/jurisdiction";

export default async function JurisdictionPage() {
  try {
    await requireRole("SUPER_ADMIN");
  } catch {
    return null;
  }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Jurisdiction</h1>
      <div className="glass-card p-4">
        <div className="text-sm text-white/70">
          Configured Mysuru service area polygon (lng, lat pairs):
        </div>
        <pre className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-white/80">
{JSON.stringify(MYSURU_POLYGON, null, 2)}
        </pre>
        <p className="mt-2 text-xs text-white/40">
          Source: MYSURU_SERVICE_AREA_SOURCE. Edit lib/location/jurisdiction.ts or load
          from an authoritative GeoJSON in production.
        </p>
      </div>
    </div>
  );
}
