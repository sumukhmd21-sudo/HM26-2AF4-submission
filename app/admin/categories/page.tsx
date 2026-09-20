import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";

export default async function CategoriesPage() {
  try {
    await requireRole("SUPER_ADMIN");
  } catch {
    return null;
  }
  const cats = await query<{ id: string; code: string; name: string; active: boolean }>(
    `SELECT id, code, name, active FROM categories ORDER BY name`
  );
  const subs = await query<{ id: string; category_id: string; code: string; name: string; active: boolean }>(
    `SELECT id, category_id, code, name, active FROM subcategories ORDER BY name`
  );
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Categories & subcategories</h1>
      <div className="glass-card p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-white/40">
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {cats.rows.map((c) => (
              <tr key={c.id} className="border-b border-white/5">
                <td className="px-4 py-2 font-mono text-xs">{c.code}</td>
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2 text-white/60">{c.active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="glass-card p-4">
        <div className="mb-2 text-xs uppercase tracking-wider text-white/40">
          Subcategories
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-white/40">
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Name</th>
            </tr>
          </thead>
          <tbody>
            {subs.rows.map((s) => {
              const cat = cats.rows.find((c) => c.id === s.category_id);
              return (
                <tr key={s.id} className="border-b border-white/5">
                  <td className="px-4 py-2 text-white/60">{cat?.code ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{s.code}</td>
                  <td className="px-4 py-2">{s.name}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
