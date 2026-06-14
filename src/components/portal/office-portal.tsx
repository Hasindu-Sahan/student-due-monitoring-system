"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, XCircle, PieChart as PieIcon, BarChart3 } from "lucide-react";
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

import { PortalLayout } from "@/components/portal/PortalLayout";
import { SummaryCard } from "@/components/portal/SummaryCard";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { lkr } from "@/lib/data";

type PortalSession = {
  userId?: number;
  username?: string;
  profileId?: string;
  designation?: string;
  dbRole?: string;
  role?: string;
  name?: string;
};

type Profile = {
  firstName: string;
  lastName: string;
  designation: string;
};

type Payment = {
  paymentId: number;
  date: string;
  sid: string;
  name: string;
  feeType: string;
  category: string;
  faculty: string;
  level: number | null;
  amount: number;
  status: string;
  bankSlipUrl?: string | null;
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

const OFFICES: Record<string, { scope: string; label: string; initials: string }> = {
  FAS_Office: { scope: "FAS_Office", label: "FAS", initials: "FAS" },
  FOT_Office: { scope: "FOT_Office", label: "FOT", initials: "FOT" },
  FBSF_Office: { scope: "FBSF_Office", label: "FBSF", initials: "FB" },
  Welfare: { scope: "Welfare", label: "Welfare", initials: "W" },
};

/**
 * Resolve the office scope from the stored session.
 * Falls back to defaultScope if no recognisable identifier is found.
 */
function scopeFromSession(session: PortalSession | null, fallbackScope: string): string {
  if (!session) return fallbackScope;

  const value = [
    session.username ?? "",
    session.profileId ?? "",
    session.designation ?? "",
    session.dbRole ?? "",
    session.role ?? "",
  ]
    .join(" ")
    .toUpperCase();

  if (value.includes("WEL001") || value.includes("WELFARE")) return "Welfare";
  if (value.includes("FAC001") || value.includes("FAS_OFFICE") || value.includes("FAS")) return "FAS_Office";
  if (value.includes("FAC002") || value.includes("FOT_OFFICE") || value.includes("FOT")) return "FOT_Office";
  if (value.includes("FAC003") || value.includes("FBSF_OFFICE") || value.includes("FBSF")) return "FBSF_Office";

  return fallbackScope;
}

function portalMeta(scope?: string | null) {
  const nextScope = scope?.trim() || "Faculty";
  return (
    OFFICES[nextScope] ?? {
      scope: nextScope,
      label: nextScope,
      initials: nextScope.slice(0, 2).toUpperCase(),
    }
  );
}

function statusCount(payments: Payment[], status: string) {
  return payments.filter((p) => p.status === status).length;
}

export function OfficeDashboardPage({
  defaultScope,
  facultyBasePath = "/faculty",
}: {
  defaultScope: string;
  facultyBasePath?: string;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [profile, setProfile] = useState<Profile>({
    firstName: "Portal",
    lastName: "",
    designation: "",
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
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

  // Resolved scope — starts as defaultScope, updated after session is read
  const [scope, setScope] = useState(defaultScope);

  useEffect(() => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? (JSON.parse(stored) as PortalSession) : null;

    // Resolve the true scope from session; always trust defaultScope as the
    // canonical value when the page is under /faculty/FAS_Office etc.
    const resolvedScope = scopeFromSession(session, defaultScope);
    setScope(resolvedScope);

    const accountParams = new URLSearchParams();
    if (session?.userId) accountParams.set("userId", String(session.userId));
    if (session?.username) accountParams.set("username", session.username);
    const accountQuery = accountParams.toString() ? `?${accountParams.toString()}` : "";

    // All payment queries are scoped to the resolved office
    const scopeQuery = `?belongsTo=${encodeURIComponent(resolvedScope)}`;

    Promise.all([
      fetch(`/api/admin/payments${scopeQuery}`).then((r) => r.json()),
      fetch(`/api/admin/account${accountQuery}`).then((r) => r.json()),
      fetch(`/api/admin/payments-options${scopeQuery}`).then((r) => r.json()),
    ])
      .then(([paymentsData, accountData, optionsData]) => {
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);
        setLoadError(
          Array.isArray(paymentsData) ? "" : (paymentsData?.error ?? "Failed to fetch payments"),
        );
        if (!accountData?.error) {
          setProfile({
            firstName: accountData.firstName ?? "Portal",
            lastName: accountData.lastName ?? "",
            designation: accountData.designation ?? "",
          });
        }
        if (optionsData && !optionsData.error) setFilterOptions(optionsData);
        setLoading(false);
      })
      .catch(() => {
        setPayments([]);
        setLoadError("Failed to fetch payments");
        setLoading(false);
      });
  }, [defaultScope]);

  const filtered = useMemo(
    () =>
      payments.filter((p) => {
        const matchesFeeType = !filters.feeType || p.feeType === filters.feeType;
        const matchesCategory = !filters.category || p.category === filters.category;
        const matchesFaculty = !filters.faculty || p.faculty === filters.faculty;
        const matchesLevel = !filters.level || String(p.level ?? "") === filters.level;
        const text = filters.studentSearch.toLowerCase();
        const matchesStudent =
          !text || p.sid.toLowerCase().includes(text) || p.name.toLowerCase().includes(text);
        return matchesFeeType && matchesCategory && matchesFaculty && matchesLevel && matchesStudent;
      }),
    [filters, payments],
  );

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
    value: new Set(
      filtered.filter((p) => p.status === status).map((p) => p.sid),
    ).size,
    color: STATUS_COLORS[status],
  }));

  const recentPayments = [...filtered].slice(0, 8);

  const meta = portalMeta(scope);
  const displayName = `${profile.firstName} ${profile.lastName}`.trim();
  const userInitials =
    meta.initials || `${profile.firstName?.[0] ?? "P"}${profile.lastName?.[0] ?? ""}`;

  const inputClass =
    "h-9 rounded-lg border bg-card px-3 text-xs font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";

  return (
    <PortalLayout
      role="faculty"
      user={{ name: displayName, sub: profile.designation || meta.label, initials: userInitials }}
      title={`${meta.label} Dashboard`}
      subtitle={`Student payment status overview — ${meta.label} Office`}
      facultyBasePath={facultyBasePath}
    >
      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border bg-card p-4 shadow-card">
        <div
          className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${
            meta.scope === "Welfare" ? "lg:grid-cols-6" : "lg:grid-cols-5"
          }`}
        >
          <input
            value={filters.studentSearch}
            onChange={(e) => setFilters({ ...filters, studentSearch: e.target.value })}
            placeholder="Student ID / Name"
            className={`${inputClass} lg:col-span-2`}
          />
          <select
            value={filters.feeType}
            onChange={(e) => setFilters({ ...filters, feeType: e.target.value })}
            className={inputClass}
          >
            <option value="">All fee types</option>
            {filterOptions.feeTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className={inputClass}
          >
            <option value="">All categories</option>
            {filterOptions.categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {/* Faculty filter only for Welfare (sees all faculties) */}
          {meta.scope === "Welfare" && (
            <select
              value={filters.faculty}
              onChange={(e) => setFilters({ ...filters, faculty: e.target.value })}
              className={inputClass}
            >
              <option value="">All faculties</option>
              {filterOptions.faculties.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          )}
          <select
            value={filters.level}
            onChange={(e) => setFilters({ ...filters, level: e.target.value })}
            className={inputClass}
          >
            <option value="">All levels</option>
            {[...filterOptions.levels]
              .sort((a, b) => a - b)
              .map((item) => (
                <option key={String(item)} value={String(item)}>
                  Level {item}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Approved" value={String(approved)} tone="success" icon={CheckCircle2} />
        <SummaryCard label="Pending" value={String(pending)} tone="warning" icon={Clock} />
        <SummaryCard label="Rejected" value={String(rejected)} tone="destructive" icon={XCircle} />
      </div>

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Pie — payment status distribution */}
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Payment Status Distribution</h2>
              <p className="text-xs text-muted-foreground">
                {meta.label} — Approved vs Pending vs Rejected
              </p>
            </div>
            <PieIcon className="h-5 w-5 text-muted-foreground" />
          </div>

          {loading ? (
            <div className="mt-10 flex h-[300px] items-center justify-center text-xs text-muted-foreground">
              Loading chart…
            </div>
          ) : total === 0 ? (
            <div className="mt-10 flex h-[300px] items-center justify-center text-xs text-muted-foreground">
              No payment data available for {meta.label}
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

        {/* Bar — student counts by status */}
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Student Counts by Status</h2>
              <p className="text-xs text-muted-foreground">
                {meta.label} — Number of students in each status
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>

          {loading ? (
            <div className="mt-10 flex h-[300px] items-center justify-center text-xs text-muted-foreground">
              Loading chart…
            </div>
          ) : total === 0 ? (
            <div className="mt-10 flex h-[300px] items-center justify-center text-xs text-muted-foreground">
              No payment data available for {meta.label}
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

      {/* ── Payment details table ───────────────────────────────────────── */}
      <div className="mt-6 rounded-2xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Payment Details</h2>
            <p className="text-xs text-muted-foreground">
              Filtered by {meta.label} Office
              {filters.feeType ? ` · ${filters.feeType}` : ""}
              {filters.category ? ` · ${filters.category}` : ""}
              {filters.level ? ` · Level ${filters.level}` : ""}
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Showing {Math.min(recentPayments.length, filtered.length)} of {filtered.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                {["Date", "Student ID", "Student Name", "Fee Type", "Amount", "Status"].map(
                  (header) => (
                    <th key={header} className="px-6 py-3 font-medium">
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Loading payments…
                  </td>
                </tr>
              ) : recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    {loadError || `No payment data available for ${meta.label} Office`}
                  </td>
                </tr>
              ) : (
                recentPayments.map((payment) => (
                  <tr key={payment.paymentId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-4 text-muted-foreground">{payment.date}</td>
                    <td className="px-6 py-4 font-mono text-xs">{payment.sid}</td>
                    <td className="px-6 py-4 font-medium">{payment.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{payment.feeType}</td>
                    <td className="px-6 py-4 font-semibold tabular-nums">{lkr(payment.amount)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={payment.status} variant="approval" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  );
}