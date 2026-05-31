import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { studentFeeId, amountPaid, bankSlipUrl } = await req.json();

    const payment = await prisma.payment.create({
      data: {
        studentFeeId,
        amountPaid,
        paymentDate: new Date(),
        bankSlipUrl: bankSlipUrl ?? null,
        status: "Pending",
        transactionRef: `TXN-${Date.now()}`,
      },
    });

    const studentFee = await prisma.studentFee.update({
      where: { studentFeeId },
      data: { status: "Pending" },
      include: {
        student: true,
        fee: { include: { feeType: true } },
      },
    });

    await prisma.notification.create({
      data: {
        studentId: studentFee.studentId,
        notificationType: "Payment",
        message: `${studentFee.student.firstName} ${studentFee.student.lastName} submitted a payment for ${studentFee.fee.feeType.feeName}.`,
        status: "Unread",
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to submit payment" }, { status: 500 });
  }
}
