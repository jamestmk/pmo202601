import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { getMembership } from "@/lib/access";
import { CARD_COLOR_OPTIONS, PRIORITY_LABELS } from "@/lib/priority";
import { updateIssueForm } from "@/lib/actions/issues";

type Params = { projectId: string; issueId: string };
type Search = { err?: string; ok?: string };

export default async function EditIssuePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { projectId, issueId } = await params;
  const { err, ok } = await searchParams;
  const user = session.user;

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { project: true, requester: true, assignee: true, workflowStatus: true },
  });
  if (!issue || issue.projectId !== projectId) notFound();

  if (user.globalRole !== "ADMIN") {
    const m = await getMembership(projectId, user.id);
    if (!m) notFound();
  }

  const backHref = `/projects/${projectId}/${issue.phase === "ACTIVE" ? "board" : "pool"}`;

  return (
    <>
      <Nav />
      <Toast message={ok} tone="success" />
      <Toast message={err} tone="error" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <p className="text-sm text-zinc-500">
          <Link href={backHref} className="hover:text-zinc-800">
            {issue.project.name}
          </Link>
          <span className="mx-1">/</span>
          <span>编辑需求</span>
        </p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">编辑需求</h1>
            <p className="mt-1 text-sm text-zinc-500">
              当前状态：{issue.phase === "ACTIVE" ? issue.workflowStatus?.name || "研发中" : "需求池"}
            </p>
          </div>
          <Link href={backHref} className="text-sm text-zinc-600 hover:text-zinc-900">
            返回
          </Link>
        </div>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <form action={updateIssueForm.bind(null, issue.id)} className="grid gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600">标题</span>
              <input
                name="title"
                required
                defaultValue={issue.title}
                className="rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600">描述</span>
              <textarea
                name="description"
                rows={5}
                defaultValue={issue.description ?? ""}
                className="rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-600">优先级</span>
                <select name="priority" defaultValue={issue.priority} className="rounded-md border border-zinc-300 px-3 py-2">
                  {PRIORITY_LABELS.map((label, i) => (
                    <option key={label} value={i}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-600">卡片颜色</span>
                <select name="cardColor" defaultValue={issue.cardColor} className="rounded-md border border-zinc-300 px-3 py-2">
                  {CARD_COLOR_OPTIONS.map((color) => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" name="isFlagged" defaultChecked={issue.isFlagged} className="size-4 rounded border-zinc-300" />
              <span>旗标需求</span>
            </label>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              <p>提出人：{issue.requester.name || issue.requester.email}</p>
              {issue.assignee ? <p className="mt-1">当前承接：{issue.assignee.name || issue.assignee.email}</p> : null}
            </div>

            <button
              type="submit"
              className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              保存需求
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
