"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, CircleDollarSign, Clock, PieChart as PieIcon, XCircle } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { PortalLayout } from "@/components/portal/PortalLayout";
import { SummaryCard } from "@/components/portal/SummaryCard";
import { lkr } from "@/lib/data";

type PortalSession = { userId?: number; username?: string; profileId?: string; designation?: string; dbRole?: string; role?: string; name?: string };
type Profile = { firstName: string; lastName: string; designation: string };
type Payment = { paymentId: number; sid: string; name: string; feeType: string; category: string; faculty: string; level: number | null; amount: number; status: string };
type PaymentFilterOptions = { feeTypes: string[]; categories: string[]; faculties: string[]; levels: number[] };

const STATUSES = ["Approved", "Pending", "Rejected"] as const;
const STATUS_COLORS = { Approved: "hsl(142, 71%, 45%)", Pending: "hsl(38, 92%, 50%)", Rejected: "hsl(0, 84%, 60%)" } as const;

function scopeFromSession(session: PortalSession | null, fallbackScope: string): string {
  if (!session) return fallbackScope;
  const value = [session.username ?? "", session.profileId ?? "", session.designation ?? "", session.dbRole ?? "", session.role ?? ""].join(" ").toUpperCase();
  if (value.includes("WEL001") || value.includes("WELFARE")) return "Welfare";
  if (value.includes("FAC001") || value.includes("FAS_OFFICE") || value.includes("FAS")) return "FAS_Office";
  if (value.includes("FAC002") || value.includes("FOT_OFFICE") || value.includes("FOT")) return "FOT_Office";
  if (value.includes("FAC003") || value.includes("FBSF_OFFICE") || value.includes("FBSF")) return "FBSF_Office";
  return fallbackScope;
}

function portalMeta(scope?: string | null) {
  const nextScope = scope?.trim() || "Faculty";
  return { scope: nextScope, label: nextScope, initials: nextScope.slice(0, 2).toUpperCase() };
}

