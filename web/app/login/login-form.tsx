"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function messageForAuthError(code: string | null) {
  if (code === "CredentialsSignin") return "邮箱或密码错误";
  if (code === "Configuration") return "登录服务配置异常，请联系管理员";
  if (code) return "登录失败，请重试";
  return null;
}

function LoginFormInner() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const urlError = messageForAuthError(searchParams.get("error"));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/",
      redirect: true,
    });
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-center text-xl font-semibold text-zinc-900">登录</h1>
      <p className="mt-1 text-center text-sm text-zinc-500">内部项目管理平台</p>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        {urlError ? (
          <p className="text-sm text-red-600" role="alert">
            {urlError}
          </p>
        ) : null}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">邮箱</span>
          <input
            className="rounded-md border border-zinc-300 px-3 py-2"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">密码</span>
          <input
            className="rounded-md border border-zinc-300 px-3 py-2"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-md bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          进入
        </button>
      </form>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          加载…
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
