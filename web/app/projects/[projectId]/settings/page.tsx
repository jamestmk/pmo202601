import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";
import { Flash } from "@/components/Flash";
import { Toast } from "@/components/Toast";
import { getMembership, canManageWorkflow } from "@/lib/access";
import {
  addWorkflowStatusForm,
  deleteWorkflowStatusForm,
  addProjectMemberForm,
  updateProjectOwnerForm,
} from "@/lib/actions/projects";

type Params = { projectId: string };
type Search = { err?: string; ok?: string };

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const { projectId } = await params;
  const { err, ok } = await searchParams;

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

  const canWorkflow = canManageWorkflow(user.globalRole, member);

  const [statuses, members, allUsers] = await Promise.all([
    prisma.workflowStatus.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { user: { email: "asc" } },
    }),
    user.globalRole === "ADMIN"
      ? prisma.user.findMany({ orderBy: { email: "asc" } })
      : Promise.resolve([] as Awaited<ReturnType<typeof prisma.user.findMany>>),
  ]);

  const memberIds = new Set(members.map((m) => m.userId));

  return (
    <>
      <Nav />
      <Toast message={ok} tone="success" />
      <Toast message={err} tone="error" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <p className="text-sm text-zinc-500">
          <Link href={`/projects/${projectId}`} className="hover:text-zinc-800">
            {project.name}
          </Link>
          <span className="mx-1">/</span>
          <span>设置</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">项目设置</h1>

        <Flash message={err} />

        {user.globalRole === "ADMIN" ? (
          <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium text-zinc-900">项目 owner</h2>
            <p className="mt-1 text-xs text-zinc-500">
              可随时调整项目负责人，留空表示暂不设置。
            </p>
            <form
              action={updateProjectOwnerForm.bind(null, projectId)}
              className="mt-4 flex flex-wrap items-end gap-3"
            >
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-600">负责人</span>
                <select
                  name="ownerId"
                  defaultValue={project.ownerId ?? ""}
                  className="min-w-[16rem] rounded-md border border-zinc-300 px-3 py-2"
                >
                  <option value="">暂不设置</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                保存 owner
              </button>
            </form>
          </section>
        ) : null}

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-900">研发状态（顺序即看板列序）</h2>
          <p className="mt-1 text-xs text-zinc-500">
            需求池转入开发会落到名为「开发中」的列；请确保存在该名称。
          </p>
          {canWorkflow ? (
            <form
              action={addWorkflowStatusForm.bind(null, projectId)}
              className="mt-4 flex flex-wrap items-end gap-2"
            >
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-600">新状态名称</span>
                <input
                  name="name"
                  required
                  placeholder="例如：测试中"
                  className="rounded-md border border-zinc-300 px-3 py-2"
                />
              </label>
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                添加
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">仅项目经理或管理员可编辑。</p>
          )}

          <ul className="mt-6 divide-y divide-zinc-100 border-t border-zinc-100">
            {statuses.map((s, i) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 py-3 text-sm"
              >
                <span>
                  <span className="text-zinc-400">{i + 1}.</span>{" "}
                  <span className="font-medium text-zinc-900">{s.name}</span>
                </span>
                {canWorkflow ? (
                  <form action={deleteWorkflowStatusForm.bind(null, s.id)}>
                    <button
                      type="submit"
                      className="text-xs text-red-600 hover:underline"
                    >
                      删除
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {user.globalRole === "ADMIN" ? (
          <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium text-zinc-900">项目成员</h2>
            <form
              action={addProjectMemberForm.bind(null, projectId)}
              className="mt-4 flex flex-wrap items-end gap-3"
            >
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-600">用户</span>
                <select
                  name="userId"
                  required
                  className="min-w-[14rem] rounded-md border border-zinc-300 px-3 py-2"
                >
                  <option value="">选择</option>
                  {allUsers
                    .filter((u) => !memberIds.has(u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-600">角色</span>
                <select
                  name="role"
                  className="rounded-md border border-zinc-300 px-3 py-2"
                  defaultValue="MEMBER"
                >
                  <option value="MEMBER">成员</option>
                  <option value="PM">项目经理</option>
                </select>
              </label>
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                加入项目
              </button>
            </form>
            <ul className="mt-6 text-sm text-zinc-700">
              {members.map((m) => (
                <li key={m.userId} className="border-t border-zinc-100 py-2">
                  {m.user.name || m.user.email}
                  <span className="ml-2 text-xs text-zinc-500">
                    {m.role === "PM" ? "项目经理" : "成员"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}
