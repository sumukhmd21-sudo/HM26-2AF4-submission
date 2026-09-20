import { requireRole } from "@/lib/auth";
import { AnalyticsCards } from "@/components/employee/analytics-cards";

export default async function AnalyticsPage() {
  try {
    await requireRole("EMPLOYEE", "DEPARTMENT_ADMIN", "SUPER_ADMIN");
  } catch {
    return null;
  }
  const r = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/employee/analytics`,
    { cache: "no-store" }
  );
  const data = await r.json();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Analytics</h1>
      <AnalyticsCards data={data} />
    </div>
  );
}
