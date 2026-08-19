"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Check, Clock, Eye, RotateCcw, X, XCircle, CheckCircle2, CircleDollarSign } from "lucide-react";

import { PortalLayout } from "@/components/portal/PortalLayout";
import { SummaryCard } from "@/components/portal/SummaryCard";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { lkr } from "@/lib/data";
import { fetchPortalSession } from "@/lib/portal-session";

type Payment = { paymentId: number; date: string; sid: string; name: string; feeType: string; category: string; faculty: string; level: number | null; amount: number; status: string; bankSlipUrl: string | null };
type Stats = { totalPaid: number; totalRemainingDues: number; totalPendingDues: number; totalOverdue: number; approved: number; pending: number; rejected: number };
type AdminProfile = { firstName: string; lastName: string; designation: string };
type PaymentFilterOptions = { feeTypes: string[]; categories: string[]; faculties: string[]; levels: number[] };

const paymentsPerPage = 5;
const emptyStats: Stats = { totalPaid: 0, totalRemainingDues: 0, totalPendingDues: 0, totalOverdue: 0, approved: 0, pending: 0, rejected: 0 };

function scopeFromSession(session: any, fallbackScope: string) {
  const value = [session?.username ?? "", session?.profileId ?? "", session?.designation ?? "", session?.dbRole ?? "", session?.role ?? ""].join(" ").toUpperCase();
  if (value.includes("WEL001") || value.includes("WELFARE")) return "Welfare";
  if (value.includes("FAC001") || value.includes("FAS_OFFICE") || value.includes("FAS")) return "FAS_Office";
  if (value.includes("FAC002") || value.includes("FOT_OFFICE") || value.includes("FOT")) return "FOT_Office";
  if (value.includes("FAC003") || value.includes("FBSF_OFFICE") || value.includes("FBSF")) return "FBSF_Office";
  return fallbackScope;
}

function portalLabel(scope: string) {
  if (scope === "Welfare") return "Welfare";
  if (scope === "FAS_Office") return "FAS";
  if (scope === "FOT_Office") return "FOT";
  if (scope === "FBSF_Office") return "FBSF";
  return scope;
}

