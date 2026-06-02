"use client";

import { useEffect, useState } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { FileText, FileSpreadsheet, Filter, ArrowUpDown } from "lucide-react";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "h-10 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";

type AdminProfile = { firstName: string; lastName: string; designation: string };

type ReportsData = {
  feeTypes: string[];
  feeCategories: string[];
  faculties: string[];
  reports: { id: number; date: string; by: string; filter: string; filters: ReportsFilters }[];
};

type ReportsFilters = {
  startDate: string;
  endDate: string;
  faculty: string;
  level?: string;
  feeCategory: string;
  feeType: string;
  student: string;
  paymentStatus: string;
};

export default function Reports() {
  const [admin, setAdmin] = useState<AdminProfile>({ firstName: "Admin", lastName: "", designation: "" });
  const [data, setData] = useState<ReportsData>({ feeTypes: [], feeCategories: [], faculties: [], reports: [] });
  const [filters, setFilters] = useState<ReportsFilters>({
    startDate: "",
    endDate: "",
    faculty: "",
    level: "",
    feeCategory: "",
    feeType: "",
    student: "",
    paymentStatus: "All",
  });
  const [sessionUserId, setSessionUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? JSON.parse(stored) : null;
    setSessionUserId(session?.userId ?? null);

    const params = new URLSearchParams();
    if (session?.userId) params.set("userId", String(session.userId));
    if (session?.username) params.set("username", session.username);
    const accountQuery = params.toString() ? `?${params.toString()}` : "";

    Promise.all([
      fetch(`/api/admin/account${accountQuery}`).then((r) => r.json()),
      fetch("/api/admin/reports").then((r) => r.json()),
    ]).then(([adminData, reportsData]) => {
      if (!adminData.error) setAdmin(adminData);
      if (!reportsData.error) setData(reportsData);
      setLoading(false);
    });
  }, []);

  const initials = `${admin.firstName?.[0] ?? "A"}${admin.lastName?.[0] ?? ""}`;

  const reloadReports = async () => {
    const reportsData = await fetch("/api/admin/reports").then((r) => r.json());
    if (!reportsData.error) setData(reportsData);
  };

  const saveReport = (report: { rows: Array<Record<string, string | number>>; filter: string }, fileType: "pdf" | "excel") => {
    if (fileType === "excel") {
      const header = ["Date", "Student ID", "Student Name", "Faculty", "Fee Type", "Amount", "Status"];
      const rows: Array<Array<string | number>> = report.rows.map((row: Record<string, string | number>) => [
        row.date,
        row.studentId,
        row.studentName,
        row.faculty,
        row.feeType,
        row.amount,
        row.status,
      ]);

      const csv = [header, ...rows]
        .map((row) =>
          row
            .map((cell: string | number) => `"${String(cell).replaceAll('"', '""')}"`)
            .join(",")
        )
        .join("\n");

      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "fee-report.csv";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const html = `<!doctype html><title>Fee Report</title><body><h1>Fee Report</h1><p>${report.filter}</p><table border="1" cellspacing="0" cellpadding="6"><tr><th>Date</th><th>Student ID</th><th>Name</th><th>Faculty</th><th>Fee</th><th>Amount</th><th>Status</th></tr>${report.rows
        .map(
          (row: Record<string, string | number>) =>
            `<tr><td>${row.date}</td><td>${row.studentId}</td><td>${row.studentName}</td><td>${row.faculty}</td><td>${row.feeType}</td><td>${row.amount}</td><td>${row.status}</td></tr>`
        )
        .join("")}</table><script>print()</script></body>`;

      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      window.open(url, "_blank");
    }
  };

  const generateReport = async (fileType: "pdf" | "excel", reportFilters = filters) => {
    const res = await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters: reportFilters, fileType, userId: sessionUserId }),
    });

    const report = await res.json();
    if (report.error) return;

    saveReport(report, fileType);
    reloadReports();
  };

  const resetFilters = () =>
    setFilters({ startDate: "", endDate: "", faculty: "", level: "", feeCategory: "", feeType: "", student: "", paymentStatus: "All" });

  return (
    <PortalLayout
      role="admin"
      user={{ name: `${admin.firstName} ${admin.lastName}`.trim(), sub: admin.designation, initials }}
      title="Reports"
      subtitle="Generate financial reports for the bursar's office"
    >
      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Filter className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Generate report</h2>
              <p className="text-xs text-muted-foreground">Filter and export to PDF or Excel</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Date Range">
            <div className="flex items-center gap-2">
              <input type="date" className={inputCls} value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
              <input type="date" className={inputCls} value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
            </div>
          </Field>

          <Field label="Faculty">
            <select className={inputCls} value={filters.faculty} onChange={(e) => setFilters({ ...filters, faculty: e.target.value })}>
              <option value="">All Faculties</option>
              <option value="none">none</option>
              {data.faculties.map((faculty) => (
                <option key={faculty} value={faculty}>
                  {faculty}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Level">
            <select className={inputCls} value={filters.level ?? ""} onChange={(e) => setFilters({ ...filters, level: e.target.value })}>
              <option value="">All Levels</option>
              <option value="none">none</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
              <option value="4">Level 4</option>
            </select>
          </Field>

          <Field label="Fee category">
            <select className={inputCls} value={filters.feeCategory} onChange={(e) => setFilters({ ...filters, feeCategory: e.target.value })}>
              <option value="">All categories</option>
              <option value="none">none</option>
              {data.feeCategories.map((cat: string) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Fee Type">
            <select className={inputCls} value={filters.feeType} onChange={(e) => setFilters({ ...filters, feeType: e.target.value })}>
              <option value="">All Fee Types</option>
              <option value="none">none</option>
              {data.feeTypes.map((feeType: string) => (
                <option key={feeType} value={feeType}>
                  {feeType}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Payment status">
            <select className={inputCls} value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}>
              <option value="All">All</option>
              <option value="Paid">Paid</option>
              <option value="Not Paid">Not Paid</option>
              <option value="Rejected">Rejected</option>
            </select>
          </Field>

          <Field label="Student-wise">
            <input
              className={inputCls}
              value={filters.student}
              onChange={(e) => setFilters({ ...filters, student: e.target.value })}
              placeholder="Search by Student ID or name"
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button onClick={resetFilters} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:bg-accent">
            Reset filters
          </button>

          <div className="flex items-center gap-3">
            <button onClick={reloadReports} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90">
              Apply filter
            </button>
            <button onClick={() => generateReport("pdf")} className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground shadow-soft transition hover:bg-destructive/90">
              <FileText className="h-4 w-4" /> Generate PDF
            </button>
            <button onClick={() => generateReport("excel")} className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-success-foreground shadow-soft transition hover:bg-success/90">
              <FileSpreadsheet className="h-4 w-4" /> Generate Excel
            </button>
          </div>
        </div>
      </section>

      <div className="mt-6 rounded-2xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Recent Report History</h2>
            <p className="text-xs text-muted-foreground">Latest 6 generated reports</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                {[
                  "Date",
                  "Generated By",
                  "Filter Type",
                  "File",
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
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : data.reports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No report history yet
                  </td>
                </tr>
              ) : (
                data.reports.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 transition hover:bg-muted/30">
                    <td className="px-6 py-4 text-muted-foreground">{r.date}</td>
                    <td className="px-6 py-4 font-medium">{r.by}</td>
                    <td className="px-6 py-4 text-muted-foreground">{r.filter}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => generateReport("pdf", r.filters)} className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive-soft px-2.5 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive hover:text-destructive-foreground">
                          <FileText className="h-3.5 w-3.5" /> PDF
                        </button>
                        <button onClick={() => generateReport("excel", r.filters)} className="inline-flex items-center gap-1.5 rounded-lg border border-success/20 bg-success-soft px-2.5 py-1.5 text-xs font-medium text-success transition hover:bg-success hover:text-success-foreground">
                          <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  );
}
