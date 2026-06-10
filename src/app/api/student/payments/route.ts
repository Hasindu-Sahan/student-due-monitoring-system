import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const uploadDir = path.join(process.cwd(), "public", "uploads", "payment-slips");
const allowedSlipTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maxSlipSize = 10 * 1024 * 1024;

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type");
    let studentFeeId: number;
    let amountPaid: number;
    let bankSlipUrl: string | null = null;

    if (contentType?.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await req.formData();
      const file = formData.get("slip") as File;
      studentFeeId = Number(formData.get("studentFeeId"));
      amountPaid = Number(formData.get("amountPaid"));

      if (!file || file.size === 0) {
        return NextResponse.json({ error: "Payment slip is required" }, { status: 400 });
      }

      if (file) {
        if (!allowedSlipTypes.has(file.type)) {
          return NextResponse.json({ error: "Only PDF, JPG, and PNG slips are allowed" }, { status: 400 });
        }

        if (file.size > maxSlipSize) {
          return NextResponse.json({ error: "Slip file must be 10MB or smaller" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `${Date.now()}-${safeFileName(file.name)}`;

        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, fileName), buffer);

        bankSlipUrl = `/uploads/payment-slips/${fileName}`;
      }
    } else {
      // Handle JSON request (backwards compatibility)
      const body = await req.json();
      studentFeeId = body.studentFeeId;
      amountPaid = body.amountPaid;
      bankSlipUrl = body.bankSlipUrl ?? null;
    }

    if (!studentFeeId || Number.isNaN(studentFeeId) || !amountPaid || Number.isNaN(amountPaid) || amountPaid <= 0) {
      return NextResponse.json({ error: "Valid fee and amount are required" }, { status: 400 });
    }

    const existingPayment = await prisma.payment.findFirst({
      where: { studentFeeId },
      orderBy: { paymentId: "desc" },
    });
    const paymentData = {
      amountPaid,
      paymentDate: new Date(),
      bankSlipUrl,
      status: "Pending" as const,
      transactionRef: `TXN-${Date.now()}`,
      verifiedBy: null,
      remarks: null,
    };

    const payment = existingPayment
      ? await prisma.payment.update({
          where: { paymentId: existingPayment.paymentId },
          data: paymentData,
        })
      : await prisma.payment.create({
          data: {
            studentFeeId,
            ...paymentData,
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