export function OfficeDashboardPage({ defaultScope, facultyBasePath = "/faculty" }: { defaultScope: string; facultyBasePath?: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [profile, setProfile] = useState<Profile>({ firstName: "Portal", lastName: "", designation: "" });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ feeType: "", category: "", faculty: "", level: "", studentSearch: "" });
  const [filterOptions, setFilterOptions] = useState<PaymentFilterOptions>({ feeTypes: [], categories: [], faculties: [], levels: [] });
  const [scope, setScope] = useState(defaultScope);

  useEffect(() => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? (JSON.parse(stored) as PortalSession) : null;
    const resolvedScope = scopeFromSession(session, defaultScope);
    setScope(resolvedScope);
    const accountParams = new URLSearchParams();
    if (session?.userId) accountParams.set("userId", String(session.userId));
    if (session?.username) accountParams.set("username", session.username);
    const accountQuery = accountParams.toString() ? `?${accountParams.toString()}` : "";
    const scopeQuery = `?belongsTo=${encodeURIComponent(resolvedScope)}`;

    Promise.all([
      fetch(`/api/admin/payments${scopeQuery}`).then((r) => r.json()),
      fetch(`/api/admin/account${accountQuery}`).then((r) => r.json()),
      fetch(`/api/admin/payments-options${scopeQuery}`).then((r) => r.json()),
    ]).then(([paymentsData, accountData, optionsData]) => {
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      if (accountData && !accountData.error) setProfile({ firstName: accountData.firstName ?? "Portal", lastName: accountData.lastName ?? "", designation: accountData.designation ?? "" });
      if (optionsData && !optionsData.error) setFilterOptions(optionsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [defaultScope]);

  const filtered = useMemo(() => payments.filter((p) => {
    const matchesFeeType = !filters.feeType || p.feeType === filters.feeType;
    const matchesCategory = !filters.category || p.category === filters.category;
    const matchesFaculty = !filters.faculty || p.faculty === filters.faculty;
    const matchesLevel = !filters.level || String(p.level ?? "") === filters.level;
    const text = filters.studentSearch.toLowerCase();
    const matchesStudent = !text || p.sid.toLowerCase().includes(text) || p.name.toLowerCase().includes(text);
    return matchesFeeType && matchesCategory && matchesFaculty && matchesLevel && matchesStudent;
  }), [filters, payments]);

  const approved = filtered.filter((p) => p.status === "Approved").length;
  const pending = filtered.filter((p) => p.status === "Pending").length;
  const rejected = filtered.filter((p) => p.status === "Rejected").length;
  const notPaidCount = filtered.length - approved;
  const totalPaidAmount = filtered.filter((p) => p.status === "Approved").reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPendingAmount = filtered.filter((p) => p.status === "Pending").reduce((sum, p) => sum + Number(p.amount), 0);
  const totalOverdueAmount = filtered.filter((p) => p.status !== "Approved").reduce((sum, p) => sum + Number(p.amount), 0);
  const totalNotPaidAmount = totalOverdueAmount;
  const totalToCollectAmount = totalPaidAmount + totalPendingAmount + totalOverdueAmount;
  const total = approved + pending + rejected;
  const chartData = [
    { name: "Approved", value: approved, color: STATUS_COLORS.Approved },
    { name: "Pending", value: pending, color: STATUS_COLORS.Pending },
    { name: "Rejected", value: rejected, color: STATUS_COLORS.Rejected },
  ];
  const meta = portalMeta(scope);
  const userInitials = meta.initials || `${profile.firstName?.[0] ?? "P"}${profile.lastName?.[0] ?? ""}`;

  return (
    <PortalLayout role="faculty" facultyBasePath={facultyBasePath} user={{ name: `${profile.firstName} ${profile.lastName}`.trim(), sub: profile.designation || meta.label, initials: userInitials }} title={`${meta.label} Dashboard`} subtitle={`Student payment status overview - ${meta.label} Office`}>
      <div className="mb-6 rounded-2xl border bg-card p-4 shadow-card">
        <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${meta.scope === "Welfare" ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}>
          <input value={filters.studentSearch} onChange={(e) => setFilters({ ...filters, studentSearch: e.target.value })} placeholder="Student ID / Name" className="h-9 rounded-lg border bg-card px-3 text-xs font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 lg:col-span-2" />
          <select value={filters.feeType} onChange={(e) => setFilters({ ...filters, feeType: e.target.value })} className="h-9 rounded-lg border bg-card px-3 text-xs font-medium"><option value="">All fee types</option>{filterOptions.feeTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="h-9 rounded-lg border bg-card px-3 text-xs font-medium"><option value="">All categories</option>{filterOptions.categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          {meta.scope === "Welfare" && <select value={filters.faculty} onChange={(e) => setFilters({ ...filters, faculty: e.target.value })} className="h-9 rounded-lg border bg-card px-3 text-xs font-medium"><option value="">All faculties</option>{filterOptions.faculties.map((item) => <option key={item} value={item}>{item}</option>)}</select>}
          <select value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })} className="h-9 rounded-lg border bg-card px-3 text-xs font-medium"><option value="">All levels</option>{[...filterOptions.levels].sort((a, b) => a - b).map((item) => <option key={String(item)} value={String(item)}>Level {item}</option>)}</select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Total To Be Collected" value={lkr(totalToCollectAmount)} tone="primary" icon={CircleDollarSign} />
        <SummaryCard label="Total Paid" value={lkr(totalPaidAmount)} tone="success" icon={CheckCircle2} />
        <SummaryCard label="Total Not Paid" value={lkr(totalNotPaidAmount)} tone="warning" icon={Clock} />
        <SummaryCard label="Total Approval Pending" value={lkr(totalPendingAmount)} tone="warning" icon={Clock} />
        <SummaryCard label="Total Overdue" value={lkr(totalOverdueAmount)} tone="destructive" icon={XCircle} />
      </div>

      <hr className="my-6 border-muted" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Admin Approval Status</h2>
          <p className="text-xs text-muted-foreground">Approved, pending, and rejected counts</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Approved" value={String(approved)} tone="success" icon={CheckCircle2} />
            <SummaryCard label="Pending" value={String(pending)} tone="warning" icon={Clock} />
            <SummaryCard label="Rejected" value={String(rejected)} tone="destructive" icon={XCircle} />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Payment Status</h2>
          <p className="text-xs text-muted-foreground">Paid and not paid counts</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SummaryCard label="Paid" value={String(approved)} tone="success" icon={CheckCircle2} />
            <SummaryCard label="Not Paid" value={String(notPaidCount)} tone="warning" icon={Clock} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Approval Status Distribution</h2>
              <p className="text-xs text-muted-foreground">Approved / Pending / Rejected</p>
            </div>
            <PieIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-5 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={3}>
                  {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => [String(value), "Count"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Status Totals</h2>
              <p className="text-xs text-muted-foreground">Filtered count summary</p>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-5 space-y-3">
            {[{ label: "Approved", value: approved, color: STATUS_COLORS.Approved }, { label: "Pending", value: pending, color: STATUS_COLORS.Pending }, { label: "Rejected", value: rejected, color: STATUS_COLORS.Rejected }].map((row) => {
              const percent = total > 0 ? Math.round((row.value / total) * 100) : 0;
              return (
                <div key={row.label} className="rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                      {row.label}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{percent}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: row.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
