"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PortalLayout } from "@/components/portal/PortalLayout";
import { lkr } from "@/lib/data";

type AdminProfile = { firstName: string; lastName: string; designation: string };
type AdminDashboardPayment = {
  paymentId: number;
  date: string;
  sid: string;
  name: string;
  feeType: string;
  amount: number;
  status: string;
  faculty: string;
  level: number | null;
};
type AdminDashboardStats = {
  latestPayments: AdminDashboardPayment[];
};

const emptyStats: AdminDashboardStats = {
  latestPayments: [],
};

const paymentsPerPage = 8;

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats>(emptyStats);
  const [admin, setAdmin] = useState<AdminProfile>({ firstName: "Admin", lastName: "", designation: "" });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? JSON.parse(stored) : null;
    const params = new URLSearchParams();
    if (session?.userId) params.set("userId", String(session.userId));
    if (session?.username) params.set("username", session.username);
    if (session?.profileId) params.set("profileId", session.profileId);
    const query = params.toString() ? `?${params.toString()}` : "";

    Promise.all([
      fetch(`/api/admin/stats${query}`).then((r) => r.json()),
      fetch(`/api/admin/account${query}`).then((r) => r.json()),
    ])
      .then(([statsData, accountData]) => {
        if (statsData && typeof statsData === "object" && !Array.isArray(statsData) && !statsData.error) {
          setStats({
            latestPayments: Array.isArray(statsData.latestPayments) ? statsData.latestPayments : [],
          });
        }
        if (accountData && typeof accountData === "object" && !Array.isArray(accountData) && !accountData.error) {
          setAdmin(accountData);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(stats.latestPayments.length / paymentsPerPage));
  const currentPage = Math.min(page, totalPages);
  const visiblePayments = useMemo(
    () => stats.latestPayments.slice((currentPage - 1) * paymentsPerPage, currentPage * paymentsPerPage),
    [currentPage, stats.latestPayments]
  );

  useEffect(() => {
    setPage(1);
  }, [stats.latestPayments]);

  return (
    <PortalLayout
      role="admin"
      user={{
        name: `${admin.firstName} ${admin.lastName}`.trim() || "Admin",
        sub: admin.designation || "Admin Portal",
        initials: `${admin.firstName?.[0] ?? "A"}${admin.lastName?.[0] ?? ""}`,
      }}
      title="Dashboard"
      subtitle="Your payment activity"
    >
      <div className="mt-6 rounded-2xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Latest Added Payments</h2>
            <p className="text-xs text-muted-foreground">Records created under your admin account</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.latestPayments.length} records
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                {["Date", "Student ID", "Student Name", "Fee Type", "Amount", "Status"].map((header) => (
                  <th key={header} className="px-6 py-3 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : visiblePayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No payments found
                  </td>
                </tr>
              ) : (
                visiblePayments.map((payment) => (
                  <tr key={payment.paymentId} className="border-b last:border-0 transition hover:bg-muted/30">
                    <td className="px-6 py-4 text-muted-foreground">{payment.date}</td>
                    <td className="px-6 py-4 font-mono text-xs">{payment.sid}</td>
                    <td className="px-6 py-4 font-medium">{payment.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{payment.feeType}</td>
                    <td className="px-6 py-4 font-semibold tabular-nums">{lkr(payment.amount)}</td>
                    <td className="px-6 py-4">{payment.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t px-6 py-4 text-xs text-muted-foreground">
          <span>
            Showing {stats.latestPayments.length === 0 ? 0 : (currentPage - 1) * paymentsPerPage + 1}
            {" "}
            to {Math.min(currentPage * paymentsPerPage, stats.latestPayments.length)} of {stats.latestPayments.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 font-medium transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 font-medium transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
