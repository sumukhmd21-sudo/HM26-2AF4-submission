import Link from "next/link";
import { LayoutDashboard, ListChecks, Map, BarChart3, User, Users, Building2, Tag, Shield, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const base: NavItem[] = [
  { href: "/employee", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employee/complaints", label: "Complaints", icon: ListChecks },
  { href: "/employee/complaints?mine=1", label: "My Assigned", icon: ListChecks },
  { href: "/employee/map", label: "Map", icon: Map },
  { href: "/employee/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
];

const deptAdminExtra: NavItem[] = [
  { href: "/employee/employees", label: "Employees", icon: Users },
  { href: "/admin/departments", label: "Departments", icon: Building2 },
  { href: "/admin/categories", label: "Categories", icon: Tag },
];

const superExtra: NavItem[] = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/jurisdiction", label: "Jurisdiction", icon: Shield },
  { href: "/admin/settings", label: "Settings", icon: Shield },
  { href: "/admin/audit", label: "Audit Logs", icon: ScrollText },
];

export function EmployeeSidebar({
  pathname,
  role,
}: {
  pathname: string;
  role: "EMPLOYEE" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN";
}) {
  const items = [
    ...base,
    ...(role === "DEPARTMENT_ADMIN" ? deptAdminExtra : []),
    ...(role === "SUPER_ADMIN" ? superExtra : []),
  ];

  return (
    <aside className="hidden w-60 shrink-0 border-r border-white/5 bg-navy-950/60 p-4 lg:block">
      <div className="mb-4 text-[11px] uppercase tracking-wider text-white/40">
        {role.replace("_", " ")}
      </div>
      <nav className="space-y-1">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/[0.05] hover:text-white",
                active && "bg-white/[0.06] text-white"
              )}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
