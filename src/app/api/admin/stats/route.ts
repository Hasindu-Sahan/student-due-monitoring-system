import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { belongsToVariants, normalizeBelongsTo } from "@/lib/belongs-to";

export async function GET(req: NextRequest) {
  try {
    const belongsTo = normalizeBelongsTo(req.nextUrl.searchParams.get("belongsTo"));
    const belongsToFilters = belongsTo ? belongsToVariants(belongsTo) : [];
    const paymentWhere = belongsTo
      ? {
          studentFee: {
            fee: {
              belongsTo: { in: belongsToFilters },
            },
          },
        }
      : undefined;
    const payments = await prisma.payment.findMany({
      where: paymentWhere,
      orderBy: { paymentId: "desc" },
      include: {
        studentFee: {
          include: {
            student: true,
            fee: { include: { feeType: true } },
          },
        },
      },
    }).catch((error) => {
      console.error("admin stats payment query failed", error);
      return [];
    });
    const latestPayments = Array.from(
      payments.reduce((latest, payment) => {
        if (!latest.has(payment.studentFeeId)) latest.set(payment.studentFeeId, payment);
        return latest;
      }, new Map<number, (typeof payments)[number]>()).values(),
    );

    const approved = latestPayments.filter((payment) => payment.status === "Approved").length;
    const pending = latestPayments.filter((payment) => payment.status === "Pending").length;
    const rejected = latestPayments.filter((payment) => payment.status === "Rejected").length;
    const totalPaid = latestPayments.reduce(
      (sum, payment) => (payment.status === "Approved" ? sum + Number(payment.amountPaid) : sum),
      0,
    );
    const latestPaymentRows = latestPayments
      .filter((payment) => Boolean(payment.studentFee?.student) && Boolean(payment.studentFee?.fee?.feeType))
      .map((payment) => ({
        paymentId: payment.paymentId,
        date: payment.paymentDate.toISOString().split("T")[0],
        sid: payment.studentFee.student.studentId,
        name: `${payment.studentFee.student.firstName} ${payment.studentFee.student.lastName}`,
        feeType: payment.studentFee.fee.feeType.feeName,
        category: payment.studentFee.fee.feeType.category ?? "",
        faculty: payment.studentFee.student.faculty ?? "",
        level: payment.studentFee.student.level ?? null,
        amount: Number(payment.amountPaid),
        status: payment.status ?? "Pending",
        bankSlipUrl: payment.bankSlipUrl ?? null,
      }));

    return NextResponse.json({
      totalPaid,
      totalNotPaid: latestPayments.filter((payment) => payment.status !== "Approved").length,
      approved,
      pending,
      rejected,
      latestPayments: latestPaymentRows,
      latestFeeAssignments: [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
