import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim();
    const where = q
      ? {
          OR: [
            { studentId: { contains: q, mode: "insensitive" as const } },
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const students = await prisma.student.findMany({
      where,
      orderBy: { studentId: "asc" },
      take: 20,
    });

    return NextResponse.json(students.map((student) => ({
      id: student.studentId,
      name: `${student.firstName} ${student.lastName}`,
      email: student.email,
      faculty: student.faculty ?? "",
      // Prisma types in this repo currently do not expose Student.level in generated client.
      // Keep it null to avoid build failures.
      level: (student as any).level ?? null,
      
    })));

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}
