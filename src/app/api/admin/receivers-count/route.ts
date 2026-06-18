import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { belongsToVariants, normalizeBelongsTo } from "@/lib/belongs-to";

/**
 * Receivers count for dashboard.
 *
 * Not Paid = totalReceivers - approvedCount
 *
 * totalReceivers is the number of StudentFee rows that exist for fees
 * belonging to the selected office scope (belongsTo) and (optionally)
 * match dashboard filters.
 */
export async function GET(req: NextRequest) {
  try {
    const belongsTo = normalizeBelongsTo(req.nextUrl.searchParams.get("belongsTo"));
    const belongsToFilters = belongsTo ? belongsToVariants(belongsTo) : [];

    const feeType = req.nextUrl.searchParams.get("feeType")?.trim();
    const category = req.nextUrl.searchParams.get("category")?.trim();
    const faculty = req.nextUrl.searchParams.get("faculty")?.trim();
    const level = req.nextUrl.searchParams.get("level")?.trim();

    const studentSearch = req.nextUrl.searchParams.get("studentSearch")?.trim().toLowerCase();

    const studentFeeWhere: any = {
      ...(belongsTo
        ? {
            fee: {
              belongsTo: { in: belongsToFilters },
            },
          }
        : {}),
    };

    // feeType/category filter are based on FeeType related entity
    if (feeType) {
      studentFeeWhere.fee = {
        ...(studentFeeWhere.fee ?? {}),
        feeType: {
          feeName: feeType,
        },
      };
    }

    if (category) {
      studentFeeWhere.fee = {
        ...(studentFeeWhere.fee ?? {}),
        feeType: {
          ...(studentFeeWhere.fee?.feeType ?? {}),
          category: category,
        },
      };
    }

    if (faculty) {
      studentFeeWhere.faculty = faculty;
    }

    if (level && level !== "" && level !== "all") {
      const parsed = Number(level);
      if (Number.isFinite(parsed)) studentFeeWhere.level = parsed;
    }

    if (studentSearch) {
      studentFeeWhere.student = {
        OR: [
          { studentId: { contains: studentSearch, mode: "insensitive" as const } },
          { firstName: { contains: studentSearch, mode: "insensitive" as const } },
          { lastName: { contains: studentSearch, mode: "insensitive" as const } },
        ],
      };
    }

    // Receivers: count of studentFee rows
    // Approved: among those receivers, count latest Payment status Approved.
    const totalReceivers = await prisma.studentFee.count({
      where: studentFeeWhere,
    });

    // Approved count: count distinct studentFeeId whose latest payment is Approved.
    // We do this by fetching only latest payment per studentFeeId via order desc.
    const payments = await prisma.payment.findMany({
      where: {
        studentFee: studentFeeWhere,
      },
      select: {
        studentFeeId: true,
        status: true,
      },
      orderBy: { paymentId: "desc" },
    });

    const latestPerStudentFee = new Set<number>();
    let approvedCount = 0;

    for (const p of payments) {
      if (latestPerStudentFee.has(p.studentFeeId)) continue;
      latestPerStudentFee.add(p.studentFeeId);
      if (p.status === "Approved") approvedCount += 1;
    }

    // If a receiver has no payment row yet, it won't show up above.
    // That is correct: those receivers should be counted as Not Paid.

    return NextResponse.json({
      totalReceivers,
      approvedCount,
      notPaidCount: Math.max(0, totalReceivers - approvedCount),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch receivers count" }, { status: 500 });
  }
}
