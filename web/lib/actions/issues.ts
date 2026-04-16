"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  requireProjectAccess,
} from "@/lib/access";
import { createOperationLog } from "@/lib/operation-log";
import { parseCardColor, parsePriorityValue } from "@/lib/priority";
import type { IssueCategory, IssueComplexity } from "@prisma/client";

const VALID_CATEGORIES: IssueCategory[] = ["FEATURE", "BUG", "IMPROVEMENT", "ANNOTATION", "TECH_DEBT", "OTHER"];
const VALID_COMPLEXITIES: IssueComplexity[] = ["SIMPLE", "MEDIUM", "COMPLEX"];

function parseCategory(raw: FormDataEntryValue | null): IssueCategory | null {
  const v = String(raw ?? "").trim();
  return VALID_CATEGORIES.includes(v as IssueCategory) ? (v as IssueCategory) : null;
}

function parseComplexity(raw: FormDataEntryValue | null): IssueComplexity | null {
  const v = String(raw ?? "").trim();
  return VALID_COMPLEXITIES.includes(v as IssueComplexity) ? (v as IssueComplexity) : null;
}

async function nextSortOrder(projectId: string, phase: "BACKLOG" | "ACTIVE", workflowStatusId?: string | null) {
  const row = await prisma.issue.aggregate({
    where: {
      projectId,
      phase,
      workflowStatusId: phase === "ACTIVE" ? workflowStatusId ?? null : null,
    },
    _max: { sortOrder: true },
  });
  return (row._max.sortOrder ?? -1) + 1;
}

function revalidateProject(projectId: string) {
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/pool`);
  revalidatePath(`/projects/${projectId}/board`);
}

function withMsg(path: string, key: "ok" | "err", message: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}`;
}

export async function createPoolIssue(projectId: string, formData: FormData) {
  try {
    const user = await requireUser();
    await requireProjectAccess(projectId);
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return { error: "请填写标题" };

    const issue = await prisma.issue.create({
      data: {
        projectId,
        title,
        description: String(formData.get("description") ?? "").trim() || null,
        priority: parsePriorityValue(formData.get("priority")),
        cardColor: parseCardColor(formData.get("cardColor")),
        isFlagged: String(formData.get("isFlagged") ?? "") === "on",
        phase: "BACKLOG",
        sortOrder: await nextSortOrder(projectId, "BACKLOG"),
        requesterId: user.id,
        category: parseCategory(formData.get("category")),
        module: String(formData.get("module") ?? "").trim() || null,
        complexity: parseComplexity(formData.get("complexity")),
        aiClassified: String(formData.get("aiClassified") ?? "") === "on",
      },
    });

    await createOperationLog({
      actorUserId: user.id,
      action: "issue.create_backlog",
      projectId,
      targetType: "Issue",
      targetId: issue.id,
      summary: `创建需求「${issue.title}」并放入需求池`,
    });

    revalidateProject(projectId);
    return { ok: true as const, message: "需求已加入需求池" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "创建失败" };
  }
}

export async function closePoolIssue(issueId: string, reason: string) {
  try {
    const user = await requireUser();
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) return { error: "需求不存在" };
    await requireProjectAccess(issue.projectId);
    if (issue.phase !== "BACKLOG") {
      return { error: "仅「需求池」中的项可在此关闭" };
    }
    const r = reason.trim();
    if (!r) return { error: "请填写关闭原因" };

    const updated = await prisma.issue.update({
      where: { id: issueId },
      data: {
        phase: "CLOSED",
        closeReason: r,
        workflowStatusId: null,
        assigneeId: null,
      },
    });

    await createOperationLog({
      actorUserId: user.id,
      action: "issue.close_backlog",
      projectId: updated.projectId,
      targetType: "Issue",
      targetId: updated.id,
      summary: `关闭需求「${updated.title}」，原因：${r}`,
    });

    revalidateProject(updated.projectId);
    return { ok: true as const, message: "需求已关闭" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "关闭失败" };
  }
}

export async function promoteToDevelopment(issueId: string, assigneeId: string) {
  try {
    const user = await requireUser();
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) return { error: "需求不存在" };
    await requireProjectAccess(issue.projectId);
    if (issue.phase !== "BACKLOG") return { error: "仅需求池项可转入开发" };

    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: issue.projectId, userId: assigneeId },
      },
      include: { user: true },
    });
    if (!member) return { error: "承接人须为本项目成员" };

    const devStatus = await prisma.workflowStatus.findFirst({
      where: { projectId: issue.projectId, name: "开发中" },
    });
    if (!devStatus) {
      return { error: "请 PM 先在项目设置中配置名为「开发中」的研发状态" };
    }

    const updated = await prisma.issue.update({
      where: { id: issueId },
      data: {
        phase: "ACTIVE",
        workflowStatusId: devStatus.id,
        assigneeId,
        sortOrder: await nextSortOrder(issue.projectId, "ACTIVE", devStatus.id),
      },
    });

    await createOperationLog({
      actorUserId: user.id,
      action: "issue.promote_to_development",
      projectId: updated.projectId,
      targetType: "Issue",
      targetId: updated.id,
      summary: `将需求「${updated.title}」转入「${devStatus.name}」，承接人：${member.user.name || member.user.email}`,
    });

    revalidateProject(updated.projectId);
    return { ok: true as const, message: "已转入开发中" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "操作失败" };
  }
}

