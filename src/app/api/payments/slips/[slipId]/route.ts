import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ slipId: string }> }) {
  const { slipId } = await params;
  const parsedSlipId = BigInt(slipId);
  const slip = await prisma.paymentSlip.findUnique({
    where: { slipId: parsedSlipId },
    select: { fileData: true, mimeType: true, originalFileName: true },
  });

  if (!slip?.fileData) {
    return NextResponse.json({ error: "Payment slip not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(slip.fileData), {
    headers: {
      "Content-Type": slip.mimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${(slip.originalFileName ?? "payment-slip").replace(/["\\\r\n]/g, "_")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}