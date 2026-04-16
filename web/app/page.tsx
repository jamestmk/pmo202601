import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";
import {
  aggregateMetrics,
  rowsForProject,
  SHIPPED_STATUS_NAME,
} from "@/lib/dashboard-metrics";
import { colorDotClass, priorityLabel, priorityTagClass } from "@/lib/priority";

type Search = { density?: string };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const { density } = await searchParams;
  const compact = density === "compact";

  const user = session.user;
  const where =
    user.globalRole === "ADMIN"
      ? { status: "ACTIVE" as const }
      : {
          status: "ACTIVE" as const,
          members: { some: { userId: user.id } },
        };

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { owner: true },
  });

  const ids = projects.map((p) => p.id);

  const statRows =
    ids.length > 0
      ? await prisma.issue.findMany({
          where: { projectId: { in: ids } },
          select: {
            projectId: true,
            phase: true,
            priority: true,
            isFlagged: true,
            title: true,
            cardColor: true,
            workflowStatus: { select: { name: true } },
          },
          orderBy: [
            { isFlagged: "desc" },
            { priority: "asc" },
            { updatedAt: "desc" },
          ],
        }).then((list) =>
          list.map((r) => ({
            projectId: r.projectId,
            phase: r.phase,
            priority: r.priority,
            isFlagged: r.isFlagged,
            title: r.title,
            cardColor: r.cardColor,
            workflowStatusName: r.workflowStatus?.name ?? null,
          })),
        )
      : [];

  const overall = aggregateMetrics(statRows);

  const mineActive = await prisma.issue.count({
    where: {
      phase: "ACTIVE",
      assigneeId: user.id,
      projectId: ids.length ? { in: ids } : undefined,
    },
  });

  const mineBacklog = await prisma.issue.count({
    where: {
      phase: "BACKLOG",
      requesterId: user.id,
      projectId: ids.length ? { in: ids } : undefined,
    },
  });

  function rateLabel(p: number | null, empty: string) {
    if (p === null) return empty;
    return `${p}%`;
  }

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">总看板</h1>
            <p className="mt-1 text-sm text-zinc-500">
              需求池、研发进度与交付完成率（「{SHIPPED_STATUS_NAME}」列计为已交付）
            </p>
          </div>
          <Link
            href={`/${compact ? "" : "?density=compact"}`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            {compact ? "标准总视图" : "紧凑总视图"}
          </Link>
        </div>

        {ids.length > 0 ? (
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-zinc-500">总需求（录入）</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
                {overall.total}
              </p>
              <p className="mt-1 text-xs text-zinc-500">含需求池、研发中与已结案</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-zinc-500">已上线（交付）</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-emerald-700">
                {overall.shipped}
              </p>
              <p className="mt-1 text-xs text-zinc-500">占全部 {rateLabel(overall.shippedOverTotalPercent, "—")}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-zinc-500">交付完成率（研发闭环）</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
                {rateLabel(overall.deliveryRatePercent, "—")}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                已上线 ÷ 已进入研发（{overall.shipped}+{overall.inDev}={overall.inPipeline}）
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-zinc-500">结构快照</p>
              <dl className="mt-2 space-y-1 text-sm text-zinc-700">
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">需求池</dt>
                  <dd className="tabular-nums font-medium">{overall.backlog}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">研发中（未上线）</dt>
                  <dd className="tabular-nums font-medium">{overall.inDev}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">已关闭</dt>
                  <dd className="tabular-nums font-medium">{overall.closed}</dd>
                </div>
              </dl>
            </div>
          </section>
        ) : null}

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium text-zinc-500">与我相关</h2>
            <dl className="mt-3 flex gap-8 text-zinc-900">
              <div>
                <dt className="text-xs text-zinc-500">我提出的（池中）</dt>
                <dd className="text-2xl font-semibold tabular-nums">{mineBacklog}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">我承接的（研发中）</dt>
                <dd className="text-2xl font-semibold tabular-nums">{mineActive}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-medium text-zinc-900">按项目</h2>
          <ul className={`mt-4 grid gap-4 ${compact ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
            {projects.length === 0 ? (
              <li className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
                暂无可见项目。请管理员将你加入项目，或前往
                <Link href="/projects" className="text-zinc-900 underline">
                  项目列表
                </Link>
                。
              </li>
            ) : (
              projects.map((p) => {
                const m = aggregateMetrics(rowsForProject(statRows, p.id));
                const projectIssues = statRows.filter((row) => row.projectId === p.id);
                const flaggedCount = projectIssues.filter((row) => row.isFlagged).length;
                const p0Count = projectIssues.filter((row) => row.priority === 0).length;
                const spotlight = projectIssues.slice(0, compact ? 2 : 3);
                return (
                  <li
                    key={p.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/projects/${p.id}`}
                          className="font-medium text-zinc-900 hover:underline"
                        >
                          {p.name}
                        </Link>
                        {p.description && !compact ? (
                          <p className="mt-0.5 text-sm text-zinc-500">{p.description}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          {p.owner ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">
                              Owner：{p.owner.name || p.owner.email}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                            旗标 {flaggedCount}
                          </span>
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                            P0 {p0Count}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-right text-xs text-zinc-600 sm:grid-cols-6">
                        <span>总 <strong className="tabular-nums text-zinc-900">{m.total}</strong></span>
                        <span>池 <strong className="tabular-nums text-zinc-900">{m.backlog}</strong></span>
                        <span>研发 <strong className="tabular-nums text-zinc-900">{m.inDev}</strong></span>
                        <span>上线 <strong className="tabular-nums text-emerald-700">{m.shipped}</strong></span>
                        <span>关闭 <strong className="tabular-nums text-zinc-900">{m.closed}</strong></span>
                        <span>交付率 <strong className="tabular-nums text-zinc-900">{rateLabel(m.deliveryRatePercent, "—")}</strong></span>
                      </div>
                    </div>

                    {spotlight.length > 0 ? (
                      <div className="mt-4 border-t border-zinc-100 pt-4">
                        <p className="text-xs font-medium text-zinc-500">重点卡片</p>
                        <ul className="mt-2 space-y-2">
                          {spotlight.map((issue, index) => (
                            <li key={`${p.id}-${issue.title}-${index}`} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2">
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${priorityTagClass(issue.priority)}`}>
                                {priorityLabel(issue.priority)}
                              </span>
                              {issue.isFlagged ? (
                                <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white">
                                  旗标
                                </span>
                              ) : null}
                              <span className={`inline-block size-2.5 rounded-full ${colorDotClass(issue.cardColor)}`} />
                              <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">
                                {issue.title}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </main>
    </>
  );
}
