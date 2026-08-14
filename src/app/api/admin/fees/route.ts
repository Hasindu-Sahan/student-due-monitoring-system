import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { resolvePaymentOwner } from "@/lib/belongs-to";

const BELONGS_TO_OPTIONS = ["Welfare", "FAS_Office", "FBSF_Office", "FOT_Office", "SPECIFIC_STUDENT"];


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
    description: fee.feeType.description ?? "",
    belongsTo: fee.belongsTo ?? "",
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
  // Support "all" meaning: do not filter by level.
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

function normalizeBatchAssignments(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      studentId: typeof item?.studentId === "string" ? item.studentId.trim() : "",
      amount: Number(item?.amount),
    }))
    .filter((item) => item.studentId && Number.isFinite(item.amount) && item.amount > 0);
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
    const { feeName, category, description, belongsTo, amount, dueDate, receiverType, receiverFilters, userId } = await req.json();
    const resolvedBelongsTo = resolvePaymentOwner(belongsTo);
    const normalizedReceiverType = receiverType === "batch_upload" ? "batch_upload" : receiverType === "specific_student" ? "specific_student" : "faculty";
    const batchAssignments = normalizeBatchAssignments(receiverFilters?.batchAssignments);

    if (!feeName || !category || !resolvedBelongsTo || !dueDate || (normalizedReceiverType !== "batch_upload" && (amount == null || Number.isNaN(Number(amount))))) {
      return NextResponse.json({ error: "Fee type, category, belongs to, due date, and amount are required" }, { status: 400 });
    }

    if (normalizedReceiverType === "specific_student") {
      if (!receiverFilters?.studentId || typeof receiverFilters.studentId !== "string" || !receiverFilters.studentId.trim()) {
        return NextResponse.json({ error: "receiverFilters.studentId is required for specific student" }, { status: 400 });
      }
    } else if (normalizedReceiverType === "batch_upload") {
      if (batchAssignments.length === 0) {
        return NextResponse.json({ error: "Valid batch assignments are required for batch upload" }, { status: 400 });
      }
    } else {
      if (!BELONGS_TO_OPTIONS.includes(resolvedBelongsTo)) {
        return NextResponse.json({ error: "Belongs To value is invalid" }, { status: 400 });
      }
    }

    const parsedDueDate = parseDueDate(dueDate);
    if (!parsedDueDate) {
      return NextResponse.json({ error: "Due date is invalid" }, { status: 400 });
    }

    if (parsedDueDate < todayDateOnly()) {
      return NextResponse.json({ error: "Due date cannot be a previous day" }, { status: 400 });
    }

    const filters = receiverFilters ?? {};
    const hasReceiverFilter = Boolean(filters.faculty || filters.level || filters.studentId || filters.studentSearch || batchAssignments.length > 0);

    if (!hasReceiverFilter) {
      return NextResponse.json({ error: "Choose at least one receiver" }, { status: 400 });
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

    const createdFees: { feeId: number; amount: number; studentId?: string }[] = [];
    let assignedCount = 0;

    if (normalizedReceiverType === "batch_upload") {
      const studentIds = batchAssignments.map((item) => item.studentId);
      const students = await prisma.student.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true },
      });
      const existingStudentIds = new Set(students.map((student) => student.studentId));
      const missingStudentIds = studentIds.filter((studentId) => !existingStudentIds.has(studentId));
      if (missingStudentIds.length > 0) {
        return NextResponse.json({ error: `Unknown student ID(s): ${missingStudentIds.join(", ")}` }, { status: 400 });
      }

      for (const assignment of batchAssignments) {
        const fee = await prisma.fee.create({
          data: {
            feeTypeId: feeType.feeTypeId,
            amount: assignment.amount,
            dueDate: parsedDueDate,
            belongsTo: resolvedBelongsTo,
          },
          include: { feeType: true },
        });

        await prisma.studentFee.create({
          data: {
            studentId: assignment.studentId,
            feeId: fee.feeId,
            status: "Pending",
            assignedDate: new Date(),
            isMandatory: true,
          },
        });

        createdFees.push({ feeId: fee.feeId, amount: assignment.amount, studentId: assignment.studentId });
      }

      assignedCount = batchAssignments.length;
    } else {
      const students = await prisma.student.findMany({
        where: buildStudentWhere(filters),
        select: { studentId: true },
      });

      if (students.length === 0) {
        return NextResponse.json({ error: "No matching receivers found" }, { status: 400 });
      }

      const fee = await prisma.fee.create({
        data: {
          feeTypeId: feeType.feeTypeId,
          amount: Number(amount),
          dueDate: parsedDueDate,
          belongsTo: resolvedBelongsTo,
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

      assignedCount = students.length;
      createdFees.push({ feeId: fee.feeId, amount: Number(amount) });
    }

    try {
      await writeAuditLog({
        userId,
        action: "Created fee",
        tableName: "fees",
        recordId: String(createdFees[0]?.feeId ?? ""),
        currentState: {
          feeTypeId: feeType.feeTypeId,
          feeName,
          category,
          description: description || null,
          belongsTo: resolvedBelongsTo,
          assignedCount,
          receiverType: normalizedReceiverType,
          receiverFilters: normalizedReceiverType === "batch_upload" ? { batchAssignments } : filters,
        },
      });
    } catch (auditError) {
      console.error("Failed to write fee creation audit log", auditError);
    }

    return NextResponse.json(
      {
        feeTypeId: feeType.feeTypeId,
        feeName,
        category,
        description: description || null,
        belongsTo: resolvedBelongsTo,
        assignedCount,
        receiverType: normalizedReceiverType,
        createdFees,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create fee" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { feeId, feeName, amount, dueDate, category, description, belongsTo, receiverFilters, userId } = await req.json();
    const resolvedBelongsTo = resolvePaymentOwner(belongsTo);

    if (!feeId || !feeName || !category || !resolvedBelongsTo || !dueDate || amount == null || Number.isNaN(Number(amount))) {
      return NextResponse.json({ error: "Fee type, category, belongs to, due date, and amount are required" }, { status: 400 });
    }

    if (!BELONGS_TO_OPTIONS.includes(resolvedBelongsTo)) {
      return NextResponse.json({ error: "Belongs To value is invalid" }, { status: 400 });
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

    const filters = receiverFilters ?? {};
    const hasReceiverFilter = Boolean(filters.faculty || filters.level || filters.studentId || filters.studentSearch);
    const belongsToChanged = previous.belongsTo !== resolvedBelongsTo;

    if (belongsToChanged && !hasReceiverFilter) {
      return NextResponse.json({ error: "Choose receivers when changing Belongs To" }, { status: 400 });
    }

    if (belongsTo === "SPECIFIC_STUDENT" && (belongsToChanged || hasReceiverFilter)) {
      if (!filters.studentId || typeof filters.studentId !== "string" || !filters.studentId.trim()) {
        return NextResponse.json({ error: "studentId is required for specific student" }, { status: 400 });
      }
    }

    let assignedCount = previous.studentFees.length;
    let studentsToAssign: { studentId: string }[] | null = null;

    if (hasReceiverFilter) {
      studentsToAssign = await prisma.student.findMany({
        where: buildStudentWhere(filters),
        select: { studentId: true },
      });
      assignedCount = studentsToAssign.length;

      if (studentsToAssign.length === 0) {
        return NextResponse.json({ error: "No matching receivers found" }, { status: 400 });
      }
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

    const fee = await prisma.fee.update({
      where: { feeId },
      data: {
        feeTypeId: feeType.feeTypeId,
        amount: Number(amount),
        dueDate: parsedDueDate,
        belongsTo: resolvedBelongsTo,
      },
      include: { feeType: true },
    });

    if (studentsToAssign) {
      await prisma.studentFee.deleteMany({ where: { feeId } });
      await prisma.studentFee.createMany({
        data: studentsToAssign.map((student) => ({
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
