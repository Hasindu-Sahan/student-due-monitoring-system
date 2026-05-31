import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: { include: { admin: true } } },
      orderBy: { timestamp: "desc" },
      take: 200,
    });

    return NextResponse.json(
      logs.map((log) => ({
        id: log.logId,
        action: log.action ?? "",
        tableName: log.tableName ?? "",
        recordId: (log as any).recordId ?? "",
        previousState: (log as any).previousState,
        currentState: (log as any).currentState,
        timestamp: log.timestamp.toISOString(),
        by: log.user.admin
          ? `${log.user.admin.firstName} ${log.user.admin.lastName}`
          : log.user.username,
      }))
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
