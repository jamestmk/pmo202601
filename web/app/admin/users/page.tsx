import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";
import { Flash } from "@/components/Flash";
import { Toast } from "@/components/Toast";
import { createUserForm, updateUserGlobalRoleForm } from "@/lib/actions/admin";
import {
  PLATFORM_ROLE_ORDER,
  platformRoleLabel,
  isPlatformAdmin,
} from "@/lib/platform-role";

type Search = { err?: string; ok?: string };

export default async function AdminUsersPage({
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
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
  const adminCount = await prisma.user.count({
    where: { globalRole: "ADMIN" },
  });

  return (
    <>
      <Nav />
      <Toast message={ok} tone="success" />
      <Toast message={err} tone="error" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-zinc-900">用户管理</h1>
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
            返回看板
          </Link>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          <strong className="font-medium text-zinc-700">平台身份</strong>
          ：开发 / 测试 / 项目经理 / 产品经理 / 管理员。其中只有
          <strong className="font-medium text-zinc-700">管理员</strong>
          可管理全站用户与创建项目；项目内的「项目经理（成员角色）」仍在
          <Link href="/projects" className="text-zinc-900 underline">
            各项目设置
          </Link>
          中指定。平台身份为「项目经理」的用户在本项目中可配置研发状态、可代为流转需求（与该项目 PM 成员类似，但须已被加入该项目）。
        </p>

        <Flash message={err} />

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-900">新建用户</h2>
          <form action={createUserForm} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600">邮箱（登录名）</span>
              <input
                name="email"
                type="email"
                required
                className="rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600">显示名</span>
              <input
                name="name"
                className="rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-zinc-600">初始密码</span>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="max-w-md rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-zinc-600">平台身份</span>
              <select
                name="globalRole"
                defaultValue="DEVELOPER"
                className="max-w-md rounded-md border border-zinc-300 px-3 py-2"
              >
                {PLATFORM_ROLE_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {platformRoleLabel(r)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              创建
            </button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-medium text-zinc-900">
            用户列表与平台身份
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            修改身份后对方需重新登录后会话才会更新。系统至少保留一名管理员。
          </p>
          <ul className="mt-3 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
            {users.map((u) => {
              const isSelf = u.id === session.user.id;
              const soleAdminLock =
                isPlatformAdmin(u.globalRole) &&
                adminCount <= 1 &&
                isSelf;
              return (
                <li
                  key={u.id}
                  className="flex flex-col gap-3 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-zinc-900">
                      {u.name || u.email}
                      {isSelf ? (
                        <span className="ml-2 text-xs font-normal text-zinc-400">
                          （当前登录）
                        </span>
                      ) : null}
                    </div>
                    <div className="text-zinc-500">{u.email}</div>
                  </div>
                  <form
                    action={updateUserGlobalRoleForm.bind(null, u.id)}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <label className="flex items-center gap-2 text-xs text-zinc-600">
                      <span className="whitespace-nowrap">平台身份</span>
                      <select
                        name="globalRole"
                        defaultValue={u.globalRole}
                        disabled={soleAdminLock}
                        className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100"
                        title={
                          soleAdminLock
                            ? "仅剩一名管理员时不可在此降级自己"
                            : undefined
                        }
                      >
                        {PLATFORM_ROLE_ORDER.map((r) => (
                          <option key={r} value={r}>
                            {platformRoleLabel(r)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="submit"
                      disabled={soleAdminLock}
                      className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      保存
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </>
  );
}
