import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";
import { Flash } from "@/components/Flash";
import { Toast } from "@/components/Toast";
import { getMembership } from "@/lib/access";
import { IssueCard } from "@/components/IssueCard";
import { PoolIssueActions } from "@/components/PoolIssueActions";
import {
  CARD_COLOR_OPTIONS,
  PRIORITY_LABELS,
} from "@/lib/priority";
import {
  createPoolIssueAndRedirect,
} from "@/lib/actions/issues";

type Params = { projectId: string };
type Search = { err?: string; ok?: string; density?: string };

export default async function PoolPage({
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
  if (user.globalRole !== "ADMIN") {
    const m = await getMembership(projectId, user.id);
    if (!m) notFound();
  }

  const [issues, members] = await Promise.all([
    prisma.issue.findMany({
      where: { projectId, phase: "BACKLOG" },
      orderBy: [{ isFlagged: "desc" }, { sortOrder: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
      include: { requester: true },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { user: { email: "asc" } },
    }),
  ]);

  const closedIssues = await prisma.issue.findMany({
    where: { projectId, phase: "CLOSED" },
    orderBy: { updatedAt: "desc" },
    include: { requester: true },
    take: 5, // 只显示最近5个已关闭的需求
  });

  return (
    <>
      <Nav />
      <Toast message={ok} tone="success" />
      <Toast message={err} tone="error" />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        {/* 页面头部 */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-500">
              <Link href={`/projects/${projectId}`} className="hover:text-zinc-800">
                {project.name}
              </Link>
              <span className="mx-1">/</span>
              <span>需求池</span>
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900">需求池</h1>
            <p className="mt-1 text-sm text-zinc-500">
              成员可随时新增需求，标记优先级，转入开发或关闭
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href={`/projects/${projectId}/board`}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-50"
            >
              研发看板
            </Link>
            <Link
              href={`/projects/${projectId}/pool${compact ? "" : "?density=compact"}`}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-50"
            >
              {compact ? "标准视图" : "紧凑视图"}
            </Link>
          </div>
        </div>

        <Flash message={err} />

        {/* 新增需求表单 - 简化版 */}
        <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-base font-medium text-zinc-900">快速新增需求</h2>
          <form
            action={createPoolIssueAndRedirect.bind(null, projectId)}
            className="space-y-3"
            id="create-issue-form"
          >
            <div className="flex flex-wrap gap-3">
              <input
                name="title"
                required
                placeholder="需求标题"
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
              <select
                name="priority"
                defaultValue={2}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              >
                {PRIORITY_LABELS.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                name="cardColor"
                defaultValue="slate"
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              >
                {CARD_COLOR_OPTIONS.map((color) => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" name="isFlagged" className="size-4 rounded border-zinc-300" />
                <span>旗标</span>
              </label>
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                添加到需求池
              </button>
            </div>
            <textarea
              name="description"
              placeholder="需求描述（可选）"
              rows={2}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </form>
        </section>

        {/* 需求列表 */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-zinc-900">
              待办需求 ({issues.length})
            </h2>
          </div>

          {issues.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-zinc-300 py-12 text-center">
              <p className="text-sm text-zinc-500">需求池中暂无待办需求</p>
              <p className="mt-2 text-xs text-zinc-400">使用上方表单快速添加需求</p>
            </div>
          ) : (
            <div className={`grid gap-4 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
              {issues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  projectId={projectId}
                  compact={compact}
                  showActions={false}
                >
                  <PoolIssueActions
                    issue={issue}
                    projectId={projectId}
                    members={members}
                  />
                </IssueCard>
              ))}
            </div>
          )}
        </section>

        {/* 已关闭需求 - 折叠显示 */}
        {closedIssues.length > 0 && (
          <details className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50">
            <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
              最近关闭的需求 ({closedIssues.length})
            </summary>
            <div className="border-t p-6">
              <div className="grid gap-3">
                {closedIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded-md border bg-white p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-zinc-900 line-through">
                          {issue.title}
                        </h4>
                        {issue.closeReason && (
                          <p className="mt-1 text-sm text-zinc-500">
                            关闭原因：{issue.closeReason}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-zinc-400">
                          提出：{issue.requester.name || issue.requester.email}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        )}
      </main>
    </>
  );
}