"use client";

import { useEffect, useState } from "react";

import { PortalLayout } from "@/components/portal/PortalLayout";
import { lkr } from "@/lib/data";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { StatusBadge } from "@/components/portal/StatusBadge";

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
  bankSlipUrl: string | null;
};

type PaymentFilterOptions = {
  feeTypes: string[];
  categories: string[];
  faculties: string[];
  levels: number[];
};

type AdminProfile = { firstName: string; lastName: string; designation: string };

const paymentsPerPage = 5;

function belongsToScope(session: any) {
  const value = String(`${session?.username ?? ""} ${session?.profileId ?? ""} ${session?.designation ?? ""}`).toUpperCase();
  if (value.includes("WEL001") || value.includes("WELFARE")) return "Welfare";
  if (value.includes("FAC001") || value.includes("FAS_OFFICE")) return "FAS_Office";
  if (value.includes("FBSF") || value.includes("FBSF_OFFICE")) return "FBSF_Office";
  if (value.includes("FOT") || value.includes("FOT_OFFICE")) return "FOT_Office";
  return "";
}

export default function FacultyPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [admin, setAdmin] = useState<AdminProfile>({ firstName: "Faculty", lastName: "", designation: "" });
  const [portalName, setPortalName] = useState("Faculty");

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
  const [loadError, setLoadError] = useState("");

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
    const scope = belongsToScope(session);
    if (scope) setPortalName(scope);
    const scopeQuery = scope ? `?belongsTo=${encodeURIComponent(scope)}` : "";

    Promise.all([
      fetch(`/api/admin/payments${scopeQuery}`).then((r) => r.json()),
      fetch("/api/admin/account" + accountQuery).then((r) => r.json()),
      fetch(`/api/admin/payments-options${scopeQuery}`).then((r) => r.json()),
    ]).then(([p, a, opts]) => {
      setPayments(Array.isArray(p) ? p : []);
      setLoadError(Array.isArray(p) ? "" : p?.error ?? "Failed to fetch payments");
      if (!a.error) {
        setAdmin(a);
        setPortalName(a.designation?.toLowerCase().includes("welfare") ? "Welfare" : (a.designation?.includes("Office") ? a.designation : "Faculty"));
      }
      if (opts && !opts.error) setFilterOptions(opts);
      setLoading(false);
    }).catch(() => {
      setPayments([]);
      setLoadError("Failed to fetch payments");
      setLoading(false);
    });
  }, []);

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
  const paginated = filtered.slice(
    (currentPage - 1) * paymentsPerPage,
    currentPage * paymentsPerPage
  );
  const displayName = `${admin.firstName} ${admin.lastName}`.trim();
  const userName = displayName;
  const userSub = admin.designation || portalName;
  const userInitials = portalName === "Welfare" ? "W" : `${admin.firstName?.[0] ?? "F"}${admin.lastName?.[0] ?? ""}`;

  useEffect(() => {
    setPage(1);
  }, [filters]);

  return (
    <PortalLayout
      role="faculty"
      user={{
        name: userName,
        sub: userSub,
        initials: userInitials,
      }}
      title="Payments"
      subtitle={`${portalName} view (read-only)`}
    >
      {/* No top cards for faculty */}

      <div className="mt-0 rounded-2xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Recent Payments</h2>
            <p className="text-xs text-muted-foreground">All submissions</p>
          </div>
          <div className={`grid w-full grid-cols-1 gap-2 sm:grid-cols-2 ${portalName === "Welfare" ? "lg:grid-cols-7" : "lg:grid-cols-6"}`}>
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
                <option key={ft} value={ft}>
                  {ft}
                </option>
              ))}
            </select>

            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="h-9 rounded-lg border bg-card px-3 text-xs font-medium"
            >
              <option value="">All categories</option>
              {filterOptions.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {portalName === "Welfare" && (
              <select
                value={filters.faculty}
                onChange={(e) => setFilters({ ...filters, faculty: e.target.value })}
                className="h-9 rounded-lg border bg-card px-3 text-xs font-medium"
              >
                <option value="">All faculties</option>
                {filterOptions.faculties.map((fac) => (
                  <option key={fac} value={fac}>
                    {fac}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              className="h-9 rounded-lg border bg-card px-3 text-xs font-medium"
            >
              <option value="">All levels</option>
              {[...filterOptions.levels]
                .sort((a, b) => a - b)
                .map((lvl) => (
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
                {[
                  "Date",
                  "Student ID",
                  "Student Name",
                  "Fee Type",
                  "Amount",
                  "Status",
                  "Slip",
                ].map((h) => (
                  <th key={h} className="px-6 py-3 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {h} <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    {loadError || "No payments found"}
                  </td>
                </tr>
              ) : (
                paginated.map((p) => (
                  <tr
                    key={p.paymentId}
                    className="border-b last:border-0 transition hover:bg-muted/30"
                  >
                    <td className="px-6 py-4 text-muted-foreground">{p.date}</td>
                    <td className="px-6 py-4 font-mono text-xs">{p.sid}</td>
                    <td className="px-6 py-4 font-medium">{p.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{p.feeType}</td>

                    <td className="px-6 py-4 font-semibold tabular-nums">{lkr(p.amount)}</td>

                    <td className="px-6 py-4">
                      <StatusBadge status={p.status} variant="approval" />
                    </td>

                    <td className="px-6 py-4">
                      {p.bankSlipUrl ? (
                        <button
                          onClick={() => setViewSlip(p)}
                          className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary-soft"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Slip
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">No slip</span>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-6 py-3 text-xs text-muted-foreground">
          <span>
            {`Showing ${filtered.length === 0 ? 0 : (currentPage - 1) * paymentsPerPage + 1}-${Math.min(
              currentPage * paymentsPerPage,
              filtered.length
            )} of ${filtered.length}`}
          </span>

          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary"
                onClick={() => setPage(1)}
              >
                1
              </button>
              {totalPages > 1 && (
                <button
                  className="rounded-lg border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted"
                  onClick={() => setPage(totalPages)}
                >
                  {totalPages}
                </button>
              )}
            </div>

            <button
              className="rounded-lg border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {viewSlip && (
          <div className="mt-6 rounded-2xl border bg-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold">Payment Slip</h3>
                <p className="mt-1 text-xs text-muted-foreground">{viewSlip.sid} • {viewSlip.name}</p>
              </div>
              <button
                className="rounded-lg border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted"
                onClick={() => setViewSlip(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              {viewSlip.bankSlipUrl ? (
                <iframe
                  src={viewSlip.bankSlipUrl}
                  className="h-[70vh] w-full rounded-lg border bg-white"
                  title="Slip"
                />
              ) : (
                <p className="text-sm text-muted-foreground">No slip available.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

