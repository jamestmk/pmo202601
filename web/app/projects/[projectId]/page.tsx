import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";
import { getMembership } from "@/lib/access";

type Params = { projectId: string };

export default async function ProjectHubPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const { projectId } = await params;

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

  const backlog = await prisma.issue.count({
    where: { projectId, phase: "BACKLOG" },
  });
  const active = await prisma.issue.count({
    where: { projectId, phase: "ACTIVE" },
  });
  const flagged = await prisma.issue.count({
    where: { projectId, isFlagged: true },
  });

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <p className="text-sm text-zinc-500">
          <Link href="/projects" className="hover:text-zinc-800">
            项目
          </Link>
          <span className="mx-1">/</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
          {project.name}
        </h1>
        {project.description ? (
          <p className="mt-2 text-sm text-zinc-600">{project.description}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
          {project.owner ? (
            <span className="rounded-full bg-zinc-100 px-2 py-1">
              Owner：{project.owner.name || project.owner.email}
            </span>
          ) : null}
          <span className="rounded-full bg-zinc-100 px-2 py-1">旗标需求：{flagged}</span>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Link
            href={`/projects/${projectId}/pool`}
            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300"
          >
            <h2 className="font-medium text-zinc-900">需求池</h2>
            <p className="mt-2 text-3xl font-semibold text-zinc-800">
              {backlog}
            </p>
            <p className="mt-1 text-sm text-zinc-500">待转入研发或关闭</p>
          </Link>
          <Link
            href={`/projects/${projectId}/board`}
            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300"
          >
            <h2 className="font-medium text-zinc-900">研发看板</h2>
            <p className="mt-2 text-3xl font-semibold text-zinc-800">
              {active}
            </p>
            <p className="mt-1 text-sm text-zinc-500">按状态列展示</p>
          </Link>
          <Link
            href={`/projects/${projectId}/settings`}
            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300"
          >
            <h2 className="font-medium text-zinc-900">项目设置</h2>
            <p className="mt-2 text-sm text-zinc-500">
              研发状态、成员（管理员）
            </p>
          </Link>
        </div>
      </main>
    </>
  );
}