export async function advanceWorkflow(issueId: string, nextAssigneeId: string) {
  try {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { workflowStatus: true },
    });
    if (!issue || issue.phase !== "ACTIVE" || !issue.workflowStatusId) {
      return { error: "仅研发中的需求可流转" };
    }

    const { user } = await requireProjectAccess(issue.projectId);

    const statuses = await prisma.workflowStatus.findMany({
      where: { projectId: issue.projectId },
      orderBy: { sortOrder: "asc" },
    });
    const idx = statuses.findIndex((s) => s.id === issue.workflowStatusId);
    if (idx < 0 || idx >= statuses.length - 1) {
      return { error: "已在最后一列，或状态配置已变更" };
    }
    const next = statuses[idx + 1];

    const nextMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: issue.projectId, userId: nextAssigneeId },
      },
      include: { user: true },
    });
    if (!nextMember) return { error: "下一承接人须为本项目成员" };

    const updated = await prisma.issue.update({
      where: { id: issueId },
      data: {
        workflowStatusId: next.id,
        assigneeId: nextAssigneeId,
        sortOrder: await nextSortOrder(issue.projectId, "ACTIVE", next.id),
      },
    });

    await createOperationLog({
      actorUserId: user.id,
      action: "issue.advance_workflow",
      projectId: updated.projectId,
      targetType: "Issue",
      targetId: updated.id,
      summary: `将需求「${updated.title}」从「${issue.workflowStatus?.name ?? "未知状态"}」流转到「${next.name}」，下一承接人：${nextMember.user.name || nextMember.user.email}`,
    });

    revalidateProject(updated.projectId);
    return { ok: true as const, message: `已流转至「${next.name}」` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "流转失败" };
  }
}

export async function moveIssue(issueId: string, direction: "up" | "down") {
  try {
    const user = await requireUser();
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) return { error: "需求不存在" };
    await requireProjectAccess(issue.projectId);

    const siblings = await prisma.issue.findMany({
      where: {
        projectId: issue.projectId,
        phase: issue.phase,
        workflowStatusId: issue.phase === "ACTIVE" ? issue.workflowStatusId : null,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, sortOrder: true, title: true },
    });

    const idx = siblings.findIndex((item) => item.id === issueId);
    if (idx < 0) return { error: "当前卡片不在可排序列表中" };
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) {
      return { error: direction === "up" ? "已经在最前面" : "已经在最后面" };
    }

    const target = siblings[swapIdx];
    await prisma.$transaction([
      prisma.issue.update({ where: { id: issue.id }, data: { sortOrder: target.sortOrder } }),
      prisma.issue.update({ where: { id: target.id }, data: { sortOrder: issue.sortOrder } }),
    ]);

    await createOperationLog({
      actorUserId: user.id,
      action: "issue.reorder",
      projectId: issue.projectId,
      targetType: "Issue",
      targetId: issue.id,
      summary: `将需求「${issue.title}」${direction === "up" ? "上移" : "下移"}一位`,
    });

    revalidateProject(issue.projectId);
    return { ok: true as const, message: direction === "up" ? "已上移" : "已下移" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "排序失败" };
  }
}

export async function updateIssuePresentation(issueId: string, formData: FormData) {
  try {
    const user = await requireUser();
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) return { error: "需求不存在" };
    await requireProjectAccess(issue.projectId);

    const nextPriority = parsePriorityValue(formData.get("priority"));
    const nextColor = parseCardColor(formData.get("cardColor"));
    const nextFlagged = String(formData.get("isFlagged") ?? "") === "on";

    const updated = await prisma.issue.update({
      where: { id: issueId },
      data: {
        priority: nextPriority,
        cardColor: nextColor,
        isFlagged: nextFlagged,
      },
    });

    if (issue.priority !== nextPriority) {
      await createOperationLog({
        actorUserId: user.id,
        action: "issue.update_priority",
        projectId: updated.projectId,
        targetType: "Issue",
        targetId: updated.id,
        summary: `将需求「${updated.title}」的优先级从 P${issue.priority} 调整为 P${nextPriority}`,
      });
    }

    if (issue.isFlagged !== nextFlagged) {
      await createOperationLog({
        actorUserId: user.id,
        action: "issue.update_flag",
        projectId: updated.projectId,
        targetType: "Issue",
        targetId: updated.id,
        summary: `${nextFlagged ? "为" : "取消"}需求「${updated.title}」旗标`,
      });
    }

    if (issue.cardColor !== nextColor) {
      await createOperationLog({
        actorUserId: user.id,
        action: "issue.update_card_color",
        projectId: updated.projectId,
        targetType: "Issue",
        targetId: updated.id,
        summary: `将需求「${updated.title}」卡片颜色改为「${nextColor}」`,
      });
    }

    revalidateProject(updated.projectId);
    return { ok: true as const, message: "卡片信息已更新" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "更新失败" };
  }
}

