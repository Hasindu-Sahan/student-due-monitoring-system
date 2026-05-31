import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const studentFees = await prisma.studentFee.findMany({
      include: { fee: true, payments: true },
    });

    let totalPaid = 0;
    let totalDues = 0;
    let totalOverdue = 0;

    for (const sf of studentFees) {
      const amount = Number(sf.fee.amount) + Number(sf.penaltyAmount);
      if (sf.status === "Paid") totalPaid += amount;
      else if (sf.status === "Pending") totalDues += amount;
      else if (sf.status === "Overdue") totalOverdue += amount;
    }

    const approved = await prisma.payment.count({ where: { status: "Approved" } });
    const pending = await prisma.payment.count({ where: { status: "Pending" } });
    const rejected = await prisma.payment.count({ where: { status: "Rejected" } });
    const activeStudents = await prisma.student.count({
      where: { enrollmentStatus: { equals: "Active", mode: "insensitive" } },
    });
    const totalStudents = await prisma.student.count();
    const paidFees = studentFees.filter((sf) => sf.status === "Paid").length;
    const paymentRate = studentFees.length > 0 ? Math.round((paidFees / studentFees.length) * 1000) / 10 : 0;

    return NextResponse.json({
      totalPaid,
      totalDues,
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
