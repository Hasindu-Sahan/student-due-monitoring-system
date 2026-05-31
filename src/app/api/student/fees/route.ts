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
      return NextResponse.json({ fees: [], totalPaid: 0, totalDues: 0, totalOverdue: 0 });
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
        payments: { orderBy: { paymentDate: "desc" }, take: 1 },
      },
      orderBy: { assignedDate: "desc" },
    });

    const formatted = studentFees.map((sf) => ({
      studentFeeId: sf.studentFeeId,
      type: sf.fee.feeType.feeName,
      due: sf.fee.dueDate.toISOString().split("T")[0],
      penalty: Number(sf.penaltyAmount),
      amount: Number(sf.fee.amount),
      status: sf.status,
      approval: sf.payments[0]?.status ?? null,
      paymentId: sf.payments[0]?.paymentId ?? null,
    }));

    // Totals
    const totalPaid = formatted
      .filter((f) => f.status === "Paid")
      .reduce((s, f) => s + f.amount, 0);
    const totalDues = formatted
      .filter((f) => f.status !== "Paid")
      .reduce((s, f) => s + f.amount + f.penalty, 0);
    const totalOverdue = formatted
      .filter((f) => f.status === "Overdue")
      .reduce((s, f) => s + f.amount + f.penalty, 0);

    return NextResponse.json({ fees: formatted, totalPaid, totalDues, totalOverdue });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch student fees" }, { status: 500 });
  }
}
