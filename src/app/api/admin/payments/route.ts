import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        studentFee: {
          include: {
            student: true,
            fee: { include: { feeType: true } },
          },
        },
      },
      orderBy: { paymentId: "desc" },
    });
    const latestPayments = Array.from(
      payments.reduce((latest, payment) => {
        if (!latest.has(payment.studentFeeId)) latest.set(payment.studentFeeId, payment);
        return latest;
      }, new Map<number, (typeof payments)[number]>()).values(),
    );

    const formatted = latestPayments.map((p) => ({
      paymentId: p.paymentId,
      date: p.paymentDate.toISOString().split("T")[0],
      sid: p.studentFee.student.studentId,
      name: `${p.studentFee.student.firstName} ${p.studentFee.student.lastName}`,
      type: p.studentFee.fee.feeType.feeName,
      amount: Number(p.amountPaid),
      status: p.status ?? "Pending",
      bankSlipUrl: p.bankSlipUrl ?? null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { paymentId, status, userId } = await req.json();
    const previous = await prisma.payment.findUnique({
      where: { paymentId },
      include: { studentFee: true },
    });
    const updated = await prisma.payment.update({
      where: { paymentId },
      data: { status, verifiedBy: userId ?? undefined },
    });

    if (previous?.studentFee) {
      const dueDate = previous.studentFee.feeId
        ? await prisma.fee.findUnique({
            where: { feeId: previous.studentFee.feeId },
            select: { dueDate: true },
          })
        : null;
      const fallbackStatus = dueDate?.dueDate && dueDate.dueDate < new Date() ? "Overdue" : "Pending";

      await prisma.studentFee.update({
        where: { studentFeeId: previous.studentFeeId },
        data: { status: status === "Approved" ? "Paid" : fallbackStatus },
      });
    }

    await writeAuditLog({
      userId,
      action: "Updated payment status",
      tableName: "payments",
      recordId: paymentId,
      previousState: previous,
      currentState: updated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}
