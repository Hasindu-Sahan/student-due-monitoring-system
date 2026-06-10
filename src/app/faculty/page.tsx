"use client";

import { useEffect, useState } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { SummaryCard } from "@/components/portal/SummaryCard";
import {
  CheckCircle2,
  Clock,
  XCircle,
  PieChart as PieIcon,
  BarChart3,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Stats = {
  totalRemainingDues: number;
  totalPendingDues: number;
  totalOverdue: number;
  approved: number;
  pending: number;
  rejected: number;
};

type FacultyProfile = { firstName: string; lastName: string; designation: string };

const STATUS_COLORS = {
  Approved: "hsl(142, 71%, 45%)",
  Pending: "hsl(38, 92%, 50%)",
  Rejected: "hsl(0, 84%, 60%)",
} as const;

export default function FacultyDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalRemainingDues: 0,
    totalPendingDues: 0,
    totalOverdue: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });

  const [faculty, setFaculty] = useState<FacultyProfile>({
    firstName: "Faculty",
    lastName: "",
    designation: "",
  });

  const [loading, setLoading] = useState(true);

  const load = () => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? JSON.parse(stored) : null;

    const params = new URLSearchParams();
    if (session?.userId) params.set("userId", String(session.userId));
    if (session?.username) params.set("username", session.username);
    const accountQuery = params.toString() ? `?${params.toString()}` : "";

    Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch(`/api/admin/account${accountQuery}`).then((r) => r.json()),
    ]).then(([s, a]) => {
      setStats(s);
      if (!a?.error) setFaculty(a);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const chartData = [
    { name: "Approved", value: stats.approved, color: STATUS_COLORS.Approved },
    { name: "Pending", value: stats.pending, color: STATUS_COLORS.Pending },
    { name: "Rejected", value: stats.rejected, color: STATUS_COLORS.Rejected },
  ];

  const total = stats.approved + stats.pending + stats.rejected;

  return (
    <PortalLayout
      role="faculty"
      user={{
        name: `${faculty.firstName} ${faculty.lastName}`.trim(),
        sub: faculty.designation,
        initials: `${faculty.firstName?.[0] ?? "F"}${faculty.lastName?.[0] ?? ""}`,
      }}
      title="Faculty Dashboard"
      subtitle="Student payment status overview"
    >
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Approved"
          value={String(stats.approved)}
          tone="success"
          icon={CheckCircle2}
        />
        <SummaryCard
          label="Pending"
          value={String(stats.pending)}
          tone="warning"
          icon={Clock}
        />
        <SummaryCard
          label="Rejected"
          value={String(stats.rejected)}
          tone="destructive"
          icon={XCircle}
        />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Pie / Donut chart */}
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Payment Status Distribution</h2>
              <p className="text-xs text-muted-foreground">
                Approved vs Pending vs Rejected
              </p>
            </div>
            <PieIcon className="h-5 w-5 text-muted-foreground" />
          </div>

          {loading ? (
            <div className="mt-10 flex h-[300px] items-center justify-center text-xs text-muted-foreground">
              Loading chart...
            </div>
          ) : total === 0 ? (
            <div className="mt-10 flex h-[300px] items-center justify-center text-xs text-muted-foreground">
              No payment data available
            </div>
          ) : (
            <div className="mt-5 h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar chart */}
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Student Counts by Status</h2>
              <p className="text-xs text-muted-foreground">
                Number of students in each status
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>

          {loading ? (
            <div className="mt-10 flex h-[300px] items-center justify-center text-xs text-muted-foreground">
              Loading chart...
            </div>
          ) : total === 0 ? (
            <div className="mt-10 flex h-[300px] items-center justify-center text-xs text-muted-foreground">
              No payment data available
            </div>
          ) : (
            <div className="mt-5 h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--border))"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    cursor={{ fill: "hsl(var(--muted))" }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
