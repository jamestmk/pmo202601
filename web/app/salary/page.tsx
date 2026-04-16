import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { isPlatformAdmin, canViewSalary, platformRoleLabel } from "@/lib/platform-role";
import {
  createSalaryRecordForm,
  confirmSalaryForm,
  markSalaryPaidForm,
} from "@/lib/actions/salary";

type Search = { err?: string; ok?: string };

const STATUS_LABEL: Record<string, string> = {
  PENDING: "待审批",
  CONFIRMED: "已确认",
  PAID: "已发放",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PAID: "bg-emerald-100 text-emerald-800",
};

function formatCurrency(n: number) {
  return `¥${n.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
}

export default async function SalaryPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const { err, ok } = await searchParams;

  const user = session.user;
  const isAdmin = isPlatformAdmin(user.globalRole);
  const canManage = canViewSalary(user.globalRole);

  // 查询薪资记录
  const where = isAdmin
    ? {}
    : canManage
      ? {
          OR: [
            { recipientId: user.id },
            { project: { members: { some: { userId: user.id, role: "PM" as const } } } },
          ],
        }
      : { recipientId: user.id };

  const records = await prisma.salaryRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      recipient: true,
      project: true,
    },
  });

  // 北极星指标
  const allPaidRecords = isAdmin
    ? await prisma.salaryRecord.findMany({ where: { status: "PAID" } })
    : canManage
      ? await prisma.salaryRecord.findMany({
          where: {
            status: "PAID",
            OR: [
              { recipientId: user.id },
              { project: { members: { some: { userId: user.id, role: "PM" } } } },
            ],
          },
        })
      : await prisma.salaryRecord.findMany({
          where: { status: "PAID", recipientId: user.id },
        });

  const totalPaid = allPaidRecords.reduce((sum, r) => sum + r.amount, 0);
  const recipientCount = new Set(allPaidRecords.map((r) => r.recipientId)).size;

  // 完成需求数（用于人效计算）
  const projectIds = [...new Set(allPaidRecords.map((r) => r.projectId).filter(Boolean))] as string[];
  const completedIssues = projectIds.length > 0
    ? await prisma.issue.count({
        where: {
          projectId: { in: projectIds },
          phase: "ACTIVE",
          workflowStatus: { name: "已上线" },
        },
      })
    : 0;

  const costPerIssue = completedIssues > 0 ? totalPaid / completedIssues : null;
  const outputPerPerson = recipientCount > 0 ? completedIssues / recipientCount : null;

  // 用户列表（录入用）
  const allUsers = canManage
    ? await prisma.user.findMany({ orderBy: { email: "asc" } })
    : [];
  const allProjects = canManage
    ? await prisma.project.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <>
      <Nav />
      <Toast message={ok} tone="success" />
      <Toast message={err} tone="error" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">薪资管理</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {canManage ? "录入、审批与查看薪资发放记录" : "查看个人薪资记录"}
            </p>
          </div>
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
            ← 总看板
          </Link>
        </div>

        {/* 北极星指标 */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-zinc-500">累计发放</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-zinc-500">涉及人数</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
              {recipientCount}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-zinc-500">人均产出（已上线需求）</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
              {outputPerPerson !== null ? outputPerPerson.toFixed(1) : "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">已上线需求数 ÷ 参与人数</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-zinc-500">单需求成本</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
              {costPerIssue !== null ? formatCurrency(costPerIssue) : "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">累计发放 ÷ 已上线需求数</p>
          </div>
        </section>

        {/* 录入表单 */}
        {canManage ? (
          <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium text-zinc-900">录入薪资</h2>
            <form action={createSalaryRecordForm} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-600">发放对象</span>
                <select name="recipientId" required className="rounded-md border border-zinc-300 px-3 py-2">
                  <option value="">选择</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}（{platformRoleLabel(u.globalRole)}）
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-600">金额（¥）</span>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="rounded-md border border-zinc-300 px-3 py-2"
                  placeholder="例如：5000"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-600">关联项目（可选）</span>
                <select name="projectId" className="rounded-md border border-zinc-300 px-3 py-2">
                  <option value="">不关联</option>
                  {allProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-600">发放周期（可选）</span>
                <input
                  name="period"
                  className="rounded-md border border-zinc-300 px-3 py-2"
                  placeholder="例如：2026年4月"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="text-zinc-600">备注（可选）</span>
                <input
                  name="note"
                  className="rounded-md border border-zinc-300 px-3 py-2"
                />
              </label>
              <button
                type="submit"
                className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                录入
              </button>
            </form>
          </section>
        ) : null}

        {/* 记录列表 */}
        <section className="mt-8">
          <h2 className="text-lg font-medium text-zinc-900">薪资记录</h2>
          {records.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
              暂无薪资记录
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
              {records.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-900">
                        {r.recipient.name || r.recipient.email}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status] ?? ""}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-zinc-500">
                      <span>{formatCurrency(r.amount)}</span>
                      {r.project ? <span>项目：{r.project.name}</span> : null}
                      {r.period ? <span>周期：{r.period}</span> : null}
                      {r.note ? <span>备注：{r.note}</span> : null}
                    </div>
                  </div>
                  {isAdmin && r.status === "PENDING" ? (
                    <form action={confirmSalaryForm.bind(null, r.id)}>
                      <button type="submit" className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                        确认
                      </button>
                    </form>
                  ) : null}
                  {isAdmin && r.status === "CONFIRMED" ? (
                    <form action={markSalaryPaidForm.bind(null, r.id)}>
                      <button type="submit" className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                        标记已发放
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
