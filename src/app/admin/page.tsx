"use client";

import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { SummaryCard } from "@/components/portal/SummaryCard";
import { lkr } from "@/lib/data";
import { AlertOctagon, CheckCircle2, CircleDollarSign, Clock, XCircle } from "lucide-react";

type Stats = { totalRemainingDues: number; totalPendingDues: number; totalOverdue: number; approved: number; pending: number; rejected: number };
type AdminProfile = { firstName: string; lastName: string; designation: string };

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalRemainingDues: 0, totalPendingDues: 0, totalOverdue: 0, approved: 0, pending: 0, rejected: 0 });

  const [admin, setAdmin] = useState<AdminProfile>({ firstName: "Admin", lastName: "", designation: "" });
  const [loading, setLoading] = useState(true);

  // Recent payments table removed; loading is kept for initial fetch.



  const load = () => {
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
    ]).then(([, s, a]) => {
      setStats(s);
      if (!a.error) setAdmin(a);
      setLoading(false);
    });

  };

  useEffect(() => {
    load();
  }, []);



  return (
    <PortalLayout role="admin" user={{ name: `${admin.firstName} ${admin.lastName}`.trim(), sub: admin.designation, initials: `${admin.firstName?.[0] ?? "A"}${admin.lastName?.[0] ?? ""}` }} title="Admin Dashboard" subtitle="Bursar's overview">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Total Remaining Dues" value={lkr(stats.totalRemainingDues)} tone="primary" icon={CircleDollarSign} />
        <SummaryCard label="Total Pending Dues" value={lkr(stats.totalPendingDues)} tone="warning" icon={Clock} />
        <SummaryCard label="Total Overdue Amount" value={lkr(stats.totalOverdue)} tone="destructive" icon={AlertOctagon} />
        <SummaryCard label="Approved" value={String(stats.approved)} tone="success" icon={CheckCircle2} />
        <SummaryCard label="Pending" value={String(stats.pending)} tone="warning" icon={Clock} />
        <SummaryCard label="Rejected" value={String(stats.rejected)} tone="destructive" icon={XCircle} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Payment Status</h2>
              <p className="text-xs text-muted-foreground">Approved vs Pending vs Rejected</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {([
              { label: "Approved", value: stats.approved, tone: "bg-success" },
              { label: "Pending", value: stats.pending, tone: "bg-warning" },
              { label: "Rejected", value: stats.rejected, tone: "bg-destructive" },
            ] as const).map((row) => {
              const max = Math.max(stats.approved, stats.pending, stats.rejected, 1);
              const width = Math.round((row.value / max) * 100);
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium tabular-nums">{row.value}</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-2 rounded-full ${row.tone}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Dues Overview</h2>
              <p className="text-xs text-muted-foreground">Overdue vs Remaining</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {([
              { label: "Remaining", value: stats.totalRemainingDues, tone: "bg-primary" },
              { label: "Overdue", value: stats.totalOverdue, tone: "bg-destructive" },
            ] as const).map((row) => {
              const max = Math.max(stats.totalRemainingDues, stats.totalOverdue, 1);
              const width = Math.round((row.value / max) * 100);
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium tabular-nums">{lkr(row.value)}</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-2 rounded-full ${row.tone}`} style={{ width: `${width}%` }} />
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
