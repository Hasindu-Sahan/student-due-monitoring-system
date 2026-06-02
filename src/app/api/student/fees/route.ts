import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams.get("username")?.trim();
    const userId = Number(req.nextUrl.searchParams.get("userId"));
    const student = await prisma.student.findFirst({
      select: { studentId: true },
      where:
        Number.isInteger(userId) && userId > 0
          ? { userId }
          : username
            ? {
                OR: [
                  { studentId: username },
                  { email: username },
                  { user: { username } },
                  { user: { email: username } },
                ],
              }
            : undefined,
      orderBy: { studentId: "asc" },
    });

    if (!student) {
      return NextResponse.json({ fees: [], totalPaid: 0, totalDues: 0, totalPendingDues: 0, totalOverdue: 0 });
    }

    // Note: Prisma types in this repo currently don't expose Student.level in generated types.
    // Student dashboard payments are already scoped to studentId via StudentFee -> Payment relation.
    // Level-based filtering is handled by which StudentFee rows exist for the student's level.
    const studentLevel: number | null = null;

    const studentFees = await prisma.studentFee.findMany({
      where: {
        studentId: student.studentId,
      },
      include: {
          fee: { include: { feeType: true } },
          payments: { orderBy: { paymentId: "desc" } },
        },
      orderBy: { assignedDate: "desc" },
    });

    const formatted = studentFees.map((sf) => {
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
        paymentId: latestPayment?.paymentId ?? null,
        bankSlipUrl: latestPayment?.bankSlipUrl ?? null,
      };
    });

    // Totals computed from payments and remaining per fee
    const totalPaid = formatted.reduce((s, f) => s + (f.paid ?? 0), 0);
    const totalDues = formatted.reduce((s, f) => {
      const remaining = Math.max(0, f.amount - (f.paid ?? 0) + (f.penalty ?? 0));
      return s + remaining;
    }, 0);
    const totalOverdue = formatted
      .filter((f) => f.status === "Overdue")
      .reduce((s, f) => s + Math.max(0, f.amount - (f.paid ?? 0) + (f.penalty ?? 0)), 0);
    const totalPendingDues = studentFees.reduce((sum, sf) => {
      const latestPayment = sf.payments[0];
      return latestPayment?.status === "Pending" ? sum + Number(latestPayment.amountPaid) : sum;
    }, 0);

    return NextResponse.json({ fees: formatted, totalPaid, totalDues, totalPendingDues, totalOverdue });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch student fees" }, { status: 500 });
  }
}
