import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Cleaning known sample data...");

  const sampleStudentIds = ["IT2023001"];
  const sampleEmployeeIds = ["EMP001", "A001", "fac001"];
  const sampleEmails = [
    "sanduni.w@university.lk",
    "bursar@university.lk",
    "a001@university.lk",
    "fac001@university.lk",
  ];


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

  // ---------------------------------------------------------------------
  // Seed main admin login
  //   username : A001
  //   password : a1234
  //   role     : Admin (full portal access)
  // ---------------------------------------------------------------------
  const adminUsername = "A001";
  const adminPassword = "a1234";
  const adminEmail = "a001@university.lk";

  const existingAdminUser = await prisma.user.findFirst({
    where: { username: adminUsername },
  });

  if (existingAdminUser) {
    // Update password hash to ensure it matches (in case it was changed externally)
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.update({
      where: { userId: existingAdminUser.userId },
      data: {
        username: adminUsername,
        passwordHash,
        role: "Admin",
        email: adminEmail,
        isActive: true,
      },
    });

    // Ensure the Admin profile record exists (it may have been deleted)
    const existingAdminProfile = await prisma.admin.findFirst({
      where: {
        OR: [
          { userId: existingAdminUser.userId },
          { employeeId: adminUsername },
        ],
      },
    });

    if (!existingAdminProfile) {
      await prisma.admin.create({
        data: {
          employeeId: adminUsername,
          firstName: "Bursar",
          lastName: "Admin",
          phone: null,
          designation: "Bursar",
          userId: existingAdminUser.userId,
        },
      });
      console.log("Admin login user existed but profile was missing; recreated profile.");
    } else {
      await prisma.admin.update({
        where: { adminId: existingAdminProfile.adminId },
        data: {
          employeeId: adminUsername,
          firstName: "Bursar",
          lastName: "Admin",
          phone: null,
          designation: "Bursar",
          userId: existingAdminUser.userId,
        },
      });
      console.log("Admin login user already exists; skipping seed.");
    }
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const createdAdminUser = await prisma.user.create({
      data: {
        username: adminUsername,
        passwordHash,
        role: "Admin",
        email: adminEmail,
        isActive: true,
        lastLogin: null,
      },
    });

    await prisma.admin.create({
      data: {
        employeeId: adminUsername,
        firstName: "Bursar",
        lastName: "Admin",
        phone: null,
        designation: "Bursar",
        userId: createdAdminUser.userId,
      },
    });

    console.log("Seeded admin login: A001 / a1234 (role Admin)");
  }

  // ---------------------------------------------------------------------
  // Seed faculty (sub-admin) login
  //   username : fac001
  //   password : f1234
  //   role     : Staff (restricted portal access)
  // ---------------------------------------------------------------------
  const facultyUsername = "fac001";
  const facultyPassword = "f1234";
  const facultyEmail = "fac001@university.lk";

  const existingFacultyUser = await prisma.user.findFirst({
    where: { username: facultyUsername },
  });

  if (!existingFacultyUser) {
    const passwordHash = await bcrypt.hash(facultyPassword, 10);

    const createdFacultyUser = await prisma.user.create({
      data: {
        username: facultyUsername,
        passwordHash,
        role: "Staff",
        email: facultyEmail,
        isActive: true,
        lastLogin: null,
      },
    });

    // Create an Admin profile row linked to the same user so the
    // existing admin API endpoints can be reused (read-only view).
    await prisma.admin.create({
      data: {
        employeeId: facultyUsername,
        firstName: "Faculty",
        lastName: "User",
        phone: null,
        designation: "Faculty",
        userId: createdFacultyUser.userId,
      },
    });

    console.log("Seeded faculty login: fac001 / f1234 (role Staff + Admin profile)");
  } else {
    console.log("Faculty login user already exists; skipping seed.");
  }
}


main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
