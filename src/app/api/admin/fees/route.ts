import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

function formatFee(fee: any) {
  return {
    feeId: fee.feeId,
    type: fee.feeType.feeName,
    feeTypeId: fee.feeTypeId,
    category: fee.feeType.category ?? "",
    amount: Number(fee.amount),
    due: fee.dueDate?.toISOString().split("T")[0] ?? "",
  };
}

function buildStudentWhere(filters: {
  faculty?: string;
  level?: string;
  studentSearch?: string;
}) {
  const where: Record<string, unknown> = {};
  if (filters.faculty && filters.faculty !== "none") where.faculty = filters.faculty;
  if (filters.level && filters.level !== "none") where.level = Number(filters.level);
  if (filters.studentSearch) {
    where.OR = [
      { studentId: { contains: filters.studentSearch, mode: "insensitive" } },
      { firstName: { contains: filters.studentSearch, mode: "insensitive" } },
      { lastName: { contains: filters.studentSearch, mode: "insensitive" } },
      { email: { contains: filters.studentSearch, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function GET() {
  try {
    const fees = await prisma.fee.findMany({
      include: { feeType: true },
      orderBy: { feeId: "desc" },
    });

    const formatted = fees.map(formatFee);

    return NextResponse.json(formatted);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch fees" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { feeName, category, description, amount, dueDate, receiverFilters, userId } = await req.json();

    if (!feeName || !category || !description || amount == null || Number.isNaN(Number(amount))) {
      return NextResponse.json({ error: "Fee type, category, description, and amount are required" }, { status: 400 });
    }

    let feeType = await prisma.feeType.findFirst({ where: { feeName } });
    if (!feeType) {
      feeType = await prisma.feeType.create({ data: { feeName, category, description } });
    } else {
      feeType = await prisma.feeType.update({
        where: { feeTypeId: feeType.feeTypeId },
        data: { category, description },
      });
    }

    const fee = await prisma.fee.create({
      data: {
        feeTypeId: feeType.feeTypeId,
        amount: Number(amount),
        dueDate: dueDate ? new Date(dueDate) : new Date(0),
      },
      include: { feeType: true },
    });

    const filters = receiverFilters ?? {};
    const hasReceiverFilter = Boolean(filters.faculty || filters.level || filters.studentSearch);
    let assignedCount = 0;

    if (hasReceiverFilter) {
      const students = await prisma.student.findMany({
        where: buildStudentWhere(filters),
        select: { studentId: true },
      });
      assignedCount = students.length;

      if (students.length > 0) {
        await prisma.studentFee.createMany({
          data: students.map((student) => ({
            studentId: student.studentId,
            feeId: fee.feeId,
            status: "Pending",
            assignedDate: new Date(),
            isMandatory: true,
          })),
          skipDuplicates: true,
        });
      }
    }

    await writeAuditLog({
      userId,
      action: "Created fee",
      tableName: "fees",
      recordId: fee.feeId,
      currentState: { ...formatFee(fee), assignedCount, receiverFilters: filters },
    });

    return NextResponse.json({ ...formatFee(fee), assignedCount }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create fee" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { feeId, amount, dueDate, category, description, receiverFilters, userId } = await req.json();
    const previous = await prisma.fee.findUnique({
      where: { feeId },
      include: { feeType: true, studentFees: true },
    });

    if (!previous) {
      return NextResponse.json({ error: "Fee not found" }, { status: 404 });
    }

    const fee = await prisma.fee.update({
      where: { feeId },
      data: {
        amount: Number(amount),
        dueDate: dueDate ? new Date(dueDate) : new Date(0),
        feeType: { update: { category, ...(description !== undefined ? { description } : {}) } },
      },
      include: { feeType: true },
    });

    const filters = receiverFilters ?? {};
    const hasReceiverFilter = Boolean(filters.faculty || filters.level || filters.studentSearch);
    let assignedCount = previous.studentFees.length;

    if (hasReceiverFilter) {
      const students = await prisma.student.findMany({
        where: buildStudentWhere(filters),
        select: { studentId: true },
      });
      assignedCount = students.length;

      await prisma.studentFee.deleteMany({ where: { feeId } });
      if (students.length > 0) {
        await prisma.studentFee.createMany({
          data: students.map((student) => ({
            studentId: student.studentId,
            feeId,
            status: "Pending",
            assignedDate: new Date(),
            isMandatory: true,
          })),
        });
      }
    }

    await writeAuditLog({
      userId,
      action: "Updated fee",
      tableName: "fees",
      recordId: fee.feeId,
      previousState: { ...formatFee(previous), assignedCount: previous.studentFees.length },
      currentState: { ...formatFee(fee), assignedCount, receiverFilters: filters },
    });

    return NextResponse.json({ ...formatFee(fee), assignedCount });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update fee" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { feeId, userId } = await req.json();
    const previous = await prisma.fee.findUnique({
      where: { feeId },
      include: { feeType: true },
    });
    await prisma.fee.delete({ where: { feeId } });
    await writeAuditLog({
      userId,
      action: "Deleted fee",
      tableName: "fees",
      recordId: feeId,
      previousState: previous ? formatFee(previous) : null,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete fee" }, { status: 500 });
  }
}
