import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { belongsToVariants, normalizeBelongsTo } from "@/lib/belongs-to";

export async function GET(req: NextRequest) {
  try {
    const belongsTo = normalizeBelongsTo(req.nextUrl.searchParams.get("belongsTo"));
    const belongsToFilters = belongsTo ? belongsToVariants(belongsTo) : [];

    const notifications = await prisma.notification.findMany({
      where: belongsTo
        ? {
            notificationType: "Payment",
            student: {
              studentFees: {
                some: {
                  fee: {
                    belongsTo: { in: belongsToFilters },
                  },
                },
              },
            },
          }
        : { notificationType: "Payment" },
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
    const { notificationId, all, belongsTo } = await req.json();
    const belongsToFilters = normalizeBelongsTo(belongsTo) ? belongsToVariants(belongsTo) : [];

    if (all) {
      await prisma.notification.updateMany({
        where: belongsToFilters.length
          ? {
              notificationType: "Payment",
              status: "Unread",
              student: {
                studentFees: {
                  some: { fee: { belongsTo: { in: belongsToFilters } } },
                },
              },
            }
          : { notificationType: "Payment", status: "Unread" },
        data: { status: "Read" },
      });
      return NextResponse.json({ success: true });
    }

    const result = await prisma.notification.updateMany({
      where: belongsToFilters.length
        ? {
            notificationId,
            notificationType: "Payment",
            student: {
              studentFees: {
                some: { fee: { belongsTo: { in: belongsToFilters } } },
              },
            },
          }
        : { notificationId, notificationType: "Payment" },
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
