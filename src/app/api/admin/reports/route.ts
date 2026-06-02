import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

function paymentReportStatus(status?: string | null) {
  if (status === "Approved") return "Paid";
  if (status === "Rejected") return "Rejected";
  if (status === "Pending") return "Pending";
  return "Not Paid";
}

function sameOptionalValue(actual: string | number | null | undefined, selected?: string) {
  if (!selected) return true;
  if (selected === "none") return actual == null || actual === "";
  return String(actual ?? "") === selected;
}

function inDateRange(date: Date, filters: Record<string, string>) {
  const start = filters.startDate ? new Date(filters.startDate) : null;
  const end = filters.endDate ? new Date(filters.endDate) : null;

  if (end) end.setHours(23, 59, 59, 999);

  return (!start || date >= start) && (!end || date <= end);
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

      const currentState = (log as any).currentState as { fileType?: string; filters?: Record<string, string> } | null;
      return {
        id: log.logId,
        date: log.timestamp.toISOString().split("T")[0],
        by: admin?.employeeId ?? log.user.username,
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
        const feeType = studentFee.fee.feeType;
        const name = `${student.firstName} ${student.lastName}`.toLowerCase();
        const studentQuery = String(filters.student ?? "").trim().toLowerCase();
        const latestPayment = studentFee.payments[0];
        const status = paymentReportStatus(latestPayment?.status);
        const paymentStatus = String(filters.paymentStatus ?? "All");
        const reportDate = latestPayment?.paymentDate ?? studentFee.assignedDate;
        const matchesPaymentStatus =
          !paymentStatus ||
          paymentStatus === "All" ||
          (paymentStatus === "Paid" && status === "Paid") ||
          (paymentStatus === "Rejected" && status === "Rejected") ||
          (paymentStatus === "Not Paid" && (status === "Not Paid" || status === "Rejected"));

        return inDateRange(reportDate, filters)
          && sameOptionalValue(student.faculty, filters.faculty)
          && sameOptionalValue(student.level, filters.level)
          && sameOptionalValue(feeType.category, filters.feeCategory)
          && sameOptionalValue(feeType.feeName, filters.feeType)
          && matchesPaymentStatus
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
