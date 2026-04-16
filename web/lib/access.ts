import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { GlobalRole, ProjectRole } from "@prisma/client";
import { isPlatformAdmin } from "@/lib/platform-role";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登录");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isPlatformAdmin(user.globalRole)) {
    throw new Error("需要管理员权限");
  }
  return user;
}

export async function getMembership(projectId: string, userId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

/** 管理员可进任意项目；其余身份须为项目成员 */
export async function requireProjectAccess(projectId: string) {
  const user = await requireUser();
  if (isPlatformAdmin(user.globalRole)) {
    return { user, member: null as { role: ProjectRole } | null };
  }
  const member = await getMembership(projectId, user.id);
  if (!member) throw new Error("无权访问该项目");
  return { user, member };
}

/** V2: 任何项目成员都可以配置研发状态 */
export function canManageWorkflow(
  globalRole: GlobalRole,
  member: { role: ProjectRole } | null,
) {
  if (isPlatformAdmin(globalRole)) return true;
  // 任何项目成员都可以配置
  return !!member;
}

/** V2: 任何项目成员都可以流转需求状态 */
export function canTransitionIssue(
  globalRole: GlobalRole,
  member: { role: ProjectRole } | null,
  _assigneeId: string | null,
  _userId: string,
) {
  if (isPlatformAdmin(globalRole)) return true;
  // 任何项目成员都可以流转
  return !!member;
}
