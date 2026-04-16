import { NextResponse } from "next/server";
import { requireProjectAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { createOperationLog } from "@/lib/operation-log";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      projectId?: string;
      orderedIssueIds?: string[];
      workflowStatusId?: string | null;
      phase?: "BACKLOG" | "ACTIVE";
    };

    const projectId = String(body.projectId ?? "").trim();
    const orderedIssueIds = Array.isArray(body.orderedIssueIds)
      ? body.orderedIssueIds.map((id) => String(id))
      : [];
    const phase = body.phase === "ACTIVE" ? "ACTIVE" : "BACKLOG";
    const workflowStatusId = body.workflowStatusId ?? null;

    if (!projectId || orderedIssueIds.length === 0) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const { user } = await requireProjectAccess(projectId);
    const issues = await prisma.issue.findMany({
      where: {
        id: { in: orderedIssueIds },
        projectId,
        phase,
        workflowStatusId: phase === "ACTIVE" ? workflowStatusId : null,
      },
      select: { id: true, title: true },
    });

    if (issues.length !== orderedIssueIds.length) {
      return NextResponse.json({ error: "存在不可排序的卡片" }, { status: 400 });
    }

    await prisma.$transaction(
      orderedIssueIds.map((issueId, index) =>
        prisma.issue.update({
          where: { id: issueId },
          data: { sortOrder: index },
        }),
      ),
    );

    await createOperationLog({
      actorUserId: user.id,
      action: "issue.reorder_drag",
      projectId,
      targetType: "IssueList",
      targetId: workflowStatusId || phase,
      summary: `拖拽调整${phase === "ACTIVE" ? "研发列" : "需求池"}内卡片顺序`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "排序失败" },
      { status: 500 },
    );
  }
}
