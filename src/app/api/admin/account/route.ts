import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams.get("username")?.trim();
    const userId = Number(req.nextUrl.searchParams.get("userId"));
    const admin = await prisma.admin.findFirst({
      where: Number.isInteger(userId) && userId > 0
        ? { userId }
        : username
        ? {
            OR: [
              { employeeId: username },
              { user: { username } },
              { user: { email: username } },
            ],
          }
        : undefined,
      include: { user: true },
    });

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json({
      userId: admin.userId,
      id: admin.employeeId,
      username: admin.user.username,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.user.email,
      phone: admin.phone ?? "",
      designation: admin.designation ?? "",
      lastLogin: admin.user.lastLogin?.toISOString() ?? null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch admin" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, firstName, lastName, phone, designation, username, password } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User is required" }, { status: 400 });
    }

    const previous = await prisma.admin.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!previous) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const updated = await prisma.admin.update({
      where: { userId },
      data: {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(designation !== undefined ? { designation } : {}),
        user: {
          update: {
            ...(username ? { username } : {}),
            ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
          },
        },
      },
      include: { user: true },
    });

    await writeAuditLog({
      userId,
      action: username ? "Reset username" : password ? "Reset password" : "Updated admin profile",
      tableName: "admins",
      recordId: updated.adminId,
      previousState: {
        firstName: previous.firstName,
        lastName: previous.lastName,
        phone: previous.phone,
        designation: previous.designation,
        username: previous.user.username,
      },
      currentState: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
        designation: updated.designation,
        username: updated.user.username,
      },
    });

    return NextResponse.json({
      userId: updated.userId,
      id: updated.employeeId,
      username: updated.user.username,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.user.email,
      phone: updated.phone ?? "",
      designation: updated.designation ?? "",
      lastLogin: updated.user.lastLogin?.toISOString() ?? null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update admin account" }, { status: 500 });
  }
}
