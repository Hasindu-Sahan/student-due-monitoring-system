import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Cleaning known sample data...");

  const sampleStudentIds = ["IT2023001"];
  const sampleEmployeeIds = ["EMP001", "A001", "A002", "FAC001", "WEL001"];
  const sampleEmails = [
    "sanduni.w@university.lk",
    "bursar@university.lk",
    "a001@university.lk",
    "a002@university.lk",
    "fac001@university.lk",
    "wel001@university.lk",
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
  // Seed system administrator login
  //   username : A002
  //   password : a1234
  //   role     : Admin (full portal access)
  // ---------------------------------------------------------------------
  const systemAdminUsername = "A002";
  const systemAdminPassword = "a1234";
  const systemAdminEmail = "a002@university.lk";

  const existingSystemAdminUser = await prisma.user.findFirst({
    where: { username: systemAdminUsername },
  });

  if (existingSystemAdminUser) {
    const passwordHash = await bcrypt.hash(systemAdminPassword, 10);
    await prisma.user.update({
      where: { userId: existingSystemAdminUser.userId },
      data: {
        username: systemAdminUsername,
        passwordHash,
        role: "Admin",
        email: systemAdminEmail,
        isActive: true,
      },
    });

    const existingSystemAdminProfile = await prisma.admin.findFirst({
      where: {
        OR: [
          { userId: existingSystemAdminUser.userId },
          { employeeId: systemAdminUsername },
        ],
      },
    });

    if (!existingSystemAdminProfile) {
      await prisma.admin.create({
        data: {
          employeeId: systemAdminUsername,
          firstName: "System",
          lastName: "Administrator",
          phone: null,
          designation: "System Administrator",
          userId: existingSystemAdminUser.userId,
        },
      });
    } else {
      await prisma.admin.update({
        where: { adminId: existingSystemAdminProfile.adminId },
        data: {
          employeeId: systemAdminUsername,
          firstName: "System",
          lastName: "Administrator",
          phone: null,
          designation: "System Administrator",
          userId: existingSystemAdminUser.userId,
        },
      });
    }

    console.log("System administrator login user already exists; refreshed credentials/profile.");
  } else {
    const passwordHash = await bcrypt.hash(systemAdminPassword, 10);

    const createdSystemAdminUser = await prisma.user.create({
      data: {
        username: systemAdminUsername,
        passwordHash,
        role: "Admin",
        email: systemAdminEmail,
        isActive: true,
        lastLogin: null,
      },
    });

    await prisma.admin.create({
      data: {
        employeeId: systemAdminUsername,
        firstName: "System",
        lastName: "Administrator",
        phone: null,
        designation: "System Administrator",
        userId: createdSystemAdminUser.userId,
      },
    });

    console.log("Seeded system administrator login: A002 / a1234 (role Admin)");
  }

  // ---------------------------------------------------------------------
  // Seed faculty (sub-admin) login
  //   username : FAC001
  //   password : f1234
  //   role     : Staff (restricted portal access)
  // ---------------------------------------------------------------------
  const facultyUsername = "FAC001";
  const facultyPassword = "f1234";
  const facultyEmail = "fac001@university.lk";

  // ---------------------------------------------------------------------
  // Seed FOT office login
  //   employeeID/username : FAC002
  //   password             : f1234
  //   designation          : FOT_Office
  //   role                 : Staff (restricted portal access)
  // ---------------------------------------------------------------------
  const fotOfficeUsername = "FAC002";
  const fotOfficePassword = "f1234";
  const fotOfficeEmail = "fac002@university.lk";

  // ---------------------------------------------------------------------
  // Seed FBSF office login
  //   employeeID/username : FAC003
  //   password             : f1234
  //   designation          : FBSF_Office
  //   role                 : Staff (restricted portal access)
  // ---------------------------------------------------------------------
  const fbsfOfficeUsername = "FAC003";
  const fbsfOfficePassword = "f1234";
  const fbsfOfficeEmail = "fac003@university.lk";


  // Seed FOT office login (FAC002)
  const existingFotOfficeUser = await prisma.user.findFirst({
    where: { username: fotOfficeUsername },
  });

  const fotOfficePasswordHash = await bcrypt.hash(fotOfficePassword, 10);

  if (existingFotOfficeUser) {
    await prisma.user.update({
      where: { userId: existingFotOfficeUser.userId },
      data: {
        username: fotOfficeUsername,
        passwordHash: fotOfficePasswordHash,
        role: "Staff",
        email: fotOfficeEmail,
        isActive: true,
      },
    });

    const existingFotOfficeProfile = await prisma.admin.findFirst({
      where: {
        OR: [
          { userId: existingFotOfficeUser.userId },
          { employeeId: fotOfficeUsername },
        ],
      },
    });

    if (existingFotOfficeProfile) {
      await prisma.admin.update({
        where: { adminId: existingFotOfficeProfile.adminId },
        data: {
          employeeId: fotOfficeUsername,
          firstName: "FOT",
          lastName: "Office",
          phone: null,
          designation: "FOT_Office",
          userId: existingFotOfficeUser.userId,
        },
      });
    } else {
      await prisma.admin.create({
        data: {
          employeeId: fotOfficeUsername,
          firstName: "FOT",
          lastName: "Office",
          phone: null,
          designation: "FOT_Office",
          userId: existingFotOfficeUser.userId,
        },
      });
    }

    console.log("FOT office login user already exists; refreshed credentials/profile.");
  } else {
    const createdFotOfficeUser = await prisma.user.create({
      data: {
        username: fotOfficeUsername,
        passwordHash: fotOfficePasswordHash,
        role: "Staff",
        email: fotOfficeEmail,
        isActive: true,
        lastLogin: null,
      },
    });

    await prisma.admin.create({
      data: {
        employeeId: fotOfficeUsername,
        firstName: "FOT",
        lastName: "Office",
        phone: null,
        designation: "FOT_Office",
        userId: createdFotOfficeUser.userId,
      },
    });

    console.log("Seeded FOT office login: FAC002 / f1234 (role Staff + Admin profile)");
  }

  // Seed FBSF office login (FAC003)
  const existingFbsfOfficeUser = await prisma.user.findFirst({
    where: { username: fbsfOfficeUsername },
  });

  const fbsfOfficePasswordHash = await bcrypt.hash(fbsfOfficePassword, 10);

  if (existingFbsfOfficeUser) {
    await prisma.user.update({
      where: { userId: existingFbsfOfficeUser.userId },
      data: {
        username: fbsfOfficeUsername,
        passwordHash: fbsfOfficePasswordHash,
        role: "Staff",
        email: fbsfOfficeEmail,
        isActive: true,
      },
    });

    const existingFbsfOfficeProfile = await prisma.admin.findFirst({
      where: {
        OR: [
          { userId: existingFbsfOfficeUser.userId },
          { employeeId: fbsfOfficeUsername },
        ],
      },
    });

    if (existingFbsfOfficeProfile) {
      await prisma.admin.update({
        where: { adminId: existingFbsfOfficeProfile.adminId },
        data: {
          employeeId: fbsfOfficeUsername,
          firstName: "FBSF",
          lastName: "Office",
          phone: null,
          designation: "FBSF_Office",
          userId: existingFbsfOfficeUser.userId,
        },
      });
    } else {
      await prisma.admin.create({
        data: {
          employeeId: fbsfOfficeUsername,
          firstName: "FBSF",
          lastName: "Office",
          phone: null,
          designation: "FBSF_Office",
          userId: existingFbsfOfficeUser.userId,
        },
      });
    }

    console.log("FBSF office login user already exists; refreshed credentials/profile.");
  } else {
    const createdFbsfOfficeUser = await prisma.user.create({
      data: {
        username: fbsfOfficeUsername,
        passwordHash: fbsfOfficePasswordHash,
        role: "Staff",
        email: fbsfOfficeEmail,
        isActive: true,
        lastLogin: null,
      },
    });

    await prisma.admin.create({
      data: {
        employeeId: fbsfOfficeUsername,
        firstName: "FBSF",
        lastName: "Office",
        phone: null,
        designation: "FBSF_Office",
        userId: createdFbsfOfficeUser.userId,
      },
    });

    console.log("Seeded FBSF office login: FAC003 / f1234 (role Staff + Admin profile)");
  }

  const existingFacultyUser = await prisma.user.findFirst({
    where: { username: facultyUsername },
  });


  const facultyPasswordHash = await bcrypt.hash(facultyPassword, 10);

  if (existingFacultyUser) {
    await prisma.user.update({
      where: { userId: existingFacultyUser.userId },
      data: {
        username: facultyUsername,
        passwordHash: facultyPasswordHash,
        role: "Staff",
        email: facultyEmail,
        isActive: true,
      },
    });

    const existingFacultyProfile = await prisma.admin.findFirst({
      where: {
        OR: [
          { userId: existingFacultyUser.userId },
          { employeeId: facultyUsername },
        ],
      },
    });

    if (existingFacultyProfile) {
      await prisma.admin.update({
        where: { adminId: existingFacultyProfile.adminId },
        data: {
          employeeId: facultyUsername,
          firstName: "FAS",
          lastName: "Office",
          phone: null,
          designation: "FAS_Office",
          userId: existingFacultyUser.userId,
        },
      });
    } else {
      await prisma.admin.create({
        data: {
          employeeId: facultyUsername,
          firstName: "FAS",
          lastName: "Office",
          phone: null,
          designation: "FAS_Office",
          userId: existingFacultyUser.userId,
        },
      });
    }

    console.log("Faculty login user already exists; refreshed credentials/profile.");
  } else {
    const createdFacultyUser = await prisma.user.create({
      data: {
        username: facultyUsername,
        passwordHash: facultyPasswordHash,
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
        firstName: "FAS",
        lastName: "Office",
        phone: null,
        designation: "FAS_Office",
        userId: createdFacultyUser.userId,
      },
    });

    console.log("Seeded faculty login: FAC001 / f1234 (role Staff + Admin profile)");
  }

  // ---------------------------------------------------------------------
  // Seed welfare (sub-admin) login
  //   username : WEL001
  //   password : w1234
  //   role     : Staff (restricted welfare payment view)
  // ---------------------------------------------------------------------
  const welfareUsername = "WEL001";
  const welfarePassword = "w1234";
  const welfareEmail = "wel001@university.lk";

  const existingWelfareUser = await prisma.user.findFirst({
    where: { username: welfareUsername },
  });

  const welfarePasswordHash = await bcrypt.hash(welfarePassword, 10);

  if (existingWelfareUser) {
    await prisma.user.update({
      where: { userId: existingWelfareUser.userId },
      data: {
        username: welfareUsername,
        passwordHash: welfarePasswordHash,
        role: "Staff",
        email: welfareEmail,
        isActive: true,
      },
    });

    const existingWelfareProfile = await prisma.admin.findFirst({
      where: {
        OR: [
          { userId: existingWelfareUser.userId },
          { employeeId: welfareUsername },
        ],
      },
    });

    if (existingWelfareProfile) {
      await prisma.admin.update({
        where: { adminId: existingWelfareProfile.adminId },
        data: {
          employeeId: welfareUsername,
          firstName: "Welfare",
          lastName: "Office",
          phone: null,
          designation: "Welfare",
          userId: existingWelfareUser.userId,
        },
      });
    } else {
      await prisma.admin.create({
        data: {
          employeeId: welfareUsername,
          firstName: "Welfare",
          lastName: "Office",
          phone: null,
          designation: "Welfare",
          userId: existingWelfareUser.userId,
        },
      });
    }

    console.log("Welfare login user already exists; refreshed credentials/profile.");
  } else {
    const createdWelfareUser = await prisma.user.create({
      data: {
        username: welfareUsername,
        passwordHash: welfarePasswordHash,
        role: "Staff",
        email: welfareEmail,
        isActive: true,
        lastLogin: null,
      },
    });

    await prisma.admin.create({
      data: {
        employeeId: welfareUsername,
        firstName: "Welfare",
        lastName: "Office",
        phone: null,
        designation: "Welfare",
        userId: createdWelfareUser.userId,
      },
    });

    console.log("Seeded welfare login: WEL001 / w1234 (role Staff + Admin profile)");
  }
}


main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
