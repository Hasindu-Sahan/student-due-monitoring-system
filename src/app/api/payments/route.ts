import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all payments
export async function GET() {
  const payments = await prisma.payment.findMany({
    include: {
      studentFee: {
        include: {
          student: true,
          fee: { include: { feeType: true } },
        },
      },
    },
    orderBy: { paymentDate: "desc" },
  });
  return NextResponse.json(payments);
}

// PATCH to approve/reject
export async function PATCH(req: NextRequest) {
  const { paymentId, status } = await req.json();
  const updated = await prisma.payment.update({
    where: { paymentId },
    data: { status },
  });
  return NextResponse.json(updated);
}