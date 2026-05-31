"use client";

import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { SummaryCard } from "@/components/portal/SummaryCard";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { lkr } from "@/lib/data";
import { Wallet, CircleDollarSign, AlertOctagon, ArrowUpDown } from "lucide-react";

type Fee = { studentFeeId: number; type: string; due: string; penalty: number; amount: number; status: string; approval: string | null };
type Data = { fees: Fee[]; totalPaid: number; totalDues: number; totalOverdue: number };
type StudentProfile = { firstName: string; lastName: string; faculty: string; academicYear: string; id: string };

const emptyData: Data = { fees: [], totalPaid: 0, totalDues: 0, totalOverdue: 0 };
const defaultStudent: StudentProfile = { firstName: "Student", lastName: "", faculty: "", academicYear: "", id: "" };

function isStudentProfile(value: unknown): value is StudentProfile {
  return Boolean(value && typeof value === "object" && "firstName" in value);
}

function isFeesData(value: unknown): value is Data {
  return Boolean(value && typeof value === "object" && Array.isArray((value as Data).fees));
}

export default function StudentDashboard() {
  const [data, setData] = useState<Data>(emptyData);
  const [student, setStudent] = useState<StudentProfile>(defaultStudent);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const name = `${student.firstName} ${student.lastName}`.trim();
  const initials = `${student.firstName?.[0] ?? "S"}${student.lastName?.[0] ?? ""}`;

  return (
    <PortalLayout
      role="student"
      user={{ name, sub: student.id, initials }}
      title={`Welcome back, ${student.firstName}`}
      subtitle={`${student.faculty} · ${student.academicYear}`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Total Paid" value={lkr(data.totalPaid)} tone="success" icon={Wallet} />
        <SummaryCard label="Total Remaining Dues" value={lkr(data.totalDues)} tone="primary" icon={CircleDollarSign} />
        <SummaryCard label="Total Overdue Amount" value={lkr(data.totalOverdue)} tone="destructive" icon={AlertOctagon} />
      </div>

      <div className="mt-6 rounded-2xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Recent Outstanding Fees</h2>
            <p className="text-xs text-muted-foreground">Your fees awaiting action</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                {["Fee Type", "Due Date", "Penalty", "Amount", "Status"].map((h) => (
                  <th key={h} className="px-6 py-3 font-medium">
                    <span className="inline-flex items-center gap-1.5">{h} <ArrowUpDown className="h-3 w-3 opacity-50" /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : data.fees.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No fees assigned yet</td></tr>
              ) : data.fees.map((f) => (
                <tr key={f.studentFeeId} className="border-b last:border-0 transition hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium">{f.type}</td>
                  <td className="px-6 py-4 text-muted-foreground">{f.due}</td>
                  <td className="px-6 py-4 text-muted-foreground">{f.penalty ? lkr(f.penalty) : "—"}</td>
                  <td className="px-6 py-4 font-semibold tabular-nums">{lkr(f.amount)}</td>
                  <td className="px-6 py-4"><StatusBadge status={f.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  );
}
