import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

function todayDateOnly() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDueDate(value: string) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function formatFee(fee: any) {
  return {
    feeId: fee.feeId,
    type: fee.feeType.feeName,
    feeTypeId: fee.feeTypeId,
    category: fee.feeType.category ?? "",
    amount: Number(fee.amount),
    due: fee.dueDate?.toISOString().split("T")[0] ?? "",
    assignedCount: fee._count?.studentFees ?? fee.studentFees?.length ?? 0,
  };
}

function buildStudentWhere(filters: {
  faculty?: string;
  level?: string;
  studentId?: string;
  studentSearch?: string;
}) {
  const where: Record<string, unknown> = {};
  if (filters.studentId) where.studentId = filters.studentId;
  if (filters.faculty && !["none", "all"].includes(filters.faculty)) where.faculty = filters.faculty;
  if (filters.level && !["none", "all"].includes(filters.level)) where.level = Number(filters.level);
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
      include: { feeType: true, _count: { select: { studentFees: true } } },
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

    if (!feeName || !category || !dueDate || amount == null || Number.isNaN(Number(amount))) {
      return NextResponse.json({ error: "Fee type, category, due date, and amount are required" }, { status: 400 });
    }

    if (Number(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be a valid positive number" }, { status: 400 });
    }

    const parsedDueDate = parseDueDate(dueDate);
    if (!parsedDueDate) {
      return NextResponse.json({ error: "Due date is invalid" }, { status: 400 });
    }

    if (parsedDueDate < todayDateOnly()) {
      return NextResponse.json({ error: "Due date cannot be a previous day" }, { status: 400 });
    }

    const filters = receiverFilters ?? {};
    const hasReceiverFilter = Boolean(filters.faculty || filters.level || filters.studentId || filters.studentSearch);

    if (!hasReceiverFilter) {
      return NextResponse.json({ error: "Choose at least one receiver" }, { status: 400 });
    }

    const students = await prisma.student.findMany({
      where: buildStudentWhere(filters),
      select: { studentId: true },
    });

    if (students.length === 0) {
      return NextResponse.json({ error: "No matching receivers found" }, { status: 400 });
    }

    let feeType = await prisma.feeType.findFirst({ where: { feeName } });
    if (!feeType) {
      feeType = await prisma.feeType.create({ data: { feeName, category, description: description || null } });
    } else {
      feeType = await prisma.feeType.update({
        where: { feeTypeId: feeType.feeTypeId },
        data: { category, description: description || null },
      });
    }

    const fee = await prisma.fee.create({
      data: {
        feeTypeId: feeType.feeTypeId,
        amount: Number(amount),
        dueDate: parsedDueDate,
      },
      include: { feeType: true },
    });

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

    const assignedCount = students.length;

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

    if (!feeId || !category || !dueDate || amount == null || Number.isNaN(Number(amount))) {
      return NextResponse.json({ error: "Category, due date, and amount are required" }, { status: 400 });
    }

    if (Number(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be a valid positive number" }, { status: 400 });
    }

    const parsedDueDate = parseDueDate(dueDate);
    if (!parsedDueDate) {
      return NextResponse.json({ error: "Due date is invalid" }, { status: 400 });
    }

    if (parsedDueDate < todayDateOnly()) {
      return NextResponse.json({ error: "Due date cannot be a previous day" }, { status: 400 });
    }

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
        dueDate: parsedDueDate,
        feeType: { update: { category, ...(description !== undefined ? { description } : {}) } },
      },
      include: { feeType: true },
    });

    const filters = receiverFilters ?? {};
    const hasReceiverFilter = Boolean(filters.faculty || filters.level || filters.studentId || filters.studentSearch);
    let assignedCount = previous.studentFees.length;

    if (hasReceiverFilter) {
      const students = await prisma.student.findMany({
        where: buildStudentWhere(filters),
        select: { studentId: true },
      });
      assignedCount = students.length;

      if (students.length === 0) {
        return NextResponse.json({ error: "No matching receivers found" }, { status: 400 });
      }

      await prisma.studentFee.deleteMany({ where: { feeId } });
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
