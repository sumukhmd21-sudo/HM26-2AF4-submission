"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

interface Data {
  total: number;
  open: number;
  avgResolutionHours: number;
  byStatus: { status: string; count: number }[];
  byCategory: { code: string; name: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byDepartment: { name: string; count: number }[];
  overTime: { day: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "#3b82f6",
  UNDER_REVIEW: "#6366f1",
  ASSIGNED: "#8b5cf6",
  IN_PROGRESS: "#f59e0b",
  NEEDS_INFORMATION: "#f97316",
  RESOLVED: "#10b981",
  CLOSED: "#64748b",
  REJECTED: "#ef4444",
};

export function AnalyticsCards({ data }: { data: Data }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={data.total} />
        <Stat label="Open" value={data.open} />
        <Stat
          label="Avg resolution (hrs)"
          value={Math.round(data.avgResolutionHours)}
        />
        <Stat label="Categories" value={data.byCategory.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="By status">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.byStatus}>
              <CartesianGrid stroke="#ffffff10" />
              <XAxis dataKey="status" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{ background: "#0a1130", border: "1px solid #ffffff20" }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="By category">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.byCategory} dataKey="count" nameKey="name" outerRadius={90}>
                {data.byCategory.map((_, i) => (
                  <Cell key={i} fill={`hsl(${210 + i * 30},80%,55%)`} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#0a1130", border: "1px solid #ffffff20" }}
              />
              <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Over time (last 30 days)">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.overTime}>
              <CartesianGrid stroke="#ffffff10" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{ background: "#0a1130", border: "1px solid #ffffff20" }}
              />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="By department">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.byDepartment} layout="vertical">
              <CartesianGrid stroke="#ffffff10" />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={120} />
              <Tooltip
                contentStyle={{ background: "#0a1130", border: "1px solid #ffffff20" }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-4">
      <div className="mb-2 text-xs uppercase tracking-wider text-white/40">{title}</div>
      {children}
    </div>
  );
}
