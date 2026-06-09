"use client";

import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { SummaryCard } from "@/components/portal/SummaryCard";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { lkr } from "@/lib/data";
import { CircleDollarSign, AlertOctagon, Check, X, ArrowUpDown, ChevronLeft, ChevronRight, CheckCircle2, Clock, XCircle, Eye } from "lucide-react";

type Payment = { paymentId: number; date: string; sid: string; name: string; feeType: string; category: string; faculty: string; level: number | null; amount: number; status: string; bankSlipUrl: string | null };
type Stats = { totalRemainingDues: number; totalPendingDues: number; totalOverdue: number; approved: number; pending: number; rejected: number };
type AdminProfile = { firstName: string; lastName: string; designation: string };

type PaymentFilterOptions = {
  feeTypes: string[];
  categories: string[];
  faculties: string[];
  levels: number[];
};

const paymentsPerPage = 5;


export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats>({ totalRemainingDues: 0, totalPendingDues: 0, totalOverdue: 0, approved: 0, pending: 0, rejected: 0 });
  const [admin, setAdmin] = useState<AdminProfile>({ firstName: "Admin", lastName: "", designation: "" });
  const [filters, setFilters] = useState({
    feeType: "",
    category: "",
    faculty: "",
    level: "",
    paymentStatus: "",
    studentSearch: "",
  });

  const [sessionUserId, setSessionUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewSlip, setViewSlip] = useState<Payment | null>(null);
  const [page, setPage] = useState(1);

  const [filterOptions, setFilterOptions] = useState<PaymentFilterOptions>({
    feeTypes: [],
    categories: [],
    faculties: [],
    levels: [],
  });

  useEffect(() => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? JSON.parse(stored) : null;
    setSessionUserId(session?.userId ?? null);
    const params = new URLSearchParams();
    if (session?.userId) params.set("userId", String(session.userId));
    if (session?.username) params.set("username", session.username);
    const accountQuery = params.toString() ? `?${params.toString()}` : "";

    Promise.all([
      fetch("/api/admin/payments").then((r) => r.json()),
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch(`/api/admin/account${accountQuery}`).then((r) => r.json()),
      fetch("/api/admin/payments-options").then((r) => r.json()),
    ]).then(([p, s, a, opts]) => {
      setPayments(p);
      setStats(s);
      if (!a.error) setAdmin(a);
      if (opts && !opts.error) setFilterOptions(opts);
      setLoading(false);
    });
  }, []);

  const updateStatus = async (paymentId: number, status: string) => {
    await fetch("/api/admin/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, status, userId: sessionUserId }),
    });
    setPayments((prev) => prev.map((p) => (p.paymentId === paymentId ? { ...p, status } : p)));
    const nextStats = await fetch("/api/admin/stats").then(r => r.json());
    setStats(nextStats);
  };

  const filtered = payments.filter((payment) => {
    const matchesFeeType = !filters.feeType || payment.feeType === filters.feeType;
    const matchesCategory = !filters.category || payment.category === filters.category;
    const matchesFaculty = !filters.faculty || payment.faculty === filters.faculty;
    const matchesLevel = !filters.level || String(payment.level ?? "") === filters.level;
    const matchesPaymentStatus = !filters.paymentStatus || payment.status === filters.paymentStatus;

    const text = filters.studentSearch.toLowerCase();
    const matchesStudent =
      !text || payment.sid.toLowerCase().includes(text) || payment.name.toLowerCase().includes(text);

    return (
      matchesFeeType &&
      matchesCategory &&
      matchesFaculty &&
      matchesLevel &&
      matchesPaymentStatus &&
      matchesStudent
    );
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / paymentsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * paymentsPerPage, currentPage * paymentsPerPage);

  useEffect(() => {
    setPage(1);
  }, [filters]);


  return (
    <PortalLayout role="admin" user={{ name: `${admin.firstName} ${admin.lastName}`.trim(), sub: admin.designation, initials: `${admin.firstName?.[0] ?? "A"}${admin.lastName?.[0] ?? ""}` }} title="Payments" subtitle="Review and approve submitted bank slips">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Total Remaining Dues" value={lkr(stats.totalRemainingDues)} tone="primary" icon={CircleDollarSign} />
        <SummaryCard label="Total Pending Dues" value={lkr(stats.totalPendingDues)} tone="warning" icon={Clock} />
        <SummaryCard label="Total Overdue Amount" value={lkr(stats.totalOverdue)} tone="destructive" icon={AlertOctagon} />
        <SummaryCard label="Approved" value={String(stats.approved)} tone="success" icon={CheckCircle2} />
        <SummaryCard label="Pending" value={String(stats.pending)} tone="warning" icon={Clock} />
        <SummaryCard label="Rejected" value={String(stats.rejected)} tone="destructive" icon={XCircle} />
      </div>

      <div className="mt-6 rounded-2xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Recent Payments</h2>
            <p className="text-xs text-muted-foreground">All submissions</p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
            <input
              value={filters.studentSearch}
              onChange={(e) => setFilters({ ...filters, studentSearch: e.target.value })}
              placeholder="Student ID / Name"
              className="h-9 rounded-lg border bg-card px-3 text-xs font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 lg:col-span-2"
            />

            <select
              value={filters.feeType}
              onChange={(e) => setFilters({ ...filters, feeType: e.target.value })}
              className="h-9 rounded-lg border bg-card px-3 text-xs font-medium"
            >
              <option value="">All fee types</option>
              {filterOptions.feeTypes.map((ft) => (
                <option key={ft} value={ft}>{ft}</option>
              ))}
            </select>

            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="h-9 rounded-lg border bg-card px-3 text-xs font-medium"
            >
              <option value="">All categories</option>
              {filterOptions.categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={filters.faculty}
              onChange={(e) => setFilters({ ...filters, faculty: e.target.value })}
              className="h-9 rounded-lg border bg-card px-3 text-xs font-medium"
            >
              <option value="">All faculties</option>
              {filterOptions.faculties.map((fac) => (
                <option key={fac} value={fac}>{fac}</option>
              ))}
            </select>

            <select
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              className="h-9 rounded-lg border bg-card px-3 text-xs font-medium"
            >
              <option value="">All levels</option>
              {[...filterOptions.levels].sort((a, b) => a - b).map((lvl) => (
                <option key={String(lvl)} value={String(lvl)}>{`Level ${lvl}`}</option>
              ))}
            </select>

            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
              className="h-9 rounded-lg border bg-card px-3 text-xs font-medium"
            >
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
                {["Date", "Student ID", "Student Name", "Fee Type", "Amount", "Slip", "Approval", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-3 font-medium">
                    <span className="inline-flex items-center gap-1.5">{h} <ArrowUpDown className="h-3 w-3 opacity-50" /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">No payments found</td></tr>
              ) : paginated.map((p) => (
                <tr key={p.paymentId} className="border-b last:border-0 transition hover:bg-muted/30">
                  <td className="px-6 py-4 text-muted-foreground">{p.date}</td>
                  <td className="px-6 py-4 font-mono text-xs">{p.sid}</td>
                  <td className="px-6 py-4 font-medium">{p.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{p.feeType}</td>

                  <td className="px-6 py-4 font-semibold tabular-nums">{lkr(p.amount)}</td>
                  <td className="px-6 py-4">
                    {p.bankSlipUrl ? (
                      <button onClick={() => setViewSlip(p)} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary-soft">
                        <Eye className="h-3.5 w-3.5" /> View Slip
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">No slip</span>
                    )}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} variant="approval" /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateStatus(p.paymentId, "Approved")} className="inline-flex items-center gap-1 rounded-lg bg-success px-2.5 py-1.5 text-xs font-medium text-success-foreground transition hover:bg-success/90">
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button onClick={() => updateStatus(p.paymentId, "Rejected")} className="inline-flex items-center gap-1 rounded-lg bg-destructive px-2.5 py-1.5 text-xs font-medium text-destructive-foreground transition hover:bg-destructive/90">
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-6 py-3 text-xs text-muted-foreground">
          <span>Showing {filtered.length === 0 ? 0 : (currentPage - 1) * paymentsPerPage + 1}-{Math.min(currentPage * paymentsPerPage, filtered.length)} of {filtered.length} payments</span>
          <div className="flex items-center gap-2">
            <button disabled={currentPage === 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="flex items-center gap-1 rounded-lg border px-3 py-1.5 transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeft className="h-3.5 w-3.5" /> Previous</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} className="flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50">Next <ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>

      {viewSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-card p-6">
            <button onClick={() => setViewSlip(null)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold mb-4">Bank Slip - {viewSlip.name}</h3>
            <div className="space-y-3 text-sm mb-6">
              <div><span className="text-muted-foreground">Student ID:</span> <span className="font-medium">{viewSlip.sid}</span></div>
              <div><span className="text-muted-foreground">Fee Type:</span> <span className="font-medium">{viewSlip.feeType}</span></div>
              <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium">{lkr(viewSlip.amount)}</span></div>
              <div><span className="text-muted-foreground">Payment Date:</span> <span className="font-medium">{viewSlip.date}</span></div>
            </div>
            {viewSlip.bankSlipUrl ? (
              <div className="mb-6">
                {viewSlip.bankSlipUrl.toLowerCase().endsWith(".pdf") ? (
                  <iframe src={viewSlip.bankSlipUrl} title="Bank Slip" className="h-[70vh] w-full rounded-lg border" />
                ) : (
                  <img src={viewSlip.bankSlipUrl} alt="Bank Slip" className="max-w-full rounded-lg border" />
                )}
              </div>
            ) : (
              <div className="mb-6 rounded-lg border border-dashed p-8 text-center text-muted-foreground">No slip image available</div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setViewSlip(null)} className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-accent">
                Close
              </button>
              {viewSlip.status === "Pending" && (
                <>
                  <button onClick={() => { updateStatus(viewSlip.paymentId, "Approved"); setViewSlip(null); }} className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2 text-sm font-medium text-success-foreground transition hover:bg-success/90">
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button onClick={() => { updateStatus(viewSlip.paymentId, "Rejected"); setViewSlip(null); }} className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90">
                    <X className="h-4 w-4" /> Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
