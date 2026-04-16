import Link from "next/link";
import { auth } from "@/auth";
import { logoutAction } from "@/lib/actions/auth";
import { isPlatformAdmin, platformRoleLabel } from "@/lib/platform-role";

export async function Nav() {
  const session = await auth();
  if (!session?.user) return null;

  const u = session.user;

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold text-zinc-900">
          PMO
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
          <Link href="/" className="hover:text-zinc-900">
            总看板
          </Link>
          <Link href="/projects" className="hover:text-zinc-900">
            项目
          </Link>
          {isPlatformAdmin(u.globalRole) ? (
            <>
              <Link href="/admin/users" className="hover:text-zinc-900">
                用户管理
              </Link>
              <Link href="/admin/logs" className="hover:text-zinc-900">
                操作记录
              </Link>
            </>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm text-zinc-600">
          <span
            className="truncate max-w-[14rem] text-right"
            title={u.email ?? ""}
          >
            <span className="block truncate">{u.name || u.email}</span>
            <span className="block text-xs text-zinc-400">
              {platformRoleLabel(u.globalRole)}
            </span>
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-2 py-1 text-zinc-700 hover:bg-zinc-50"
            >
              退出
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
