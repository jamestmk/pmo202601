"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

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
];

export default function PlaygroundPage() {
  const { data: session, status } = useSession();
  const [iframeSrc, setIframeSrc] = useState("/");
  const [csrfToken, setCsrfToken] = useState("");
  const [switching, setSwitching] = useState(false);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const currentUser = session?.user;
  const currentEmail = currentUser?.email;

  // Fetch CSRF token on mount
  useEffect(() => {
    fetch(`${basePath}/api/auth/csrf`)
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken || ""))
      .catch(() => {});
  }, [basePath]);

  async function loginAs(email: string, password: string) {
    if (!csrfToken || switching) return;
    setSwitching(true);

    try {
      const res = await fetch(`${basePath}/api/auth/callback/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          csrfToken,
          email,
          password,
          callbackUrl: `${basePath}/playground`,
          json: "true",
        }),
        redirect: "follow",
      });

      // Regardless of response, reload to pick up new session
      window.location.href = `${basePath}/playground`;
    } catch {
      window.location.href = `${basePath}/playground`;
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <p className="text-zinc-500">加载中…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-100">
      {/* 顶部控制栏 */}
      <div className="shrink-0 border-b border-zinc-300 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-sm font-bold text-zinc-900">🧪 角色体验测试台</h1>

          {currentUser ? (
            <>
              <span className="text-xs text-zinc-400">|</span>
              <span className="text-sm text-zinc-700">
                当前：<span className="font-medium">{currentUser.name || currentEmail}</span>
                <span className="ml-1 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                  {ROLE_LABEL[(currentUser as unknown as Record<string, string>).globalRole] ?? ""}
                </span>
              </span>
            </>
          ) : null}

          <span className="text-xs text-zinc-400">|</span>
          <span className="text-xs text-zinc-500">切换角色：</span>

          {TEST_USERS.map((u) => (
            <button
              key={u.email}
              onClick={() => loginAs(u.email, u.password)}
              disabled={switching}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition ${
                u.email === currentEmail
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              } disabled:opacity-50`}
            >
              <span className={`size-2 rounded-full ${u.color}`} />
              {u.name}
            </button>
          ))}
          {switching ? <span className="text-xs text-zinc-400">切换中…</span> : null}
        </div>

        {/* 页面导航 */}
        {currentUser ? (
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="text-xs text-zinc-500 leading-6">查看页面：</span>
            {PAGES.map((p) => (
              <button
                key={p.path}
                onClick={() => setIframeSrc(p.path)}
                className={`rounded-md px-2.5 py-1 text-xs ${
                  iframeSrc === p.path
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* 内容区 */}
      {currentUser ? (
        <iframe
          key={`${currentEmail}-${iframeSrc}`}
          src={`${basePath}${iframeSrc}`}
          className="flex-1 border-0"
          title="PMO Preview"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-zinc-700">👆 点击上方任意角色按钮登录</p>
            <p className="mt-2 text-sm text-zinc-500">登录后可在不同角色间快速切换，对比体验差异</p>
          </div>
        </div>
      )}
    </div>
  );
}