export async function updateIssue(
  issueId: string,
  formData: FormData,
) {
  try {
    const user = await requireUser();
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) return { error: "需求不存在" };
    await requireProjectAccess(issue.projectId);

    const title = String(formData.get("title") ?? "").trim();
    if (!title) return { error: "标题不能为空" };

    const updated = await prisma.issue.update({
      where: { id: issueId },
      data: {
        title,
        description: String(formData.get("description") ?? "").trim() || null,
        priority: parsePriorityValue(formData.get("priority")),
        cardColor: parseCardColor(formData.get("cardColor")),
        isFlagged: String(formData.get("isFlagged") ?? "") === "on",
      },
    });

    await createOperationLog({
      actorUserId: user.id,
      action: "issue.edit",
      projectId: updated.projectId,
      targetType: "Issue",
      targetId: updated.id,
      summary: `编辑需求「${updated.title}」`,
    });

    revalidateProject(updated.projectId);
    return { ok: true as const, message: "需求已保存" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function updatePoolIssue(
  issueId: string,
  formData: FormData,
) {
  return updateIssue(issueId, formData);
}

/* ----- 表单入口：失败时带 err 查询参数重定向，便于页面展示 ----- */

export async function createPoolIssueAndRedirect(
  projectId: string,
  formData: FormData,
) {
  const r = await createPoolIssue(projectId, formData);
  if ("error" in r && r.error) {
    redirect(withMsg(`/projects/${projectId}/pool`, "err", r.error));
  }
  redirect(withMsg(`/projects/${projectId}/pool`, "ok", r.message));
}

export async function closePoolIssueForm(issueId: string, formData: FormData) {
  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  const pid = issue?.projectId ?? "";
  const reason = String(formData.get("reason") ?? "");
  const r = await closePoolIssue(issueId, reason);
  if ("error" in r && r.error) {
    redirect(withMsg(`/projects/${pid}/pool`, "err", r.error));
  }
  redirect(withMsg(`/projects/${pid}/pool`, "ok", r.message));
}

export async function promoteFromForm(issueId: string, formData: FormData) {
  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  const pid = issue?.projectId ?? "";
  const assigneeId = String(formData.get("assigneeId") ?? "");
  const r = await promoteToDevelopment(issueId, assigneeId);
  if ("error" in r && r.error) {
    redirect(withMsg(`/projects/${pid}/pool`, "err", r.error));
  }
  redirect(withMsg(`/projects/${pid}/pool`, "ok", r.message));
}

export async function advanceFromForm(issueId: string, formData: FormData) {
  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  const pid = issue?.projectId ?? "";
  const nextAssigneeId = String(formData.get("nextAssigneeId") ?? "");
  const r = await advanceWorkflow(issueId, nextAssigneeId);
  if ("error" in r && r.error) {
    redirect(withMsg(`/projects/${pid}/board`, "err", r.error));
  }
  redirect(withMsg(`/projects/${pid}/board`, "ok", r.message));
}

export async function moveIssueForm(issueId: string, formData: FormData) {
  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  const pid = issue?.projectId ?? "";
  const phase = issue?.phase ?? "BACKLOG";
  const direction = String(formData.get("direction") ?? "up") === "down" ? "down" : "up";
  const r = await moveIssue(issueId, direction);
  const page = phase === "ACTIVE" ? "board" : "pool";
  if ("error" in r && r.error) {
    redirect(withMsg(`/projects/${pid}/${page}`, "err", r.error));
  }
  redirect(withMsg(`/projects/${pid}/${page}`, "ok", r.message));
}

export async function updateIssueForm(issueId: string, formData: FormData) {
  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  const pid = issue?.projectId ?? "";
  const page = issue?.phase === "ACTIVE" ? "board" : "pool";
  const r = await updateIssue(issueId, formData);
  if ("error" in r && r.error) {
    redirect(withMsg(`/projects/${pid}/issues/${issueId}/edit`, "err", r.error));
  }
  redirect(withMsg(`/projects/${pid}/${page}`, "ok", r.message));
}

export async function updateIssuePresentationForm(issueId: string, formData: FormData) {
  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  const pid = issue?.projectId ?? "";
  const phase = issue?.phase ?? "BACKLOG";
  const r = await updateIssuePresentation(issueId, formData);
  if ("error" in r && r.error) {
    redirect(withMsg(`/projects/${pid}/${phase === "ACTIVE" ? "board" : "pool"}`, "err", r.error));
  }
  redirect(withMsg(`/projects/${pid}/${phase === "ACTIVE" ? "board" : "pool"}`, "ok", r.message));
}
