import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { buildBankSlipObjectPath, createSignedBankSlipUrl, uploadBankSlip } from "@/lib/supabase-storage";
const allowedSlipTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maxSlipSize = 10 * 1024 * 1024;

async function readPortalUserId() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("portalUser")?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { userId?: number };
    return Number.isInteger(parsed.userId) ? parsed.userId ?? null : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type");
    let studentFeeId: number;
    let amountPaid: number;
    let file: File | null = null;
    let isMultipart = false;

    if (contentType?.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await req.formData();
      file = formData.get("slip") as File;
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
      }
    } else {
      const body = await req.json();
      studentFeeId = body.studentFeeId;
      amountPaid = body.amountPaid;
    }

    if (!studentFeeId || Number.isNaN(studentFeeId) || !amountPaid || Number.isNaN(amountPaid) || amountPaid <= 0) {
      return NextResponse.json({ error: "Valid fee and amount are required" }, { status: 400 });
    }

    const existingPayment = await prisma.payment.findFirst({
      where: { studentFeeId },
      orderBy: { paymentId: "desc" },
    });

    const payment = existingPayment
      ? existingPayment
      : await prisma.payment.create({
          data: {
            studentFeeId,
            amountPaid,
            paymentDate: new Date(),
            status: "Pending",
            transactionRef: `TXN-${Date.now()}`,
            verifiedBy: null,
            remarks: null,
          },
        });

    let bankSlipUrl: string | null = null;
    if (isMultipart) {
      if (!file) {
        return NextResponse.json({ error: "Payment slip is required" }, { status: 400 });
      }
      const objectPath = buildBankSlipObjectPath(payment.paymentId, file.name);
      await uploadBankSlip(objectPath, await file.arrayBuffer(), file.type);
      bankSlipUrl = await createSignedBankSlipUrl(objectPath);
    } else {
      bankSlipUrl = null;
    }

    const updatedPayment = await prisma.payment.update({
      where: { paymentId: payment.paymentId },
      data: {
        amountPaid,
        paymentDate: new Date(),
        status: "Pending",
        bankSlipUrl,
        transactionRef: payment.transactionRef ?? `TXN-${Date.now()}`,
        verifiedBy: null,
        remarks: null,
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

    return NextResponse.json(updatedPayment, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to submit payment" }, { status: 500 });
  }
}
