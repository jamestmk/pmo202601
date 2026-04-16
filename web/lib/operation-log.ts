import { prisma } from "@/lib/prisma";

type LogParams = {
  actorUserId: string;
  action: string;
  summary: string;
  targetType: string;
  targetId?: string | null;
  projectId?: string | null;
};

export async function createOperationLog({
  actorUserId,
  action,
  summary,
  targetType,
  targetId,
  projectId,
}: LogParams) {
  await prisma.operationLog.create({
    data: {
      actorUserId,
      action,
      summary,
      targetType,
      targetId: targetId ?? null,
      projectId: projectId ?? null,
    },
  });
}
