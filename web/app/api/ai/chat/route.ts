import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { chatCompletion, isAIConfigured } from "@/lib/ai";
import { isPlatformAdmin } from "@/lib/platform-role";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (!isAIConfigured()) {
    return NextResponse.json({ error: "AI 未配置" }, { status: 503 });
  }

  const body = await req.json();
  const message = String(body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
  }

  const user = session.user;
  const isAdmin = isPlatformAdmin(user.globalRole);

  // 构建上下文：用户可见的项目和统计
  const projectWhere = isAdmin
    ? { status: "ACTIVE" as const }
    : { status: "ACTIVE" as const, members: { some: { userId: user.id } } };

  const projects = await prisma.project.findMany({
    where: projectWhere,
    select: { id: true, name: true },
  });

  const projectIds = projects.map((p) => p.id);

  const issueStats = projectIds.length > 0
    ? await prisma.issue.groupBy({
        by: ["projectId", "phase"],
        where: { projectId: { in: projectIds } },
        _count: true,
      })
    : [];

  const myActiveCount = await prisma.issue.count({
    where: {
      assigneeId: user.id,
      phase: "ACTIVE",
      ...(projectIds.length ? { projectId: { in: projectIds } } : {}),
    },
  });

  // 构建项目摘要
  const projectSummaries = projects.map((p) => {
    const stats = issueStats.filter((s) => s.projectId === p.id);
    const backlog = stats.find((s) => s.phase === "BACKLOG")?._count ?? 0;
    const active = stats.find((s) => s.phase === "ACTIVE")?._count ?? 0;
    const closed = stats.find((s) => s.phase === "CLOSED")?._count ?? 0;
    return `- ${p.name}: 需求池 ${backlog}, 研发中 ${active}, 已关闭 ${closed}`;
  });

  const systemPrompt = `你是 PMO 项目管理平台的 AI 助手。当前用户：${user.name || user.email}（${user.globalRole}）。

用户可见的项目数据：
${projectSummaries.join("\n") || "暂无项目"}

用户当前承接的研发中需求：${myActiveCount} 条

请根据用户的问题，基于以上数据给出简洁有用的回答。
- 如果用户问的数据超出上述范围，说明你只能看到用户有权限的数据。
- 回答用中文，简洁直接。
- 如果用户想创建需求或执行操作，告诉他们具体的操作路径（如"请前往 项目 → XX项目 → 需求池 添加"）。`;

  try {
    const reply = await chatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ], { temperature: 0.5, maxTokens: 512 });

    return NextResponse.json({ reply });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI 调用失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
