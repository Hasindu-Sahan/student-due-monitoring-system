import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { belongsToVariants, normalizeBelongsTo } from "@/lib/belongs-to";

export async function GET(req: NextRequest) {
  try {
    const belongsTo = normalizeBelongsTo(req.nextUrl.searchParams.get("belongsTo"));
    const belongsToFilters = belongsTo ? belongsToVariants(belongsTo) : [];

    const payments = await prisma.payment.findMany({
      where: belongsTo
        ? {
            studentFee: {
              fee: {
                // fee.belongsTo is the scope discriminator.
                belongsTo: { in: belongsToFilters },
              },
            },
          }
        : undefined,
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
      // Used by Admin Payments filtering UI
      feeType: p.studentFee.fee.feeType.feeName,
      category: p.studentFee.fee.feeType.category ?? "",
      belongsTo: p.studentFee.fee.belongsTo ?? "",
      faculty: p.studentFee.student.faculty ?? "",
      level: p.studentFee.student.level ?? null,
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

      const nextStudentFeeStatus = status === "Approved" ? "Paid" : fallbackStatus;

      // Update student fee status based on payment verification result.
      await prisma.studentFee.update({
        where: { studentFeeId: previous.studentFeeId },
        data: { status: nextStudentFeeStatus },
      });

      // Create a student notification on admin approve/reject.
      await prisma.notification.create({
        data: {
          studentId: previous.studentFee.studentId,
          notificationType: "PaymentStatus",
          status: "Unread",
          message:
            status === "Approved"
              ? `Your payment has been approved for the assigned fee. You can now view it in your payments.`
              : `Your payment has been rejected. Please check and submit again if required.`,
        },
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

