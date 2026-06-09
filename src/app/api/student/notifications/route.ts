import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function findStudent(req: NextRequest) {
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
    orderBy: { studentId: "asc" },
  });
  return student;
}

export async function GET(req: NextRequest) {
  try {
    const student = await findStudent(req);
    if (!student) return NextResponse.json([]);

    const notifications = await prisma.notification.findMany({
      where: { studentId: student.studentId },
      orderBy: { sentDate: "desc" },
      take: 100,
    });

    return NextResponse.json(notifications.map((notification) => ({
      id: notification.notificationId,
      studentId: notification.studentId,
      type: notification.notificationType ?? "Notification",
      message: notification.message,
      status: notification.status ?? "Unread",
      sentDate: notification.sentDate.toISOString(),
    })));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const student = await findStudent(req);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const { notificationId, all } = await req.json();
    if (all) {
      await prisma.notification.updateMany({
        where: { studentId: student.studentId, status: "Unread" },
        data: { status: "Read" },
      });
      return NextResponse.json({ success: true });
    }

    const result = await prisma.notification.updateMany({
      where: { notificationId, studentId: student.studentId },
      data: { status: "Read" },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
