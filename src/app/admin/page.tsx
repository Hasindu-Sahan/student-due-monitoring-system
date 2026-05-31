"use client";

import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { SummaryCard } from "@/components/portal/SummaryCard";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { lkr } from "@/lib/data";
import { CircleDollarSign, Wallet, AlertOctagon, Check, X, ArrowUpDown, Eye } from "lucide-react";

type Payment = { paymentId: number; date: string; sid: string; name: string; type: string; amount: number; status: string; bankSlipUrl: string | null };
type Stats = { totalPaid: number; totalDues: number; totalOverdue: number };
type AdminProfile = { firstName: string; lastName: string; designation: string };

export default function AdminDashboard() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats>({ totalPaid: 0, totalDues: 0, totalOverdue: 0 });
  const [admin, setAdmin] = useState<AdminProfile>({ firstName: "Admin", lastName: "", designation: "" });
  const [loading, setLoading] = useState(true);
  const [viewSlip, setViewSlip] = useState<Payment | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? JSON.parse(stored) : null;
    const params = new URLSearchParams();
    if (session?.userId) params.set("userId", String(session.userId));
    if (session?.username) params.set("username", session.username);
    const accountQuery = params.toString() ? `?${params.toString()}` : "";

    Promise.all([
      fetch("/api/admin/payments").then(r => r.json()),
      fetch("/api/admin/stats").then(r => r.json()),
      fetch(`/api/admin/account${accountQuery}`).then(r => r.json()),
    ]).then(([p, s, a]) => {
      setPayments(p);
      setStats(s);
      if (!a.error) setAdmin(a);
      setLoading(false);
    });
  }, []);

  const updateStatus = async (paymentId: number, status: string) => {
    await fetch("/api/admin/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, status }),
    });
    setPayments(prev => prev.map(p => p.paymentId === paymentId ? { ...p, status } : p));
  };

  return (
    <PortalLayout role="admin" user={{ name: `${admin.firstName} ${admin.lastName}`.trim(), sub: admin.designation, initials: `${admin.firstName?.[0] ?? "A"}${admin.lastName?.[0] ?? ""}` }} title="Admin Dashboard" subtitle="Bursar's overview">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Total Remaining Dues" value={lkr(stats.totalDues)} tone="primary" icon={CircleDollarSign} />
        <SummaryCard label="Total Received" value={lkr(stats.totalPaid)} tone="success" icon={Wallet} />
        <SummaryCard label="Total Overdue Amount" value={lkr(stats.totalOverdue)} tone="destructive" icon={AlertOctagon} />
      </div>

      <div className="mt-6 rounded-2xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Recent Payments</h2>
            <p className="text-xs text-muted-foreground">Latest slip submissions awaiting review</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                {["Date", "Student ID", "Student Name", "Fee Type", "Amount", "Slip", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-3 font-medium">
                    <span className="inline-flex items-center gap-1.5">{h} <ArrowUpDown className="h-3 w-3 opacity-50" /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">No payments yet</td></tr>
              ) : payments.map((p) => (
                <tr key={p.paymentId} className="border-b last:border-0 transition hover:bg-muted/30">
                  <td className="px-6 py-4 text-muted-foreground">{p.date}</td>
                  <td className="px-6 py-4 font-mono text-xs">{p.sid}</td>
                  <td className="px-6 py-4 font-medium">{p.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{p.type}</td>
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
              <div><span className="text-muted-foreground">Fee Type:</span> <span className="font-medium">{viewSlip.type}</span></div>
              <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium">{lkr(viewSlip.amount)}</span></div>
              <div><span className="text-muted-foreground">Payment Date:</span> <span className="font-medium">{viewSlip.date}</span></div>
            </div>
            {viewSlip.bankSlipUrl ? (
              <div className="mb-6">
                <img src={viewSlip.bankSlipUrl} alt="Bank Slip" className="max-w-full rounded-lg border" />
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
