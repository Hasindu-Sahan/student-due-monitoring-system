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

type FacultyProfile = { firstName: string; lastName: string; designation: string };
type Payment = {
  paymentId: number;
  sid: string;
  name: string;
  feeType: string;
  category: string;
  faculty: string;
  level: number | null;
  status: string;
};
type PaymentFilterOptions = {
  feeTypes: string[];
  categories: string[];
  faculties: string[];
  levels: number[];
};

const STATUSES = ["Approved", "Pending", "Rejected"] as const;

const STATUS_COLORS = {
  Approved: "hsl(142, 71%, 45%)",
  Pending: "hsl(38, 92%, 50%)",
  Rejected: "hsl(0, 84%, 60%)",
} as const;

function belongsToScope(session: any) {
  const value = String(`${session?.username ?? ""} ${session?.profileId ?? ""} ${session?.designation ?? ""}`).toUpperCase();
  if (value.includes("WEL001") || value.includes("WELFARE")) return "Welfare";
  if (value.includes("FAC001") || value.includes("FAS_OFFICE")) return "FAS_Office";
  if (value.includes("FBSF") || value.includes("FBSF_OFFICE")) return "FBSF_Office";
  if (value.includes("FOT") || value.includes("FOT_OFFICE")) return "FOT_Office";
  return "";
}

function statusCount(payments: Payment[], status: string) {
  return payments.filter((payment) => payment.status === status).length;
}

export default function FacultyDashboard() {
  const [payments, setPayments] = useState<Payment[]>([]);

  const [faculty, setFaculty] = useState<FacultyProfile>({
    firstName: "Faculty",
    lastName: "",
    designation: "",
  });
  const [portalName, setPortalName] = useState("Faculty");

  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    feeType: "",
    category: "",
    faculty: "",
    level: "",
    studentSearch: "",
  });
  const [filterOptions, setFilterOptions] = useState<PaymentFilterOptions>({
    feeTypes: [],
    categories: [],
    faculties: [],
    levels: [],
  });

  const load = () => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? JSON.parse(stored) : null;

    const params = new URLSearchParams();
    if (session?.userId) params.set("userId", String(session.userId));
    if (session?.username) params.set("username", session.username);
    const accountQuery = params.toString() ? `?${params.toString()}` : "";
    const scope = belongsToScope(session);
    if (scope) setPortalName(scope);
    const scopeQuery = scope ? `?belongsTo=${encodeURIComponent(scope)}` : "";

    Promise.all([
      fetch(`/api/admin/payments${scopeQuery}`).then((r) => r.json()),
      fetch(`/api/admin/account${accountQuery}`).then((r) => r.json()),
      fetch(`/api/admin/payments-options${scopeQuery}`).then((r) => r.json()),
    ]).then(([p, a, opts]) => {
      setPayments(Array.isArray(p) ? p : []);
      if (!a?.error) {
        setFaculty(a);
        setPortalName(a.designation?.toLowerCase().includes("welfare") ? "Welfare" : (a.designation?.includes("Office") ? a.designation : "Faculty"));
      }
      if (opts && !opts.error) setFilterOptions(opts);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = payments.filter((payment) => {
    const matchesFeeType = !filters.feeType || payment.feeType === filters.feeType;
    const matchesCategory = !filters.category || payment.category === filters.category;
    const matchesFaculty = !filters.faculty || payment.faculty === filters.faculty;
    const matchesLevel = !filters.level || String(payment.level ?? "") === filters.level;
    const text = filters.studentSearch.toLowerCase();
    const matchesStudent =
      !text || payment.sid.toLowerCase().includes(text) || payment.name.toLowerCase().includes(text);

    return matchesFeeType && matchesCategory && matchesFaculty && matchesLevel && matchesStudent;
  });

  const approved = statusCount(filtered, "Approved");
  const pending = statusCount(filtered, "Pending");
  const rejected = statusCount(filtered, "Rejected");
  const total = approved + pending + rejected;

  const chartData = STATUSES.map((status) => ({
    name: status,
    value: statusCount(filtered, status),
    color: STATUS_COLORS[status],
  }));

  const studentStatusData = STATUSES.map((status) => ({
    name: status,
    value: new Set(filtered.filter((payment) => payment.status === status).map((payment) => payment.sid)).size,
    color: STATUS_COLORS[status],
  }));

  const hasStudentStatusData = studentStatusData.some((item) => item.value > 0);

  const inputClass = "h-9 rounded-lg border bg-card px-3 text-xs font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";
  const displayName = `${faculty.firstName} ${faculty.lastName}`.trim();
  const userName = displayName;
  const userSub = faculty.designation || portalName;
  const userInitials = portalName === "Welfare" ? "W" : `${faculty.firstName?.[0] ?? "F"}${faculty.lastName?.[0] ?? ""}`;

  return (
    <PortalLayout
      role="faculty"
      user={{
        name: userName,
        sub: userSub,
        initials: userInitials,
      }}
      title={`${portalName} Dashboard`}
      subtitle="Student payment status overview"
    >
      <div className="mb-6 rounded-2xl border bg-card p-4 shadow-card">
        <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${portalName === "Welfare" ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}>
          <input
            value={filters.studentSearch}
            onChange={(e) => setFilters({ ...filters, studentSearch: e.target.value })}
            placeholder="Student ID / Name"
            className={`${inputClass} lg:col-span-2`}
          />
          <select value={filters.feeType} onChange={(e) => setFilters({ ...filters, feeType: e.target.value })} className={inputClass}>
            <option value="">All fee types</option>
            {filterOptions.feeTypes.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className={inputClass}>
            <option value="">All categories</option>
            {filterOptions.categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          {portalName === "Welfare" && (
            <select value={filters.faculty} onChange={(e) => setFilters({ ...filters, faculty: e.target.value })} className={inputClass}>
              <option value="">All faculties</option>
              {filterOptions.faculties.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          )}
          <select value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })} className={inputClass}>
            <option value="">All levels</option>
            {[...filterOptions.levels].sort((a, b) => a - b).map((item) => (
              <option key={String(item)} value={String(item)}>Level {item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Approved"
          value={String(approved)}
          tone="success"
          icon={CheckCircle2}
        />
        <SummaryCard
          label="Pending"
          value={String(pending)}
          tone="warning"
          icon={Clock}
        />
        <SummaryCard
          label="Rejected"
          value={String(rejected)}
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
                    label={({ name, value }) =>
                      `${name}: ${total ? Math.round((Number(value) / total) * 100) : 0}%`
                    }
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
                  data={studentStatusData}
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
                    {studentStatusData.map((entry, index) => (
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
