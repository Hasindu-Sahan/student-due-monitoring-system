import { prisma } from "@/lib/prisma";

function localDateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function sendDueDateReminders(referenceDate = new Date()) {
  const today = localDateOnly(referenceDate);
  const reminderDateValue = addDays(today, 1);
  const reminderDate = formatDateKey(reminderDateValue);

  const studentFees = await prisma.studentFee.findMany({
    where: {
      status: { not: "Paid" },
      fee: {
        dueDate: reminderDateValue,
      },
    },
    include: {
      student: true,
      fee: { include: { feeType: true } },
      payments: { where: { status: "Approved" }, take: 1 },
    },
  });

  let created = 0;

  for (const studentFee of studentFees) {
    if (studentFee.payments.length > 0) continue;

    const feeName = studentFee.fee.feeType.feeName;
    const message = `Reminder: your payment for ${feeName} is due tomorrow (${reminderDate}). Please complete the payment on time. [studentFeeId:${studentFee.studentFeeId}]`;

    const existing = await prisma.notification.findFirst({
      where: {
        studentId: studentFee.studentId,
        notificationType: "DueReminder",
        message,
      },
      select: { notificationId: true },
    });

    if (existing) continue;

    await prisma.notification.create({
      data: {
        studentId: studentFee.studentId,
        notificationType: "DueReminder",
        status: "Unread",
        message,
      },
    });
    created += 1;
  }

  return { created, dueDate: reminderDate };
}
