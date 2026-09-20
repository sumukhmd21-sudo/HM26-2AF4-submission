import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { EmployeeSidebar } from "@/components/layout/employee-sidebar";
import { getCurrentUser } from "@/lib/auth";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/employee");
  if (!["EMPLOYEE", "DEPARTMENT_ADMIN", "SUPER_ADMIN"].includes(user.role))
    redirect("/");
  const pathname = headers().get("x-invoke-path") ?? "/employee";
  return (
    <div className="min-h-screen bg-navy-950">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-navy-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-button-gradient">
              <span className="text-sm font-bold">M</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Mysuru Gov</div>
              <div className="text-[11px] uppercase tracking-wider text-white/40">
                Employee Dashboard
              </div>
            </div>
          </Link>
          <div className="text-xs text-white/50">{user.full_name}</div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl">
        <EmployeeSidebar pathname={pathname} role={user.role} />
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
