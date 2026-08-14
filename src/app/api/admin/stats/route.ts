import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { belongsToVariants, normalizeBelongsTo } from "@/lib/belongs-to";

async function resolveAdminUserId(input?: { userId?: unknown; username?: unknown; profileId?: unknown }) {
  const userId = Number(input?.userId);
  if (Number.isInteger(userId) && userId > 0) {
    const user = await prisma.user.findUnique({
      where: { userId },
      include: { admin: true },
    });
    if (user?.admin) return user.userId;
  }

  const username = String(input?.username ?? input?.profileId ?? "").trim();
  if (!username) return null;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email: username }],
    },
    include: { admin: true },
  });

  if (user?.admin) return user.userId;

  const admin = await prisma.admin.findFirst({
    where: {
      OR: [
        { employeeId: username },
        { user: { username } },
        { user: { email: username } },
      ],
    },
    include: { user: true },
  });

  return admin?.userId ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const belongsTo = normalizeBelongsTo(req.nextUrl.searchParams.get("belongsTo"));
    const belongsToFilters = belongsTo ? belongsToVariants(belongsTo) : [];
    const resolvedUserId = await resolveAdminUserId({
      userId: req.nextUrl.searchParams.get("userId"),
      username: req.nextUrl.searchParams.get("username"),
      profileId: req.nextUrl.searchParams.get("profileId"),
    });

    const adminFeeLogs = resolvedUserId
      ? await prisma.auditLog.findMany({
        where: {
          userId: resolvedUserId,
          tableName: "fees",
        },
        orderBy: { timestamp: "desc" },
      })
      : [];
    const adminFeeIds = Array.from(
      new Set(
        adminFeeLogs
          .map((log) => Number((log as any).recordId ?? (log as any).currentState?.feeId))
          .filter((feeId) => Number.isInteger(feeId) && feeId > 0),
      ),
    );

    const studentFeesWhere = {
      AND: [
        ...(belongsTo ? [{ fee: { belongsTo: { in: belongsToFilters } } }] : []),
        ...(adminFeeIds.length > 0 ? [{ feeId: { in: adminFeeIds } }] : []),
      ],
    };
    const studentFees = await prisma.studentFee.findMany({
      where: studentFeesWhere,
      include: { fee: true, payments: true },
    });
    const paymentWhere = {
      AND: [
        ...(belongsTo
          ? [
              {
                studentFee: {
                  fee: {
                    belongsTo: { in: belongsToFilters },
                  },
                },
              },
            ]
          : []),
        ...(adminFeeIds.length > 0
          ? [
              {
                studentFee: {
                  feeId: { in: adminFeeIds },
                },
              },
            ]
          : []),
      ],
    };
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
    const latestPaymentRows = latestPayments.map((payment) => ({
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

    const latestFeeRows = adminFeeLogs
      .filter((log) => log.action === "Created fee")
      .map((log) => {
        const state = (log.currentState ?? {}) as any;
        const filters = state.receiverFilters ?? {};
        const receivers = Array.isArray(filters.batchAssignments)
          ? filters.batchAssignments.map((item: any) => item.studentId).join(", ")
          : filters.studentId
            ? String(filters.studentId)
            : filters.faculty
              ? `${filters.faculty}${filters.level && filters.level !== "all" ? ` / Level ${filters.level}` : ""}`
              : "All receivers";
        return {
          paymentId: log.logId,
          date: log.timestamp.toISOString().split("T")[0],
          sid: String(receivers),
          name: String(state.feeName ?? "New fee"),
          feeType: String(state.feeName ?? "New fee"),
          category: String(state.category ?? ""),
          dueDate: String(state.dueDate ?? ""),
          receivers,
          amount: Number(state.amount ?? 0),
          status: "Assigned",
        };
      });

    return NextResponse.json({
      totalPaid,
      totalNotPaid: latestPayments.filter((payment) => payment.status !== "Approved").length,
      approved,
      pending,
      rejected,
      latestPayments: latestPaymentRows,
      latestFeeAssignments: latestFeeRows,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
