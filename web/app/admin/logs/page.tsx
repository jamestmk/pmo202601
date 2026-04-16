import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { isPlatformAdmin } from "@/lib/platform-role";

type Search = { err?: string; ok?: string };

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  if (!isPlatformAdmin(session.user.globalRole)) {
    redirect("/");
  }

  const { err, ok } = await searchParams;
  const logs = await prisma.operationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: true,
      project: true,
    },
  });

  return (
    <>
      <Nav />
      <Toast message={ok} tone="success" />
      <Toast message={err} tone="error" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">操作记录</h1>
            <p className="mt-1 text-sm text-zinc-500">
              管理员可查看全站最近 200 条关键操作
            </p>
          </div>
          <Link href="/admin/users" className="text-sm text-zinc-600 hover:text-zinc-900">
            返回用户管理
          </Link>
        </div>

        <section className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {logs.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-500">
              暂无操作记录
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {logs.map((log) => (
                <li key={log.id} className="px-5 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900">
                        {log.summary}
                      </p>
                      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <div>
                          <dt className="inline">操作人：</dt>
                          <dd className="inline">
                            {log.actor.name || log.actor.email}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline">动作：</dt>
                          <dd className="inline">{log.action}</dd>
                        </div>
                        <div>
                          <dt className="inline">对象：</dt>
                          <dd className="inline">{log.targetType}</dd>
                        </div>
                        <div>
                          <dt className="inline">项目：</dt>
                          <dd className="inline">
                            {log.project?.name || "—"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <div className="shrink-0 text-xs text-zinc-400">
                      {formatTime(log.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
