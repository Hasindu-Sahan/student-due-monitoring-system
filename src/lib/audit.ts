import { prisma } from "@/lib/prisma";

type AuditInput = {
  userId?: number | null;
  action: string;
  tableName: string;
  recordId?: string | number | null;
  previousState?: unknown;
  currentState?: unknown;
};

export async function writeAuditLog({
  userId,
  action,
  tableName,
  recordId,
  previousState,
  currentState,
}: AuditInput) {
  if (!userId) return;

  // Prisma schema uses: logId, userId, action, tableName, recordId, previousState, currentState.
  // If your generated Prisma client differs, keep this data shape minimal and only set known columns.
  await prisma.auditLog.create({
    data: {
      userId,
      action: action.slice(0, 100),
      tableName: tableName.slice(0, 100),
      // recordId/previousState/currentState may not exist in generated prisma types.
      // Only send minimal known columns.
      ...(recordId == null ? {} : ({ recordId: String(recordId).slice(0, 100) } as any)),
      ...(previousState == null ? {} : ({ previousState: (JSON.parse(JSON.stringify(previousState)) as any) } as any)),
      ...(currentState == null ? {} : ({ currentState: (JSON.parse(JSON.stringify(currentState)) as any) } as any)),
    },
  });
}
