import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Cleaning known sample data...");

  const sampleStudentIds = ["IT2023001"];
  const sampleEmployeeIds = ["EMP001"];
  const sampleEmails = ["sanduni.w@university.lk", "bursar@university.lk"];

  const sampleStudentFees = await prisma.studentFee.findMany({
    where: { studentId: { in: sampleStudentIds } },
    select: { studentFeeId: true },
  });

  const sampleStudentFeeIds = sampleStudentFees.map((fee) => fee.studentFeeId);

  if (sampleStudentFeeIds.length > 0) {
    await prisma.payment.deleteMany({
      where: { studentFeeId: { in: sampleStudentFeeIds } },
    });
    await prisma.studentFee.deleteMany({
      where: { studentFeeId: { in: sampleStudentFeeIds } },
    });
  }

  await prisma.fee.deleteMany({
    where: {
      studentFees: { none: {} },
      OR: [
        {
          amount: 75000,
          dueDate: new Date("2026-05-30"),
          feeType: { feeName: "Tuition Fee" },
        },
      ],
    },
  });

  await prisma.feeType.deleteMany({
    where: {
      feeName: { in: ["Tuition Fee", "Hostel Fee", "Examination Fee"] },
      fees: { none: {} },
    },
  });

  await prisma.notification.deleteMany({
    where: { studentId: { in: sampleStudentIds } },
  });

  await prisma.student.deleteMany({
    where: { studentId: { in: sampleStudentIds } },
  });

  await prisma.admin.deleteMany({
    where: { employeeId: { in: sampleEmployeeIds } },
  });

  await prisma.auditLog.deleteMany({
    where: { user: { email: { in: sampleEmails } } },
  });

  await prisma.user.deleteMany({
    where: { email: { in: sampleEmails } },
  });

  console.log("Sample-data cleanup complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
