import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
      where: { notificationType: "Payment" },
      include: { student: true },
      orderBy: { sentDate: "desc" },
      take: 100,
    });

    return NextResponse.json(notifications.map((notification) => ({
      id: notification.notificationId,
      studentId: notification.studentId,
      studentName: `${notification.student.firstName} ${notification.student.lastName}`,
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
    const { notificationId, all } = await req.json();

    if (all) {
      await prisma.notification.updateMany({
        where: { notificationType: "Payment", status: "Unread" },
        data: { status: "Read" },
      });
      return NextResponse.json({ success: true });
    }

    const result = await prisma.notification.updateMany({
      where: { notificationId, notificationType: "Payment" },
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
