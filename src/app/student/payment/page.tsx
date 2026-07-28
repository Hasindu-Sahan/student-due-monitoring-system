import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import StudentPaymentClient from "./student-payment-client";

type StudentProfile = { firstName: string; lastName: string; id: string };
type Fee = { studentFeeId: number; type: string; category: string; due: string; penalty: number; amount: number; paid?: number; status: string; approval: string | null; bankSlipUrl?: string | null };
type Data = { fees: Fee[]; totalPaid: number; totalDues: number; totalPendingDues: number; totalOverdue: number };

const emptyData: Data = { fees: [], totalPaid: 0, totalDues: 0, totalPendingDues: 0, totalOverdue: 0 };
const defaultStudent: StudentProfile = { firstName: "Student", lastName: "", id: "" };

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

export default async function StudentPaymentPage() {
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
    return <StudentPaymentClient initialStudent={defaultStudent} initialData={emptyData} sessionMissing />;
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

  const data: Data = {
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
        bankSlipUrl: latestPayment?.bankSlipUrl ?? null,
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
    totalOverdue: studentFees.filter((sf) => sf.status === "Overdue").reduce((sum, sf) => {
      const latestPayment = sf.payments[0];
      const paid = latestPayment?.status === "Approved" ? Number(latestPayment.amountPaid) : 0;
      return sum + Math.max(0, Number(sf.fee.amount) - paid + Number(sf.penaltyAmount));
    }, 0),
  };

  const profile: StudentProfile = { firstName: student.firstName, lastName: student.lastName, id: student.studentId };
  return <StudentPaymentClient initialStudent={profile} initialData={data} />;
}
