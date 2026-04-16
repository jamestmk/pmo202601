import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";
import { Flash } from "@/components/Flash";
import { Toast } from "@/components/Toast";
import { createProjectForm } from "@/lib/actions/projects";
import { ProjectsView } from "@/components/ProjectsView";

type Search = { err?: string; ok?: string };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const { err, ok } = await searchParams;

  const user = session.user;
  const isAdmin = user.globalRole === "ADMIN";
  const where = isAdmin
    ? {}
    : { members: { some: { userId: user.id } } };

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { owner: true },
  });

  return (
    <>
      <Nav />
      <Toast message={ok} tone="success" />
      <Toast message={err} tone="error" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">项目</h1>
            <p className="mt-1 text-sm text-zinc-500">
              进入项目后可使用需求池、研发看板与设置
            </p>
          </div>
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
            ← 总看板
          </Link>
        </div>

        <Flash message={err} />

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-900">新建项目</h2>
          <form action={createProjectForm} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600">名称</span>
              <input
                name="name"
                required
                className="rounded-md border border-zinc-300 px-3 py-2"
                placeholder="例如：移动端 2.0"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="text-zinc-600">描述（可选）</span>
              <input
                name="description"
                className="rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              创建
            </button>
          </form>
        </section>

        <div className="mt-8">
          <ProjectsView projects={projects} isAdmin={isAdmin} />
        </div>
      </main>
    </>
  );
}
