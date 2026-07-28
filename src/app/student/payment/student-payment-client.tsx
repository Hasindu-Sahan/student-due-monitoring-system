"use client";

import { useRef, useState } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { SummaryCard } from "@/components/portal/SummaryCard";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { lkr } from "@/lib/data";
import { CircleDollarSign, AlertOctagon, Upload, ChevronLeft, ChevronRight, ArrowUpDown, X, Clock } from "lucide-react";

type Fee = { studentFeeId: number; type: string; category: string; due: string; penalty: number; amount: number; paid?: number; status: string; approval: string | null; bankSlipUrl?: string | null };
type Data = { fees: Fee[]; totalPaid: number; totalDues: number; totalPendingDues: number; totalOverdue: number };
type StudentProfile = { firstName: string; lastName: string; id: string };

type UploadState = { studentFeeId: number; fee: Fee; file: File | null; fileName: string } | null;

const allowedSlipTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maxSlipSize = 10 * 1024 * 1024;

export default function StudentPaymentClient({ initialStudent, initialData, sessionMissing = false }: { initialStudent: StudentProfile; initialData: Data; sessionMissing?: boolean }) {
  const [data, setData] = useState<Data>(initialData);
  const [student] = useState<StudentProfile>(initialStudent);
  const [uploadState, setUploadState] = useState<UploadState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenUpload = (fee: Fee) => {
    setUploadError("");
    setUploadState({ studentFeeId: fee.studentFeeId, fee, file: null, fileName: "" });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadState) {
      if (!allowedSlipTypes.has(file.type)) {
        setUploadError("Only PDF, JPG, and PNG slips are allowed.");
        e.target.value = "";
        return;
      }
      if (file.size > maxSlipSize) {
        setUploadError("Slip file must be 10MB or smaller.");
        e.target.value = "";
        return;
      }
      setUploadError("");
      setUploadState({ ...uploadState, file, fileName: file.name });
    }
  };

  const refresh = async () => {
    const res = await fetch("/api/student/fees");
    const next = await res.json();
    if (res.ok && Array.isArray(next.fees)) setData(next);
  };

  const handleSubmitUpload = async () => {
    if (!uploadState || !uploadState.file) {
      setUploadError("Please choose a PDF, JPG, or PNG slip.");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("studentFeeId", String(uploadState.studentFeeId));
      formData.append("amountPaid", String(uploadState.fee.amount));
      formData.append("slip", uploadState.file);
      const response = await fetch("/api/student/payments", { method: "POST", body: formData });
      if (response.ok) {
        setUploadState(null);
        await refresh();
      } else {
        const resData = await response.json();
        setUploadError(resData.error ?? "Failed to submit payment slip.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseUpload = () => {
    setUploadState(null);
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const name = `${student.firstName} ${student.lastName}`.trim();
  const initials = `${student.firstName?.[0] ?? "S"}${student.lastName?.[0] ?? ""}`;

  return (
    <PortalLayout role="student" user={{ name, sub: student.id, initials }} title="Payments" subtitle={sessionMissing ? "Please sign in again" : "Settle outstanding fees and upload payment slips"}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Total Remaining Dues" value={lkr(data.totalDues)} tone="primary" icon={CircleDollarSign} />
        <SummaryCard label="Total Pending Dues" value={lkr(data.totalPendingDues)} tone="warning" icon={Clock} />
        <SummaryCard label="Total Overdue Amount" value={lkr(data.totalOverdue)} tone="destructive" icon={AlertOctagon} />
      </div>
      <div className="mt-6 rounded-2xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div><h2 className="text-base font-semibold">Outstanding Fees</h2><p className="text-xs text-muted-foreground">Upload your bank slip for each fee to request approval</p></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                {["Fee Type", "Category", "Due Date", "Amount", "Status", "Slip Upload", "Approval"].map((h) => <th key={h} className="px-6 py-3 font-medium"><span className="inline-flex items-center gap-1.5">{h} <ArrowUpDown className="h-3 w-3 opacity-50" /></span></th>)}
              </tr>
            </thead>
            <tbody>
              {data.fees.length === 0 ? <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No fees assigned yet</td></tr> : data.fees.map((f) => (
                <tr key={f.studentFeeId} className="border-b last:border-0 transition hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium">{f.type}</td>
                  <td className="px-6 py-4"><span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{f.category}</span></td>
                  <td className="px-6 py-4 text-muted-foreground">{f.due}</td>
                  <td className="px-6 py-4 font-semibold tabular-nums">{lkr(f.amount)}</td>
                  <td className="px-6 py-4">{f.status === "Late Paid" ? <span className="text-destructive font-medium">Late Paid</span> : <StatusBadge status={f.status} />}</td>
                  <td className="px-6 py-4"><button onClick={() => handleOpenUpload(f)} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary hover:text-primary-foreground"><Upload className="h-3.5 w-3.5" />{f.bankSlipUrl ? "Uploaded" : "Upload"}</button></td>
                  <td className="px-6 py-4">{f.approval && <StatusBadge status={f.approval} variant="approval" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {uploadState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-semibold">Upload Payment Slip</h3>
              <button onClick={handleCloseUpload} className="rounded-lg p-1 transition hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 px-6 py-4">
              <p className="text-sm font-medium text-foreground">Fee: {uploadState.fee.type}</p>
              <div className="rounded-lg border-2 border-dashed border-primary/30 p-6">
                <input ref={fileInputRef} type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" />
                <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer text-center">
                  <Upload className="mx-auto mb-2 h-8 w-8 text-primary/60" />
                  <p className="text-sm font-medium text-foreground">{uploadState.fileName || "Click to select file"}</p>
                </div>
              </div>
              {uploadError && <div className="rounded-xl border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{uploadError}</div>}
              <div className="flex gap-3">
                <button onClick={handleCloseUpload} className="flex-1 rounded-lg border bg-muted px-4 py-2 text-sm font-medium text-foreground">Cancel</button>
                <button disabled={!uploadState.file || submitting} onClick={handleSubmitUpload} className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{submitting ? "Submitting..." : "Submit"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
