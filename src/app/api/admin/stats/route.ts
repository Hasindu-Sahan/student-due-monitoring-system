import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const studentFees = await prisma.studentFee.findMany({
      include: { fee: true, payments: true },
    });
    const payments = await prisma.payment.findMany({
      orderBy: { paymentId: "desc" },
      select: { studentFeeId: true, amountPaid: true, status: true },
    });
    const latestPayments = Array.from(
      payments.reduce((latest, payment) => {
        if (!latest.has(payment.studentFeeId)) latest.set(payment.studentFeeId, payment);
        return latest;
      }, new Map<number, (typeof payments)[number]>()).values(),
    );

    let totalRemainingDues = 0;
    let totalOverdue = 0;

    for (const sf of studentFees) {
      const amount = Number(sf.fee.amount) + Number(sf.penaltyAmount);
      const latestPayment = [...sf.payments].sort((a, b) => b.paymentId - a.paymentId)[0];
      const isApproved = latestPayment?.status === "Approved";
      const isPendingApproval = latestPayment?.status === "Pending";

      if (!isApproved && !isPendingApproval) totalRemainingDues += amount;
      if (!isApproved && sf.fee.dueDate && sf.fee.dueDate < new Date()) totalOverdue += amount;
    }

    const approved = latestPayments.filter((payment) => payment.status === "Approved").length;
    const pending = latestPayments.filter((payment) => payment.status === "Pending").length;
    const rejected = latestPayments.filter((payment) => payment.status === "Rejected").length;
    const totalPendingDues = latestPayments.reduce(
      (sum, payment) => (payment.status === "Pending" ? sum + Number(payment.amountPaid) : sum),
      0,
    );
    const totalPaid = latestPayments.reduce(
      (sum, payment) => (payment.status === "Approved" ? sum + Number(payment.amountPaid) : sum),
      0,
    );
    const activeStudents = await prisma.student.count({
      where: { enrollmentStatus: { equals: "Active", mode: "insensitive" } },
    });
    const totalStudents = await prisma.student.count();
    const paidFees = studentFees.filter((sf) => sf.status === "Paid").length;
    const paymentRate = studentFees.length > 0 ? Math.round((paidFees / studentFees.length) * 1000) / 10 : 0;

    return NextResponse.json({
      totalPaid,
      totalDues: totalRemainingDues,
      totalRemainingDues,
      totalPendingDues,
      totalOverdue,
      approved,
      pending,
      rejected,
      activeStudents,
      totalStudents,
      paymentRate,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
