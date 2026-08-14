"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PortalLayout } from "@/components/portal/PortalLayout";
import { lkr } from "@/lib/data";

type AdminProfile = { firstName: string; lastName: string; designation: string };
type AdminDashboardPayment = {
  feeId: number;
  addedDate: string;
  feeType: string;
  category: string;
  dueDate: string;
  receivers: string;
  amount: number;
};
const emptyRows: AdminDashboardPayment[] = [];

const paymentsPerPage = 8;

export default function AdminDashboard() {
  const [rows, setRows] = useState<AdminDashboardPayment[]>(emptyRows);
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
      fetch(`/api/admin/fees${query}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/admin/account${query}`, { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([feesData, accountData]) => {
        if (Array.isArray(feesData)) {
          setRows(feesData.map((fee: any) => ({
            feeId: fee.feeId,
            addedDate: fee.addedDate ?? fee.due ?? "",
            feeType: fee.type ?? "",
            category: fee.category ?? "",
            dueDate: fee.dueDate ?? fee.due ?? "",
            receivers: fee.receivers ?? "All receivers",
            amount: Number(fee.amount ?? 0),
          })));
        }
        if (accountData && typeof accountData === "object" && !Array.isArray(accountData) && !accountData.error) {
          setAdmin(accountData);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const refresh = () => {
      const stored = localStorage.getItem("portalUser");
      const session = stored ? JSON.parse(stored) : null;
      const params = new URLSearchParams();
      if (session?.userId) params.set("userId", String(session.userId));
      if (session?.username) params.set("username", session.username);
      if (session?.profileId) params.set("profileId", session.profileId);
      const query = params.toString() ? `?${params.toString()}` : "";

      fetch(`/api/admin/fees${query}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((feesData) => {
          if (Array.isArray(feesData)) {
            setRows(feesData.map((fee: any) => ({
              feeId: fee.feeId,
              addedDate: fee.addedDate ?? fee.due ?? "",
              feeType: fee.type ?? "",
              category: fee.category ?? "",
              dueDate: fee.dueDate ?? fee.due ?? "",
              receivers: fee.receivers ?? "All receivers",
              amount: Number(fee.amount ?? 0),
            })));
          }
        });
    };

    window.addEventListener("fee-data-changed", refresh);
    return () => window.removeEventListener("fee-data-changed", refresh);
  }, []);

  const dashboardRows = rows;
  const totalPages = Math.max(1, Math.ceil(dashboardRows.length / paymentsPerPage));
  const currentPage = Math.min(page, totalPages);
  const visiblePayments = useMemo(
    () => dashboardRows.slice((currentPage - 1) * paymentsPerPage, currentPage * paymentsPerPage),
    [currentPage, dashboardRows]
  );

  useEffect(() => {
    setPage(1);
  }, [dashboardRows]);

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
            <h2 className="text-base font-semibold">Recently Added Payments</h2>
            <p className="text-xs text-muted-foreground">All fee types created by your admin account</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {dashboardRows.length} records
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                {["Date", "Fee Type", "Category", "Amount", "Due Date", "Receivers"].map((header) => (
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
                    No fee additions found
                  </td>
                </tr>
              ) : (
                visiblePayments.map((payment, index) => (
                  <tr
                    key={`${payment.feeId}-${payment.addedDate}-${payment.receivers}-${index}`}
                    className="border-b last:border-0 transition hover:bg-muted/30"
                  >
                    <td className="px-6 py-4 text-muted-foreground">{payment.addedDate}</td>
                    <td className="px-6 py-4 text-muted-foreground">{payment.feeType}</td>
                    <td className="px-6 py-4 text-muted-foreground">{payment.category}</td>
                    <td className="px-6 py-4 font-semibold tabular-nums">{lkr(payment.amount)}</td>
                    <td className="px-6 py-4 text-muted-foreground">{payment.dueDate || "-"}</td>
                    <td className="px-6 py-4 text-sm">{payment.receivers}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t px-6 py-4 text-xs text-muted-foreground">
          <span>
            Showing {dashboardRows.length === 0 ? 0 : (currentPage - 1) * paymentsPerPage + 1}
            {" "}
            to {Math.min(currentPage * paymentsPerPage, dashboardRows.length)} of {dashboardRows.length}
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
