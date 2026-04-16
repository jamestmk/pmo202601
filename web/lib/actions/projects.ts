"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireProjectAccess, canManageWorkflow } from "@/lib/access";
import { createOperationLog } from "@/lib/operation-log";

function withMsg(path: string, key: "ok" | "err", message: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}`;
}

export async function createProject(formData: FormData) {
  try {
    const user = await requireAdmin();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "请填写项目名称" };
    const description =
      String(formData.get("description") ?? "").trim() || null;
    const ownerIdRaw = String(formData.get("ownerId") ?? "").trim();
    const ownerId = ownerIdRaw || null;

    if (ownerId) {
      const ownerExists = await prisma.user.findUnique({ where: { id: ownerId } });
      if (!ownerExists) return { error: "所选负责人不存在" };
    }

    const project = await prisma.project.create({
      data: { name, description, ownerId },
      include: { owner: true },
    });

    await createOperationLog({
      actorUserId: user.id,
      action: "project.create",
      projectId: project.id,
      targetType: "Project",
      targetId: project.id,
      summary: `创建项目「${project.name}」${project.owner ? `，负责人：${project.owner.name || project.owner.email}` : ""}`,
    });

    revalidatePath("/");
    revalidatePath("/projects");
    return { ok: true as const, message: "项目已创建" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "创建失败" };
  }
}

export async function updateProjectOwner(projectId: string, ownerIdRaw: string) {
  try {
    const user = await requireAdmin();
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { owner: true },
    });
    if (!project) return { error: "项目不存在" };

    const ownerId = ownerIdRaw.trim() || null;
    let nextOwnerName = "未设置";
    if (ownerId) {
      const owner = await prisma.user.findUnique({ where: { id: ownerId } });
      if (!owner) return { error: "所选负责人不存在" };
      nextOwnerName = owner.name || owner.email;
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { ownerId },
    });

    await createOperationLog({
      actorUserId: user.id,
      action: "project.update_owner",
      projectId,
      targetType: "Project",
      targetId: projectId,
      summary: `将项目「${project.name}」负责人从「${project.owner ? project.owner.name || project.owner.email : "未设置"}」改为「${nextOwnerName}」`,
    });

    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/settings`);
    return { ok: true as const, message: "项目负责人已更新" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "更新失败" };
  }
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: "MEMBER" | "PM",
) {
  try {
    const user = await requireAdmin();
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!targetUser || !project) return { error: "项目或用户不存在" };

    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      update: { role },
      create: { projectId, userId, role },
    });

    await createOperationLog({
      actorUserId: user.id,
      action: "project.add_member",
      projectId,
      targetType: "ProjectMember",
      targetId: `${projectId}:${userId}`,
      summary: `将 ${targetUser.name || targetUser.email} 加入项目「${project.name}」，角色：${role === "PM" ? "项目经理" : "成员"}`,
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/settings`);
    revalidatePath("/projects");
    return { ok: true as const, message: "成员已加入项目" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "添加失败" };
  }
}

export async function addWorkflowStatus(projectId: string, name: string) {
  try {
    const { user, member } = await requireProjectAccess(projectId);
    if (!canManageWorkflow(user.globalRole, member)) {
      return { error: "仅项目经理或管理员可配置状态" };
    }
    const n = name.trim();
    if (!n) return { error: "状态名称不能为空" };

    const agg = await prisma.workflowStatus.aggregate({
      where: { projectId },
      _max: { sortOrder: true },
    });
    const nextOrder = (agg._max.sortOrder ?? -1) + 1;

    const status = await prisma.workflowStatus.create({
      data: { projectId, name: n, sortOrder: nextOrder },
    });

    await createOperationLog({
      actorUserId: user.id,
      action: "workflow_status.create",
      projectId,
      targetType: "WorkflowStatus",
      targetId: status.id,
      summary: `在项目中新增研发状态「${status.name}」`,
    });

    revalidatePath(`/projects/${projectId}/settings`);
    revalidatePath(`/projects/${projectId}/board`);
    return { ok: true as const, message: "研发状态已添加" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "添加失败" };
  }
}

export async function deleteWorkflowStatus(statusId: string) {
  try {
    const status = await prisma.workflowStatus.findUnique({
      where: { id: statusId },
    });
    if (!status) return { error: "状态不存在" };
    const { user, member } = await requireProjectAccess(status.projectId);
    if (!canManageWorkflow(user.globalRole, member)) {
      return { error: "仅项目经理或管理员可删除状态" };
    }

    const inUse = await prisma.issue.count({
      where: { workflowStatusId: statusId },
    });
    if (inUse > 0) return { error: "仍有需求在此列，无法删除" };

    await prisma.workflowStatus.delete({ where: { id: statusId } });

    await createOperationLog({
      actorUserId: user.id,
      action: "workflow_status.delete",
      projectId: status.projectId,
      targetType: "WorkflowStatus",
      targetId: status.id,
      summary: `删除研发状态「${status.name}」`,
    });

    revalidatePath(`/projects/${status.projectId}/settings`);
    revalidatePath(`/projects/${status.projectId}/board`);
    return { ok: true as const, message: "研发状态已删除" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "删除失败" };
  }
}

export async function createProjectForm(formData: FormData) {
  const r = await createProject(formData);
  if ("error" in r && r.error) {
    redirect(withMsg("/projects", "err", r.error));
  }
  redirect(withMsg("/projects", "ok", r.message));
}

export async function updateProjectOwnerForm(projectId: string, formData: FormData) {
  const ownerId = String(formData.get("ownerId") ?? "");
  const r = await updateProjectOwner(projectId, ownerId);
  if ("error" in r && r.error) {
    redirect(withMsg(`/projects/${projectId}/settings`, "err", r.error));
  }
  redirect(withMsg(`/projects/${projectId}/settings`, "ok", r.message));
}

export async function addWorkflowStatusForm(
  projectId: string,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "");
  const r = await addWorkflowStatus(projectId, name);
  if ("error" in r && r.error) {
    redirect(withMsg(`/projects/${projectId}/settings`, "err", r.error));
  }
  redirect(withMsg(`/projects/${projectId}/settings`, "ok", r.message));
}

export async function deleteWorkflowStatusForm(statusId: string) {
  const status = await prisma.workflowStatus.findUnique({
    where: { id: statusId },
  });
  const r = await deleteWorkflowStatus(statusId);
  const pid = status?.projectId ?? "";
  if ("error" in r && r.error) {
    redirect(withMsg(`/projects/${pid}/settings`, "err", r.error));
  }
  redirect(withMsg(`/projects/${pid}/settings`, "ok", r.message));
}

export async function updateProjectTags(projectId: string, tags: { label: string; color: string }[], labelColor: string | null) {
  try {
    await requireAdmin();
    await prisma.project.update({
      where: { id: projectId },
      data: { tags: JSON.stringify(tags), labelColor: labelColor || null },
    });
    revalidatePath("/projects");
    return { ok: true as const };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "更新失败" };
  }
}

export async function addProjectMemberForm(projectId: string, formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "MEMBER") as "MEMBER" | "PM";
  const r = await addProjectMember(projectId, userId, role);
  if ("error" in r && r.error) {
    redirect(withMsg(`/projects/${projectId}/settings`, "err", r.error));
  }
  redirect(withMsg(`/projects/${projectId}/settings`, "ok", r.message));
}
