import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

function buildStudentFeeWhere(filters: Record<string, string>) {
  const where: Record<string, unknown> = {};

  if (filters.startDate || filters.endDate) {
    where.assignedDate = {
      ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
      ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
    };
  }

  if (filters.faculty) {
    where.student = { faculty: filters.faculty === "none" ? null : filters.faculty };
  }

  if (filters.level) {
    const level = Number(filters.level);
    if (!Number.isNaN(level)) {
      where.student = {
        ...(typeof where.student === "object" && where.student ? (where.student as Record<string, unknown>) : {}),
        level,
      };
    }
  }

  if (filters.feeCategory) {
    where.fee = { feeType: { category: filters.feeCategory === "none" ? null : filters.feeCategory } };
  }

  if (filters.feeType) {
    where.fee = {
      ...(typeof where.fee === "object" && where.fee ? (where.fee as Record<string, unknown>) : {}),
      feeType: {
        ...(typeof (where.fee as any)?.feeType === "object" && (where.fee as any)?.feeType ? (where.fee as any).feeType : {}),
        feeName: filters.feeType,
      },
    };
  }

  return where;
}

function paymentReportStatus(status?: string | null) {
  if (status === "Approved") return "Paid";
  if (status === "Rejected") return "Rejected";
  if (status === "Pending") return "Pending";
  return "Not Paid";
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
        select: { faculty: true, level: true },
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

      const currentState = (log as any).currentState as { fileType?: string; filters?: Record<string, string> } | null;
      return {
        id: log.logId,
        date: log.timestamp.toISOString().split("T")[0],
        by: admin?.employeeId ?? generatedBy,
        filter: log.action ?? "Report generated",
        fileType: currentState?.fileType ?? "report",
        filters: currentState?.filters ?? {},
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

    const studentFees = await prisma.studentFee.findMany({
      where: buildStudentFeeWhere(filters),
      include: {
        student: true,
        fee: { include: { feeType: true } },
        payments: { orderBy: { paymentId: "desc" }, take: 1 },
      },
      orderBy: { assignedDate: "desc" },
      take: 500,
    });

    const rows = studentFees
      .filter((studentFee) => {
        const student = studentFee.student;
        const name = `${student.firstName} ${student.lastName}`.toLowerCase();
        const studentQuery = String(filters.student ?? "").toLowerCase();
        const latestPayment = studentFee.payments[0];
        const status = paymentReportStatus(latestPayment?.status);
        const paymentStatus = String(filters.paymentStatus ?? "All");
        const matchesPaymentStatus =
          !paymentStatus ||
          paymentStatus === "All" ||
          (paymentStatus === "Paid" && status === "Paid") ||
          (paymentStatus === "Rejected" && status === "Rejected") ||
          (paymentStatus === "Not Paid" && (status === "Not Paid" || status === "Rejected"));

        return matchesPaymentStatus
          && (!studentQuery || student.studentId.toLowerCase().includes(studentQuery) || name.includes(studentQuery));
      })
      .map((studentFee) => ({
        date: (studentFee.payments[0]?.paymentDate ?? studentFee.assignedDate).toISOString().split("T")[0],
        studentId: studentFee.student.studentId,
        studentName: `${studentFee.student.firstName} ${studentFee.student.lastName}`,
        faculty: studentFee.student.faculty ?? "",
        feeType: studentFee.fee.feeType.feeName,
        amount: Number(studentFee.payments[0]?.amountPaid ?? studentFee.fee.amount) + Number(studentFee.penaltyAmount),
        status: paymentReportStatus(studentFee.payments[0]?.status),
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
