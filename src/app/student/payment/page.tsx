"use client";

import { useState, useEffect, useRef } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { SummaryCard } from "@/components/portal/SummaryCard";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { lkr } from "@/lib/data";
import { CircleDollarSign, AlertOctagon, Upload, ChevronLeft, ChevronRight, ArrowUpDown, X, Clock } from "lucide-react";

type Fee = { studentFeeId: number; type: string; category: string; due: string; penalty: number; amount: number; paid?: number; status: string; approval: string | null; bankSlipUrl?: string | null };
type Data = { fees: Fee[]; totalPaid: number; totalDues: number; totalPendingDues: number; totalOverdue: number };
type StudentProfile = { firstName: string; lastName: string; id: string };

type UploadState = {
  studentFeeId: number;
  fee: Fee;
  file: File | null;
  fileName: string;
} | null;

const emptyData: Data = { fees: [], totalPaid: 0, totalDues: 0, totalPendingDues: 0, totalOverdue: 0 };
const defaultStudent: StudentProfile = { firstName: "Student", lastName: "", id: "" };

function isStudentProfile(value: unknown): value is StudentProfile {
  return Boolean(value && typeof value === "object" && "firstName" in value);
}

function isFeesData(value: unknown): value is Data {
  return Boolean(value && typeof value === "object" && Array.isArray((value as Data).fees));
}

export default function StudentPayment() {
  const [data, setData] = useState<Data>(emptyData);
  const [student, setStudent] = useState<StudentProfile>(defaultStudent);
  const [loading, setLoading] = useState(true);
  const [uploadState, setUploadState] = useState<UploadState>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? JSON.parse(stored) : null;
    const params = new URLSearchParams();
    if (session?.userId) params.set("userId", String(session.userId));
    if (session?.username) params.set("username", session.username);
    const query = params.toString() ? `?${params.toString()}` : "";

    Promise.all([
      fetch(`/api/student/fees${query}`).then(r => r.json()),
      fetch(`/api/student/account${query}`).then(r => r.json()),
    ]).then(([feesData, studentData]) => {
      setData(isFeesData(feesData) ? feesData : emptyData);
      setStudent(isStudentProfile(studentData) ? studentData : defaultStudent);
      setLoading(false);
    }).catch(() => {
      setData(emptyData);
      setStudent(defaultStudent);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    const refresh = window.setInterval(load, 10000);
    return () => window.clearInterval(refresh);
  }, []);

  const handleOpenUpload = (fee: Fee) => {
    setUploadState({
      studentFeeId: fee.studentFeeId,
      fee,
      file: null,
      fileName: "",
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadState) {
      setUploadState({
        ...uploadState,
        file,
        fileName: file.name,
      });
    }
  };

  const handleSubmitUpload = async () => {
    if (!uploadState || !uploadState.file) return;
    
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("studentFeeId", String(uploadState.studentFeeId));
      formData.append("amountPaid", String(uploadState.fee.amount));
      formData.append("slip", uploadState.file);

      const response = await fetch("/api/student/payments", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setUploadState(null);
        load(); // refresh
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseUpload = () => {
    setUploadState(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const name = `${student.firstName} ${student.lastName}`.trim();
  const initials = `${student.firstName?.[0] ?? "S"}${student.lastName?.[0] ?? ""}`;

  return (
    <PortalLayout
      role="student"
      user={{ name, sub: student.id, initials }}
      title="Payments"
      subtitle="Settle outstanding fees and upload payment slips"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Total Remaining Dues" value={lkr(data.totalDues)} tone="primary" icon={CircleDollarSign} />
        <SummaryCard label="Total Pending Dues" value={lkr(data.totalPendingDues)} tone="warning" icon={Clock} />
        <SummaryCard label="Total Overdue Amount" value={lkr(data.totalOverdue)} tone="destructive" icon={AlertOctagon} />
      </div>

      <div className="mt-6 rounded-2xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Outstanding Fees</h2>
            <p className="text-xs text-muted-foreground">Upload your bank slip for each fee to request approval</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                {["Fee Type", "Category", "Due Date", "Amount", "Status", "Slip Upload", "Approval"].map((h) => (
                  <th key={h} className="px-6 py-3 font-medium">
                    <span className="inline-flex items-center gap-1.5">{h} <ArrowUpDown className="h-3 w-3 opacity-50" /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : data.fees.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No fees assigned yet</td></tr>
              ) : data.fees.map((f) => (
                <tr key={f.studentFeeId} className="border-b last:border-0 transition hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium">{f.type}</td>
                  <td className="px-6 py-4"><span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{f.category}</span></td>
                  <td className="px-6 py-4 text-muted-foreground">{f.due}</td>
                  <td className="px-6 py-4 font-semibold tabular-nums">{lkr(f.amount)}</td>
                  <td className="px-6 py-4"><StatusBadge status={f.status} /></td>
                  <td className="px-6 py-4">
                    <button
                      disabled={f.status === "Paid" && !f.bankSlipUrl}
                      onClick={() => handleOpenUpload(f)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {f.bankSlipUrl ? "Uploaded" : "Upload"}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    {f.approval && <StatusBadge status={f.approval} variant="approval" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-6 py-3 text-xs text-muted-foreground">
          <span>Showing {data.fees.length} fees</span>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 rounded-lg border px-3 py-1.5 transition hover:bg-accent"><ChevronLeft className="h-3.5 w-3.5" /> Previous</button>
            <button className="flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 font-medium text-foreground transition hover:bg-accent">Next <ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      {uploadState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-semibold">{uploadState.fee.bankSlipUrl ? "Edit Payment Slip" : "Upload Payment Slip"}</h3>
              <button
                onClick={handleCloseUpload}
                className="rounded-lg p-1 transition hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">Fee: {uploadState.fee.type}</p>
                <p className="text-xs text-muted-foreground">Amount: {lkr(uploadState.fee.amount)}</p>
                {uploadState.fee.bankSlipUrl && (
                  <div className="mt-3 rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-foreground">Current slip uploaded</p>
                    <p className="mt-1 text-xs text-muted-foreground">Choose another file below to resubmit and replace the current slip.</p>
                    <a
                      href={uploadState.fee.bankSlipUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-xs font-medium text-primary transition hover:underline"
                    >
                      View current slip
                    </a>
                  </div>
                )}
              </div>

              <div className="rounded-lg border-2 border-dashed border-primary/30 p-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {uploadState.fileName ? (
                  <div className="text-center">
                    <Upload className="mx-auto mb-2 h-8 w-8 text-primary/60" />
                    <p className="text-sm font-medium text-foreground">{uploadState.fileName}</p>
                    <p className="text-xs text-muted-foreground">Click upload to change file</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-soft px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary hover:text-primary-foreground"
                    >
                      <Upload className="h-4 w-4" />
                      Change File
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer text-center"
                  >
                    <Upload className="mx-auto mb-2 h-8 w-8 text-primary/60" />
                    <p className="text-sm font-medium text-foreground">{uploadState.fee.bankSlipUrl ? "Click to choose replacement file" : "Click to select file"}</p>
                    <p className="text-xs text-muted-foreground">or drag and drop</p>
                    <p className="mt-2 text-xs text-muted-foreground">PDF, JPG, or PNG (max 10MB)</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCloseUpload}
                  className="flex-1 rounded-lg border bg-muted px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted/80"
                >
                  Cancel
                </button>
                <button
                  disabled={!uploadState.file || submitting}
                  onClick={handleSubmitUpload}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : uploadState.fee.bankSlipUrl ? "Resubmit" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
