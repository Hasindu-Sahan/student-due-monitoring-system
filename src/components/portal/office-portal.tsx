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
  if (value.includes("FAC001") || value.includes("FAS_OFFICE") || value.includes("FAS"))
    return "FAS_Office";
  if (value.includes("FAC002") || value.includes("FOT_OFFICE") || value.includes("FOT"))
    return "FOT_Office";
  if (value.includes("FAC003") || value.includes("FBSF_OFFICE") || value.includes("FBSF"))
    return "FBSF_Office";

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
  hidePaymentDetails = false,
}: {
  defaultScope: string;
  facultyBasePath?: string;
  hidePaymentDetails?: boolean;
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
        return (
          matchesFeeType && matchesCategory && matchesFaculty && matchesLevel && matchesStudent
        );
      }),
    [filters, payments],
  );

  const approved = statusCount(filtered, "Approved");
  const pending = statusCount(filtered, "Pending");
  const rejected = statusCount(filtered, "Rejected");
  const total = approved + pending + rejected;

  // receiversCount comes from fee management receiver assignment
  const [receiversCount, setReceiversCount] = useState<number>(0);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("belongsTo", String(scope));
    if (filters.feeType) params.set("feeType", filters.feeType);
    if (filters.category) params.set("category", filters.category);
    if (filters.faculty) params.set("faculty", filters.faculty);
    if (filters.level) params.set("level", filters.level);
    if (filters.studentSearch) params.set("studentSearch", filters.studentSearch);

    fetch(`/api/admin/receivers-count?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setReceiversCount(typeof data?.totalReceivers === "number" ? data.totalReceivers : 0);
      })
      .catch(() => setReceiversCount(0));
  }, [
    scope,
    filters.feeType,
    filters.category,
    filters.faculty,
    filters.level,
    filters.studentSearch,
  ]);

  const notPaidCount = Math.max(0, receiversCount - approved);

  const chartData = [
    { name: "Approved", value: approved, color: STATUS_COLORS.Approved },
    { name: "Pending", value: pending, color: STATUS_COLORS.Pending },
    { name: "Rejected", value: rejected, color: STATUS_COLORS.Rejected },
  ];

  const paidNotPaidTotal = approved + notPaidCount;
  const paidNotPaidChartData = [
    { name: "Paid", value: approved, color: STATUS_COLORS.Approved },
    {
      name: "Not Paid",
      value: notPaidCount,
      color: STATUS_COLORS.Pending,
    },
  ];

  const studentStatusData = STATUSES.map((status) => ({
    name: status,
    value: new Set(filtered.filter((p) => p.status === status).map((p) => p.sid)).size,
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

      {/* ── Admin Approval Status ───────────────────────────────────────── */}
      <div className="mb-2 flex items-end justify-between gap-4">
        <h2 className="text-base font-semibold">Admin Approval Status</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Approved" value={String(approved)} tone="success" icon={CheckCircle2} />
        <SummaryCard label="Pending" value={String(pending)} tone="warning" icon={Clock} />
        <SummaryCard label="Rejected" value={String(rejected)} tone="destructive" icon={XCircle} />
      </div>

      <hr className="my-6 border-muted" />

      {/* ── Payment Status ─────────────────────────────────────────────── */}
      <div className="mb-2 flex items-end justify-between gap-4">
        <h2 className="text-base font-semibold">Payment Status</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <SummaryCard label="Paid" value={String(approved)} tone="success" icon={CheckCircle2} />
        <SummaryCard label="Not Paid" value={String(notPaidCount)} tone="warning" icon={Clock} />
      </div>

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Pie — payment status distribution */}
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Approval Status Distribution</h2>
              <p className="text-xs text-muted-foreground">Approved / Pending / Rejected</p>
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
            <div className="mt-5 grid min-h-[300px] grid-cols-[220px_minmax(0,1fr)] gap-6">
              <div className="relative h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      label={() => ""}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: any, name: any) => [String(value), String(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-semibold tabular-nums">{total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 self-center">
                {[
                  { label: "Approved", value: approved, color: STATUS_COLORS.Approved },
                  { label: "Pending", value: pending, color: STATUS_COLORS.Pending },
                  { label: "Rejected", value: rejected, color: STATUS_COLORS.Rejected },
                ].map((row) => {
                  const percent = total > 0 ? Math.round((row.value / total) * 100) : 0;
                  return (
                    <div key={row.label} className="rounded-xl border bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: row.color }}
                          />
                          {row.label}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">{percent}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${percent}%`, backgroundColor: row.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Payment Status Distribution</h2>
              <p className="text-xs text-muted-foreground">{meta.label} — Paid vs Not Paid</p>
            </div>
            <PieIcon className="h-5 w-5 text-muted-foreground" />
          </div>

          {loading ? (
            <div className="mt-10 flex h-[300px] items-center justify-center text-xs text-muted-foreground">
              Loading chart…
            </div>
          ) : paidNotPaidTotal === 0 ? (
            <div className="mt-10 flex h-[300px] items-center justify-center text-xs text-muted-foreground">
              No payment data available for {meta.label}
            </div>
          ) : (
            <div className="mt-5 grid min-h-[300px] grid-cols-[220px_minmax(0,1fr)] gap-6">
              <div className="relative h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paidNotPaidChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      label={() => ""}
                    >
                      {paidNotPaidChartData.map((entry, index) => (
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
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-semibold tabular-nums">{paidNotPaidTotal}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 self-center">
                {[
                  { label: "Paid", value: approved, color: STATUS_COLORS.Approved },
                  {
                    label: "Not Paid",
                    value: notPaidCount,
                    color: STATUS_COLORS.Pending,
                  },
                ].map((row) => {
                  const percent =
                    paidNotPaidTotal > 0 ? Math.round((row.value / paidNotPaidTotal) * 100) : 0;
                  return (
                    <div key={row.label} className="rounded-xl border bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: row.color }}
                          />
                          {row.label}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">{percent}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${percent}%`, backgroundColor: row.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