export function OfficePaymentsPage({ defaultScope, facultyBasePath = "/faculty" }: { defaultScope: string; facultyBasePath?: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [admin, setAdmin] = useState<AdminProfile>({ firstName: "Portal", lastName: "", designation: "" });
  const [filters, setFilters] = useState({ feeType: "", category: "", faculty: "", level: "", paymentStatus: "", studentSearch: "" });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sessionUserId, setSessionUserId] = useState<number | null>(null);
  const [viewSlip, setViewSlip] = useState<Payment | null>(null);
  const [filterOptions, setFilterOptions] = useState<PaymentFilterOptions>({ feeTypes: [], categories: [], faculties: [], levels: [] });
  const [scope, setScope] = useState(defaultScope);

  useEffect(() => {
    fetchPortalSession().then((session) => {
      const resolvedScope = scopeFromSession(session, defaultScope);
      setScope(resolvedScope);
      setSessionUserId(session?.userId ?? null);

      const params = new URLSearchParams();
      if (session?.userId) params.set("userId", String(session.userId));
      if (session?.username) params.set("username", session.username);
      const accountQuery = params.toString() ? `?${params.toString()}` : "";
      const scopeQuery = `?belongsTo=${encodeURIComponent(resolvedScope)}`;

      Promise.all([
        fetch(`/api/admin/payments${scopeQuery}`).then((r) => r.json()),
        fetch(`/api/admin/stats${scopeQuery}`).then((r) => r.json()),
        fetch(`/api/admin/account${accountQuery}`).then((r) => r.json()),
        fetch(`/api/admin/payments-options${scopeQuery}`).then((r) => r.json()),
      ])
        .then(([paymentsData, statsData, accountData, optionsData]) => {
          setPayments(Array.isArray(paymentsData) ? paymentsData : []);
          setStats(statsData && typeof statsData === "object" && !Array.isArray(statsData) ? {
            totalPaid: Number(statsData.totalPaid) || 0,
            totalRemainingDues: Number(statsData.totalRemainingDues ?? statsData.totalDues) || 0,
            totalPendingDues: Number(statsData.totalPendingDues) || 0,
            totalOverdue: Number(statsData.totalOverdue) || 0,
            approved: Number(statsData.approved) || 0,
            pending: Number(statsData.pending) || 0,
            rejected: Number(statsData.rejected) || 0,
          } : emptyStats);
          if (accountData && typeof accountData === "object" && !Array.isArray(accountData) && !accountData.error) {
            setAdmin(accountData);
          }
          if (optionsData && !optionsData.error) setFilterOptions(optionsData);
          setLoading(false);
        })
        .catch(() => {
          setPayments([]);
          setStats(emptyStats);
          setLoading(false);
        });
    });
  }, [defaultScope]);

  const updateStatus = async (paymentId: number, status: string) => {
    await fetch("/api/admin/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, status, userId: sessionUserId }),
    });
    setPayments((prev) => prev.map((payment) => (payment.paymentId === paymentId ? { ...payment, status } : payment)));
    const nextStats = await fetch(`/api/admin/stats?belongsTo=${encodeURIComponent(scope)}`).then((r) => r.json());
    setStats(nextStats && typeof nextStats === "object" && !Array.isArray(nextStats) ? {
      totalPaid: Number(nextStats.totalPaid) || 0,
      totalRemainingDues: Number(nextStats.totalRemainingDues ?? nextStats.totalDues) || 0,
      totalPendingDues: Number(nextStats.totalPendingDues) || 0,
      totalOverdue: Number(nextStats.totalOverdue) || 0,
      approved: Number(nextStats.approved) || 0,
      pending: Number(nextStats.pending) || 0,
      rejected: Number(nextStats.rejected) || 0,
    } : emptyStats);
  };

  const filtered = useMemo(() => payments.filter((payment) => {
    const matchesFeeType = !filters.feeType || payment.feeType === filters.feeType;
    const matchesCategory = !filters.category || payment.category === filters.category;
    const matchesFaculty = !filters.faculty || payment.faculty === filters.faculty;
    const matchesLevel = !filters.level || String(payment.level ?? "") === filters.level;
    const matchesPaymentStatus = !filters.paymentStatus || payment.status === filters.paymentStatus;
    const text = filters.studentSearch.toLowerCase();
    const matchesStudent = !text || payment.sid.toLowerCase().includes(text) || payment.name.toLowerCase().includes(text);
    return matchesFeeType && matchesCategory && matchesFaculty && matchesLevel && matchesPaymentStatus && matchesStudent;
  }), [filters, payments]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / paymentsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * paymentsPerPage, currentPage * paymentsPerPage);
  const totalPaidAmount = filtered.filter((payment) => payment.status === "Approved").reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalPendingAmount = filtered.filter((payment) => payment.status === "Pending").reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalOverdueAmount = filtered.filter((payment) => payment.status !== "Approved").reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalNotPaidAmount = totalOverdueAmount;
  const totalToCollectAmount = totalPaidAmount + totalPendingAmount + totalOverdueAmount;

  useEffect(() => { setPage(1); }, [filters]);

  return (
    <PortalLayout role="faculty" facultyBasePath={facultyBasePath} user={{ name: `${admin.firstName} ${admin.lastName}`.trim() || portalLabel(scope), sub: admin.designation || `${portalLabel(scope)} Office`, initials: `${portalLabel(scope).slice(0, 2).toUpperCase()}` }} title="Payments" subtitle={`${portalLabel(scope)} approval queue`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Total To Be Collected" value={lkr(totalToCollectAmount)} tone="primary" icon={CircleDollarSign} />
        <SummaryCard label="Total Paid" value={lkr(totalPaidAmount)} tone="success" icon={CheckCircle2} />
        <SummaryCard label="Total Not Paid" value={lkr(totalNotPaidAmount)} tone="warning" icon={Clock} />
        <SummaryCard label="Total Approval Pending" value={lkr(totalPendingAmount)} tone="warning" icon={Clock} />
        <SummaryCard label="Total Overdue" value={lkr(totalOverdueAmount)} tone="destructive" icon={XCircle} />
      </div>

      <div className="mt-6 rounded-2xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Recent Payments</h2>
            <p className="text-xs text-muted-foreground">Scoped to {portalLabel(scope)}</p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
            <input value={filters.studentSearch} onChange={(e) => setFilters({ ...filters, studentSearch: e.target.value })} placeholder="Student ID / Name" className="h-9 rounded-lg border bg-card px-3 text-xs font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 lg:col-span-2" />
            <select value={filters.feeType} onChange={(e) => setFilters({ ...filters, feeType: e.target.value })} className="h-9 rounded-lg border bg-card px-3 text-xs font-medium">
              <option value="">All fee types</option>
              {filterOptions.feeTypes.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
            </select>
            <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="h-9 rounded-lg border bg-card px-3 text-xs font-medium">
              <option value="">All categories</option>
              {filterOptions.categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })} className="h-9 rounded-lg border bg-card px-3 text-xs font-medium">
              <option value="">All levels</option>
              {filterOptions.levels.sort((a, b) => a - b).map((lvl) => <option key={lvl} value={String(lvl)}>{`Level ${lvl}`}</option>)}
            </select>
            <select value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })} className="h-9 rounded-lg border bg-card px-3 text-xs font-medium">
              <option value="">All payment statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                {["Date", "Student ID", "Student Name", "Fee Type", "Amount", "Slip", "Approval", "Actions"].map((h) => <th key={h} className="px-6 py-3 font-medium"><span className="inline-flex items-center gap-1.5">{h}<ArrowUpDown className="h-3 w-3 opacity-50" /></span></th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">No payments found</td></tr>
              ) : paginated.map((payment) => (
                <tr key={payment.paymentId} className="border-b last:border-0 transition hover:bg-muted/30">
                  <td className="px-6 py-4 text-muted-foreground">{payment.date}</td>
                  <td className="px-6 py-4 font-mono text-xs">{payment.sid}</td>
                  <td className="px-6 py-4 font-medium">{payment.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{payment.feeType}</td>
                  <td className="px-6 py-4 font-semibold tabular-nums">{lkr(payment.amount)}</td>
                  <td className="px-6 py-4">
                    {payment.bankSlipUrl ? <button onClick={() => setViewSlip(payment)} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary-soft"><Eye className="h-3.5 w-3.5" /> View Slip</button> : <span className="text-xs text-muted-foreground">No slip</span>}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={payment.status} variant="approval" /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {payment.status === "Pending" ? (
                        <>
                          <button onClick={() => updateStatus(payment.paymentId, "Approved")} className="inline-flex items-center gap-1 rounded-lg bg-success px-2.5 py-1.5 text-xs font-medium text-success-foreground transition hover:bg-success/90"><Check className="h-3.5 w-3.5" /> Approve</button>
                          <button onClick={() => updateStatus(payment.paymentId, "Rejected")} className="inline-flex items-center gap-1 rounded-lg bg-destructive px-2.5 py-1.5 text-xs font-medium text-destructive-foreground transition hover:bg-destructive/90"><X className="h-3.5 w-3.5" /> Reject</button>
                        </>
                      ) : (
                        <button onClick={() => updateStatus(payment.paymentId, "Pending")} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"><RotateCcw className="h-3.5 w-3.5" /> Undo</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-6 py-3 text-xs text-muted-foreground">
          <span>{`Showing ${filtered.length === 0 ? 0 : (currentPage - 1) * paymentsPerPage + 1}-${Math.min(currentPage * paymentsPerPage, filtered.length)} of ${filtered.length} payments`}</span>
          <div className="flex items-center gap-2">
            <button disabled={currentPage === 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
            <span>Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} className="rounded-lg border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {viewSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-card p-6">
            <button onClick={() => setViewSlip(null)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            <h3 className="mb-4 text-lg font-semibold">Bank Slip - {viewSlip.name}</h3>
            {viewSlip.bankSlipUrl ? <img src={viewSlip.bankSlipUrl} alt="Bank Slip" className="max-w-full rounded-lg border" /> : <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No slip image available</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setViewSlip(null)} className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-accent">Close</button>
              {viewSlip.status === "Pending" ? (
                <>
                  <button onClick={() => { updateStatus(viewSlip.paymentId, "Approved"); setViewSlip(null); }} className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2 text-sm font-medium text-success-foreground transition hover:bg-success/90"><Check className="h-4 w-4" /> Approve</button>
                  <button onClick={() => { updateStatus(viewSlip.paymentId, "Rejected"); setViewSlip(null); }} className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90"><X className="h-4 w-4" /> Reject</button>
                </>
              ) : (
                <button onClick={() => { updateStatus(viewSlip.paymentId, "Pending"); setViewSlip(null); }} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-accent"><RotateCcw className="h-4 w-4" /> Undo</button>
              )}
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
