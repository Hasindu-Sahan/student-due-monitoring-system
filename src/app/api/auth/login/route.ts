import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

type LoginRole = "student" | "admin";

function roleMatches(selectedRole: LoginRole, dbRole: string) {
  if (selectedRole === "student") return dbRole === "Student";
  return dbRole === "Admin" || dbRole === "Staff";
}

async function passwordMatches(password: string, passwordHash: string) {
  if (passwordHash.startsWith("$2")) {
    return bcrypt.compare(password, passwordHash);
  }

  return password === passwordHash;
}

export async function POST(req: NextRequest) {
  try {
    const { username, password, role } = await req.json();
    const loginRole = role as LoginRole;

    if (!username || !password || !["student", "admin"].includes(loginRole)) {
      return NextResponse.json({ error: "Username, password, and role are required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [
          { username: String(username).trim() },
          { email: String(username).trim() },
        ],
      },
      include: {
        student: true,
        admin: true,
      },
    });

    if (!user || !roleMatches(loginRole, user.role)) {
      return NextResponse.json({ error: "Invalid username, password, or role" }, { status: 401 });
    }

    const validPassword = await passwordMatches(String(password), user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Invalid username, password, or role" }, { status: 401 });
    }

    if (loginRole === "student" && !user.student) {
      return NextResponse.json({ error: "No student profile found for this user" }, { status: 403 });
    }

    if (loginRole === "admin" && !user.admin) {
      return NextResponse.json({ error: "No admin profile found for this user" }, { status: 403 });
    }

    await prisma.user.update({
      where: { userId: user.userId },
      data: { lastLogin: new Date() },
    });

    return NextResponse.json({
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: loginRole,
      profileId: loginRole === "student" ? user.student?.studentId : user.admin?.employeeId,
      name: loginRole === "student"
        ? `${user.student?.firstName ?? ""} ${user.student?.lastName ?? ""}`.trim()
        : `${user.admin?.firstName ?? ""} ${user.admin?.lastName ?? ""}`.trim(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 });
  }
}
