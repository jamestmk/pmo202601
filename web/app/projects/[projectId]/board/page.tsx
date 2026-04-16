import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";
import { Flash } from "@/components/Flash";
import { Toast } from "@/components/Toast";
import {
  getMembership,
} from "@/lib/access";
import { DragSortableBoard } from "@/components/DragSortableBoard";
import {
  CARD_COLOR_OPTIONS,
  cardTintClass,
  colorDotClass,
  priorityLabel,
  priorityTagClass,
} from "@/lib/priority";
import { advanceFromForm, updateIssuePresentationForm, moveIssueForm } from "@/lib/actions/issues";

type Params = { projectId: string };
type Search = { err?: string; ok?: string; density?: string };

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const { projectId } = await params;
  const { err, ok, density } = await searchParams;
  const compact = density === "compact";

  const user = session.user;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { owner: true },
  });
  if (!project) notFound();

  const member =
    user.globalRole === "ADMIN"
      ? null
      : await getMembership(projectId, user.id);
  if (user.globalRole !== "ADMIN" && !member) notFound();

  const [statuses, issues, members] = await Promise.all([
    prisma.workflowStatus.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.issue.findMany({
      where: { projectId, phase: "ACTIVE" },
      include: {
        assignee: true,
        workflowStatus: true,
        requester: true,
      },
      orderBy: [{ isFlagged: "desc" }, { sortOrder: "asc" }, { priority: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { user: { email: "asc" } },
    }),
  ]);

  const byStatus = new Map<string, typeof issues>();
  for (const s of statuses) byStatus.set(s.id, []);
  for (const issue of issues) {
    if (issue.workflowStatusId && byStatus.has(issue.workflowStatusId)) {
      byStatus.get(issue.workflowStatusId)!.push(issue);
    }
  }

  const statusIndex = (id: string) =>
    statuses.findIndex((s) => s.id === id);
  const isLast = (id: string) => statusIndex(id) >= statuses.length - 1;

  return (
    <>
      <Nav />
      <Toast message={ok} tone="success" />
      <Toast message={err} tone="error" />
      <main className="mx-auto w-full max-w-[96rem] flex-1 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-500">
              <Link href={`/projects/${projectId}`} className="hover:text-zinc-800">
                {project.name}
              </Link>
              <span className="mx-1">/</span>
              <span>研发看板</span>
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900">研发看板</h1>
            <p className="mt-1 text-sm text-zinc-500">
              项目成员可流转到下一列，并指定下一承接人
              {project.owner ? ` · 项目负责人：${project.owner.name || project.owner.email}` : ""}
            </p>
          </div>
          <Link
            href={`/projects/${projectId}/board${compact ? "" : "?density=compact"}`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            {compact ? "标准卡片" : "紧凑卡片"}
          </Link>
        </div>

        <Flash message={err} />

        {statuses.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
            尚未配置研发状态。请项目经理在
            <Link
              href={`/projects/${projectId}/settings`}
              className="text-zinc-900 underline"
            >
              项目设置
            </Link>
            中添加。
          </p>
        ) : (
          <DragSortableBoard
            projectId={projectId}
            phase="ACTIVE"
            compact={compact}
            columns={statuses.map((status) => ({
              id: status.id,
              title: status.name,
              issues: (byStatus.get(status.id) ?? []).map((issue) => ({
                id: issue.id,
                title: issue.title,
                priority: issue.priority,
                isFlagged: issue.isFlagged,
                cardColor: issue.cardColor,
                assigneeName: issue.assignee ? issue.assignee.name || issue.assignee.email : "—",
              })),
            }))}
          />

          <details className="mt-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer list-none text-sm font-medium text-zinc-700">
              展开详细操作
            </summary>
            <div className="mt-4 flex gap-4 overflow-x-auto pb-4">
            {statuses.map((s) => (
              <div
                key={s.id}
                className="w-80 shrink-0 rounded-xl border border-zinc-200 bg-zinc-100/80 p-3"
              >
                <h2 className="border-b border-zinc-200 pb-2 text-sm font-semibold text-zinc-800">
                  {s.name}
                </h2>
                <ul className="mt-3 space-y-3">
                  {(byStatus.get(s.id) ?? []).map((issue) => {
                    const canMove =
                      !isLast(s.id) &&
                      (user.globalRole === "ADMIN" || !!member);
                    return (
                      <li
                        key={issue.id}
                        className={`rounded-lg border p-3 shadow-sm ${cardTintClass(issue.cardColor)}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${priorityTagClass(issue.priority)}`}>
                                {priorityLabel(issue.priority)}
                              </span>
                              {issue.isFlagged ? (
                                <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                                  旗标
                                </span>
                              ) : null}
                              <span className={`inline-block size-2.5 rounded-full ${colorDotClass(issue.cardColor)}`} />
                            </div>
                            <p className={`mt-2 font-medium text-zinc-900 ${compact ? "text-sm" : "text-base"}`}>
                              {issue.title}
                            </p>
                            {!compact && issue.assignee ? (
                              <p className="mt-1 text-xs text-zinc-500">
                                承接：{issue.assignee.name || issue.assignee.email}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 border-t border-black/5 pt-3">
                          <Link
                            href={`/projects/${projectId}/issues/${issue.id}/edit`}
                            className="rounded border border-zinc-300 px-2 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
                          >
                            编辑需求
                          </Link>
                          <form action={moveIssueForm.bind(null, issue.id)}>
                            <input type="hidden" name="direction" value="up" />
                            <button type="submit" className="rounded border border-zinc-300 px-2 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50">
                              上移
                            </button>
                          </form>
                          <form action={moveIssueForm.bind(null, issue.id)}>
                            <input type="hidden" name="direction" value="down" />
                            <button type="submit" className="rounded border border-zinc-300 px-2 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50">
                              下移
                            </button>
                          </form>
                        </div>

                        <form
                          action={updateIssuePresentationForm.bind(null, issue.id)}
                          className="mt-3 grid gap-2 border-t border-black/5 pt-3"
                        >
                          <div className="grid grid-cols-3 gap-2">
                            <select name="priority" defaultValue={issue.priority} className="rounded border border-zinc-300 px-2 py-1.5 text-sm">
                              {[0,1,2,3].map((value) => (
                                <option key={value} value={value}>P{value}</option>
                              ))}
                            </select>
                            <select name="cardColor" defaultValue={issue.cardColor} className="rounded border border-zinc-300 px-2 py-1.5 text-sm">
                              {CARD_COLOR_OPTIONS.map((color) => (
                                <option key={color} value={color}>{color}</option>
                              ))}
                            </select>
                            <label className="flex items-center justify-center gap-2 rounded border border-zinc-300 px-2 py-1.5 text-xs text-zinc-700">
                              <input type="checkbox" name="isFlagged" defaultChecked={issue.isFlagged} className="size-4 rounded border-zinc-300" />
                              旗标
                            </label>
                          </div>
                          <button type="submit" className="rounded border border-zinc-300 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50">
                            更新卡片
                          </button>
                        </form>

                        {canMove ? (
                          <form
                            action={advanceFromForm.bind(null, issue.id)}
                            className="mt-3 flex flex-col gap-2 border-t border-black/5 pt-3"
                          >
                            <label className="text-xs text-zinc-600">
                              下一承接人
                              <select
                                name="nextAssigneeId"
                                required
                                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                              >
                                <option value="">选择</option>
                                {members.map((m) => (
                                  <option key={m.userId} value={m.userId}>
                                    {m.user.name || m.user.email}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="submit"
                              className="rounded bg-zinc-900 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                            >
                              流转下一状态
                            </button>
                          </form>
                        ) : isLast(s.id) ? (
                          <p className="mt-3 border-t border-black/5 pt-3 text-xs text-zinc-400">已至末列</p>
                        ) : (
                          <p className="mt-3 border-t border-black/5 pt-3 text-xs text-zinc-400">
                            无流转权限
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            </div>
          </details>
        )}
      </main>
    </>
  );
}
