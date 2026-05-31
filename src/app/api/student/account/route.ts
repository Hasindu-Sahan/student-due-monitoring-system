import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams.get("username")?.trim();
    const userId = Number(req.nextUrl.searchParams.get("userId"));
    const student = await prisma.student.findFirst({
      where: Number.isInteger(userId) && userId > 0
        ? { userId }
        : username
        ? {
            OR: [
              { studentId: username },
              { email: username },
              { user: { username } },
              { user: { email: username } },
            ],
          }
        : undefined,
      include: { user: true },
      orderBy: { studentId: "asc" },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone ?? "",
      faculty: student.faculty ?? "",
      academicYear: student.academicYear ?? "",
      status: student.enrollmentStatus ?? "Active",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 });
  }
}
