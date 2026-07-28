import { cookies } from "next/headers";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { SummaryCard } from "@/components/portal/SummaryCard";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { lkr } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { CircleDollarSign, AlertOctagon, ArrowUpDown, Clock } from "lucide-react";

type Fee = { studentFeeId: number; type: string; category: string; due: string; penalty: number; amount: number; paid?: number; status: string; approval: string | null };
type Data = { fees: Fee[]; totalPaid: number; totalDues: number; totalPendingDues: number; totalOverdue: number };
type StudentProfile = { firstName: string; lastName: string; faculty: string; level?: number | null; id: string };

const emptyData: Data = { fees: [], totalPaid: 0, totalDues: 0, totalPendingDues: 0, totalOverdue: 0 };
const defaultStudent: StudentProfile = { firstName: "Student", lastName: "", faculty: "", level: null, id: "" };

async function readSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("portalUser")?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as { userId?: number; username?: string; role?: string };
  } catch {
    return null;
  }
}

export default async function StudentDashboard() {
  const session = await readSession();
  const student = session?.role === "student" ? await prisma.student.findFirst({
    where:
      Number.isInteger(session.userId) && (session.userId ?? 0) > 0
        ? { userId: session.userId }
        : session.username
          ? {
              OR: [
                { studentId: session.username },
                { email: session.username },
                { user: { username: session.username } },
                { user: { email: session.username } },
              ],
            }
          : undefined,
    orderBy: { studentId: "asc" },
  }) : null;

  if (!student) {
    return (
      <PortalLayout
        role="student"
        user={{ name: "Student", sub: "", initials: "S" }}
        title="Welcome back, Student"
        subtitle="Student session not found"
      >
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground shadow-card">
          Please sign in again to view your student dashboard.
        </div>
      </PortalLayout>
    );
  }

  const now = new Date();
  await prisma.studentFee.updateMany({
    where: {
      studentId: student.studentId,
      status: { not: "Overdue" },
      fee: { dueDate: { lt: now } },
    },
    data: { status: "Overdue" },
  });

  const studentFees = await prisma.studentFee.findMany({
    where: { studentId: student.studentId },
    include: {
      fee: { include: { feeType: true } },
      payments: { orderBy: { paymentId: "desc" } },
    },
    orderBy: { assignedDate: "desc" },
  });

  const data: Data = studentFees.length
    ? {
        fees: studentFees.map((sf) => {
          const latestPayment = sf.payments[0];
          const paid = latestPayment?.status === "Approved" ? Number(latestPayment.amountPaid) : 0;
          return {
            studentFeeId: sf.studentFeeId,
            type: sf.fee.feeType.feeName,
            category: sf.fee.feeType.category ?? "",
            due: sf.fee.dueDate ? sf.fee.dueDate.toISOString().split("T")[0] : "",
            penalty: Number(sf.penaltyAmount),
            amount: Number(sf.fee.amount),
            paid,
            status: sf.status,
            approval: latestPayment?.status ?? null,
          };
        }),
        totalPaid: studentFees.reduce((sum, sf) => {
          const latestPayment = sf.payments[0];
          return sum + (latestPayment?.status === "Approved" ? Number(latestPayment.amountPaid) : 0);
        }, 0),
        totalDues: studentFees.reduce((sum, sf) => {
          const latestPayment = sf.payments[0];
          const paid = latestPayment?.status === "Approved" ? Number(latestPayment.amountPaid) : 0;
          return sum + Math.max(0, Number(sf.fee.amount) - paid + Number(sf.penaltyAmount));
        }, 0),
        totalPendingDues: studentFees.reduce((sum, sf) => {
          const latestPayment = sf.payments[0];
          return latestPayment?.status === "Pending" ? sum + Number(latestPayment.amountPaid) : sum;
        }, 0),
        totalOverdue: studentFees
          .filter((sf) => sf.status === "Overdue")
          .reduce((sum, sf) => {
            const latestPayment = sf.payments[0];
            const paid = latestPayment?.status === "Approved" ? Number(latestPayment.amountPaid) : 0;
            return sum + Math.max(0, Number(sf.fee.amount) - paid + Number(sf.penaltyAmount));
          }, 0),
      }
    : emptyData;

  const profile: StudentProfile = {
    firstName: student.firstName,
    lastName: student.lastName,
    faculty: student.faculty ?? "",
    level: student.level ?? null,
    id: student.studentId,
  };
  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = `${profile.firstName?.[0] ?? "S"}${profile.lastName?.[0] ?? ""}`;

  return (
    <PortalLayout
      role="student"
      user={{ name, sub: profile.id, initials }}
      title={`Welcome back, ${profile.firstName}`}
      subtitle={`${profile.faculty} · ${profile.level ? `Level ${profile.level}` : ""}`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Total Remaining Dues" value={lkr(data.totalDues)} tone="primary" icon={CircleDollarSign} />
        <SummaryCard label="Total Pending Dues" value={lkr(data.totalPendingDues)} tone="warning" icon={Clock} />
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
                {["Fee Type", "Category", "Due Date", "Amount", "Status"].map((h) => (
                  <th key={h} className="px-6 py-3 font-medium">
                    <span className="inline-flex items-center gap-1.5">{h} <ArrowUpDown className="h-3 w-3 opacity-50" /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.fees.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No fees assigned yet</td></tr>
              ) : data.fees.map((f) => (
                <tr key={f.studentFeeId} className="border-b last:border-0 transition hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium">{f.type}</td>
                  <td className="px-6 py-4"><span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{f.category}</span></td>
                  <td className="px-6 py-4 text-muted-foreground">{f.due}</td>
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
