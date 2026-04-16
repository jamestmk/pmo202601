"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

const TEST_USERS = [
  { email: "admin@local.test", password: "admin123", name: "老板（管理员）", role: "ADMIN", color: "bg-red-500" },
  { email: "pm@local.test", password: "test123", name: "张项目经理", role: "PROJECT_MANAGER", color: "bg-orange-500" },
  { email: "pd@local.test", password: "test123", name: "李产品经理", role: "PRODUCT_MANAGER", color: "bg-yellow-500" },
  { email: "dev@local.test", password: "test123", name: "王开发", role: "DEVELOPER", color: "bg-green-500" },
  { email: "dev2@local.test", password: "test123", name: "赵前端", role: "DEVELOPER", color: "bg-emerald-500" },
  { email: "tester@local.test", password: "test123", name: "孙测试", role: "TESTER", color: "bg-blue-500" },
  { email: "lead@local.test", password: "test123", name: "周标注组长", role: "ANNOTATOR_LEAD", color: "bg-purple-500" },
  { email: "ann@local.test", password: "test123", name: "吴标注员", role: "ANNOTATOR", color: "bg-pink-500" },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "管理员",
  PROJECT_MANAGER: "项目经理",
  PRODUCT_MANAGER: "产品经理",
  DEVELOPER: "开发",
  TESTER: "测试",
  ANNOTATOR_LEAD: "标注组长",
  ANNOTATOR: "标注员",
};

const PAGES = [
  { label: "总看板", path: "/" },
  { label: "项目列表", path: "/projects" },
  { label: "薪资", path: "/salary" },
  { label: "用户管理", path: "/admin/users" },
  { label: "操作记录", path: "/admin/logs" },
];

export default function PlaygroundPage() {
  const { data: session, status } = useSession();
  const [switching, setSwitching] = useState(false);
  const [iframeSrc, setIframeSrc] = useState("/");
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/pmo2026";

  const currentUser = session?.user;
  const currentEmail = currentUser?.email;

  async function switchTo(email: string, password: string) {
    setSwitching(true);
    try {
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      window.location.reload();
    } catch {
      setSwitching(false);
    }
  }

  async function handleLogout() {
    await signOut({ redirect: false });
    window.location.reload();
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <p className="text-zinc-500">加载中…</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-100 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">PMO 角色体验测试台</h1>
          <p className="mt-2 text-sm text-zinc-500">选择一个角色快速登录，体验不同视角</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TEST_USERS.map((u) => (
            <button
              key={u.email}
              onClick={() => switchTo(u.email, u.password)}
              disabled={switching}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:border-zinc-300 hover:shadow-md disabled:opacity-50"
            >
              <span className={`size-3 rounded-full ${u.color}`} />
              <div className="text-left">
                <p className="text-sm font-medium text-zinc-900">{u.name}</p>
                <p className="text-xs text-zinc-500">{ROLE_LABEL[u.role]}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const activeUser = TEST_USERS.find((u) => u.email === currentEmail);

  return (
    <div className="flex h-screen flex-col bg-zinc-100">
      {/* 顶部控制栏 */}
      <div className="shrink-0 border-b border-zinc-300 bg-white px-4 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-sm font-bold text-zinc-900">🧪 角色体验测试台</h1>
          <span className="text-xs text-zinc-400">|</span>

          {/* 当前用户 */}
          <div className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${activeUser?.color ?? "bg-zinc-400"}`} />
            <span className="text-sm font-medium text-zinc-900">
              {currentUser.name || currentEmail}
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
              {ROLE_LABEL[(currentUser as any).globalRole] ?? "未知"}
            </span>
          </div>

          <span className="text-xs text-zinc-400">|</span>

          {/* 快速切换 */}
          <div className="flex flex-wrap gap-1">
            {TEST_USERS.map((u) => (
              <button
                key={u.email}
                onClick={() => switchTo(u.email, u.password)}
                disabled={switching || u.email === currentEmail}
                className={`rounded-md px-2 py-1 text-xs transition ${
                  u.email === currentEmail
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                } disabled:opacity-50`}
                title={`${u.name} (${ROLE_LABEL[u.role]})`}
              >
                {u.name.slice(0, 3)}
              </button>
            ))}
          </div>

          <span className="text-xs text-zinc-400">|</span>

          {/* 页面导航 */}
          <div className="flex flex-wrap gap-1">
            {PAGES.map((p) => (
              <button
                key={p.path}
                onClick={() => setIframeSrc(p.path)}
                className={`rounded-md px-2 py-1 text-xs ${
                  iframeSrc === p.path
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="ml-auto rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
          >
            退出
          </button>
        </div>
      </div>

      {/* iframe 展示区 */}
      <div className="flex-1">
        <iframe
          key={`${currentEmail}-${iframeSrc}`}
          src={`${basePath}${iframeSrc}`}
          className="h-full w-full border-0"
          title="PMO Preview"
        />
      </div>
    </div>
  );
}
