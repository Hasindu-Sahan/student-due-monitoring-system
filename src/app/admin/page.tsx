"use client";

import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { SummaryCard } from "@/components/portal/SummaryCard";
import { lkr } from "@/lib/data";
import { AlertOctagon, CheckCircle2, CircleDollarSign, Clock, XCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Stats = { totalPaid: number; totalRemainingDues: number; totalPendingDues: number; totalOverdue: number; approved: number; pending: number; rejected: number };
type AdminProfile = { firstName: string; lastName: string; designation: string };

const statusColors = {
  Approved: "#16a34a",
  Pending: "#f59e0b",
  Rejected: "#dc2626",
};

const dueColors = {
  Paid: "#2563eb",
  Remaining: "#7c3aed",
  Pending: "#f59e0b",
  Overdue: "#dc2626",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalPaid: 0, totalRemainingDues: 0, totalPendingDues: 0, totalOverdue: 0, approved: 0, pending: 0, rejected: 0 });

  const [admin, setAdmin] = useState<AdminProfile>({ firstName: "Admin", lastName: "", designation: "" });
  const [loading, setLoading] = useState(true);

  // Recent payments table removed; loading is kept for initial fetch.



  const belongsToOptions = ["ALL", "FAS_Office", "FBSF_Office", "FOT_Office"] as const;
  const [belongsTo, setBelongsTo] = useState<(typeof belongsToOptions)[number]>("ALL");

  const load = (nextBelongsTo: (typeof belongsToOptions)[number] = belongsTo) => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? JSON.parse(stored) : null;
    const params = new URLSearchParams();
    if (session?.userId) params.set("userId", String(session.userId));
    if (session?.username) params.set("username", session.username);
    const accountQuery = params.toString() ? `?${params.toString()}` : "";

    const statsParams = new URLSearchParams();
    if (nextBelongsTo !== "ALL") statsParams.set("belongsTo", nextBelongsTo);

    Promise.all([
      fetch("/api/admin/payments").then(r => r.json()),
      fetch(`/api/admin/stats${statsParams.toString() ? `?${statsParams.toString()}` : ""}`).then(r => r.json()),
      fetch(`/api/admin/account${accountQuery}`).then(r => r.json()),
    ]).then(([, s, a]) => {
      setStats(s);
      if (!a.error) setAdmin(a);
      setLoading(false);
    });

  };

  useEffect(() => {
    load("ALL");
  }, []);

  useEffect(() => {
    // reload charts/cards when belongsTo changes
    load(belongsTo);
  }, [belongsTo]);

  const statusTotal = stats.approved + stats.pending + stats.rejected;

  const statusRows = [
    { label: "Pending", value: stats.pending, color: statusColors.Pending },
    { label: "Approved", value: stats.approved, color: statusColors.Approved },
    { label: "Rejected", value: stats.rejected, color: statusColors.Rejected },
  ];

  const statusPieData = [
    { name: "Approved", value: stats.approved, color: statusColors.Approved },
    { name: "Pending", value: stats.pending, color: statusColors.Pending },
    { name: "Rejected", value: stats.rejected, color: statusColors.Rejected },
  ];
  const dueData = [
    { name: "Paid", amount: stats.totalPaid, color: dueColors.Paid },
    { name: "Remaining", amount: stats.totalRemainingDues, color: dueColors.Remaining },
    { name: "Pending", amount: stats.totalPendingDues, color: dueColors.Pending },
    { name: "Overdue", amount: stats.totalOverdue, color: dueColors.Overdue },
  ];

  return (
    <PortalLayout role="admin" user={{ name: `${admin.firstName} ${admin.lastName}`.trim(), sub: admin.designation, initials: `${admin.firstName?.[0] ?? "A"}${admin.lastName?.[0] ?? ""}` }} title="Admin Dashboard" subtitle="Bursar's overview">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Dashboard Filter</h2>
          <p className="text-xs text-muted-foreground">Choose which office/faculty data to display</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Belongs To</span>
          <select
            className="h-9 rounded-lg border bg-card px-3 text-xs font-medium"
            value={belongsTo}
            onChange={(e) => setBelongsTo(e.target.value as (typeof belongsToOptions)[number])}
          >
            {belongsToOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "ALL" ? "All" : opt}
              </option>
            ))}
          </select>
        </div>
      </div>

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
              <p className="text-xs text-muted-foreground">{statusTotal} latest payment decisions</p>
            </div>
          </div>
          <div className="mt-5 grid min-h-[260px] gap-5 sm:grid-cols-[220px_minmax(0,1fr)]">
            <div className="relative h-[220px]">
              {statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={96}
                      paddingAngle={3}
                    >
                      {statusPieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [
                        String(value),
                        String(value),
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl bg-muted/40 text-sm text-muted-foreground">No payments yet</div>
              )}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-semibold tabular-nums">{statusTotal}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 self-center">
              {statusRows.map((row) => {
                const percent = statusTotal > 0 ? Math.round((row.value / statusTotal) * 100) : 0;
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
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Dues Overview</h2>
              <p className="text-xs text-muted-foreground">Paid, pending, remaining, and overdue amounts</p>
            </div>
          </div>
          <div className="mt-5 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dueData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                <Tooltip formatter={(value: number) => [lkr(Number(value)), "Amount"]} cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={44}>
                  {dueData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </PortalLayout>
  );
}
