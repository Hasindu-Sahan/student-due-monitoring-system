import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

function buildPaymentWhere(filters: Record<string, string>) {
  const where: Record<string, unknown> = {};

  if (filters.startDate || filters.endDate) {
    where.paymentDate = {
      ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
      ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
    };
  }

  if (filters.faculty) {
    where.studentFee = { student: { faculty: filters.faculty } };
  }

  if (filters.level) {
    const level = Number(filters.level);
    if (!Number.isNaN(level)) {
      where.studentFee = {
        ...(typeof where.studentFee === "object" && where.studentFee ? (where.studentFee as Record<string, unknown>) : {}),
        student: {
          ...(typeof (where.studentFee as any)?.student === "object" && (where.studentFee as any)?.student ? (where.studentFee as any).student : {}),
          level,
        },
      };
    }
  }

  return where;
}

function filterLabel(filters: Record<string, string>, fileType?: string) {
  const parts = Object.entries(filters)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`);
  return `${fileType ? `${fileType.toUpperCase()} report` : "Report"}${parts.length ? ` (${parts.join(", ")})` : ""}`;
}

export async function GET() {
  try {
  const [feeTypes, feeCategories, students, reportLogs] = await Promise.all([
      prisma.feeType.findMany({
        select: { feeName: true },
        orderBy: { feeName: "asc" },
      }),
      prisma.feeType.findMany({
        select: { category: true },
      }),
      prisma.student.findMany({
        select: { faculty: true, academicYear: true },
        orderBy: { studentId: "asc" },
      }),
      prisma.auditLog.findMany({
        where: { tableName: "reports" },
        include: { user: { include: { admin: true } } },
        orderBy: { timestamp: "desc" },
        take: 20,
      }),
    ]);

    const faculties = Array.from(
      new Set(students.map((student) => student.faculty).filter(Boolean) as string[])
    ).sort();

    const feeCategoryList = Array.from(
      new Set(feeCategories.map((ft) => ft.category).filter(Boolean) as string[])
    ).sort();

    const reports = reportLogs.map((log) => {
      const admin = log.user.admin;
      const generatedBy = admin
        ? `${admin.firstName} ${admin.lastName}`
        : log.user.username;

      const currentState = (log as any).currentState as { fileType?: string } | null;
      return {
        id: log.logId,
        date: log.timestamp.toISOString().split("T")[0],
        by: generatedBy,
        filter: log.action ?? "Report generated",
        fileType: currentState?.fileType ?? "report",
      };
    });

    return NextResponse.json({
      feeTypes: feeTypes.map((feeType) => feeType.feeName),
      feeCategories: feeCategoryList,
      faculties,
      reports,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch reports data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { filters = {}, fileType = "pdf", userId } = await req.json();

    const payments = await prisma.payment.findMany({
      where: buildPaymentWhere(filters),
      include: {
        studentFee: {
          include: {
            student: true,
            fee: { include: { feeType: true } },
          },
        },
      },
      orderBy: { paymentDate: "desc" },
      take: 500,
    });

    const rows = payments
      .filter((payment) => {
        const student = payment.studentFee.student;
        const fee = payment.studentFee.fee;
        const name = `${student.firstName} ${student.lastName}`.toLowerCase();
        const studentQuery = String(filters.student ?? "").toLowerCase();
        return (!filters.feeCategory ||
          (filters.feeCategory === "none"
            ? !fee.feeType.category
            : (fee.feeType.category ?? "") === filters.feeCategory))
          && (!filters.feeType || fee.feeType.feeName === filters.feeType)
          && (!studentQuery || student.studentId.toLowerCase().includes(studentQuery) || name.includes(studentQuery));
      })
      .map((payment) => ({
        date: payment.paymentDate.toISOString().split("T")[0],
        studentId: payment.studentFee.student.studentId,
        studentName: `${payment.studentFee.student.firstName} ${payment.studentFee.student.lastName}`,
        faculty: payment.studentFee.student.faculty ?? "",
        feeType: payment.studentFee.fee.feeType.feeName,
        amount: Number(payment.amountPaid),
        status: payment.status ?? "Pending",
      }));

    const action = filterLabel(filters, fileType);
    await writeAuditLog({
      userId,
      action,
      tableName: "reports",
      currentState: { filters, fileType, rowCount: rows.length },
    });

    return NextResponse.json({ rows, fileType, filter: action });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
