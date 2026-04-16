"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { GlobalRole } from "@prisma/client";
import { requireAdmin } from "@/lib/access";
import { isPlatformAdmin, parsePlatformRole, platformRoleLabel } from "@/lib/platform-role";
import { createOperationLog } from "@/lib/operation-log";

function withMsg(path: string, key: "ok" | "err", message: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}`;
}

export async function createUser(formData: FormData) {
  try {
    const user = await requireAdmin();
    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim() || null;
    if (!email || !password) return { error: "邮箱与密码必填" };
    if (password.length < 6) return { error: "密码至少 6 位" };

    const globalRole = parsePlatformRole(
      String(formData.get("globalRole") ?? "DEVELOPER"),
    );

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: { email, passwordHash, name, globalRole },
    });

    await createOperationLog({
      actorUserId: user.id,
      action: "user.create",
      targetType: "User",
      targetId: created.id,
      summary: `创建用户 ${created.name || created.email}，身份：${platformRoleLabel(created.globalRole)}`,
    });

    revalidatePath("/admin/users");
    return { ok: true as const, message: "用户已创建" };
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return { error: "该邮箱已存在" };
    }
    return { error: e instanceof Error ? e.message : "创建失败" };
  }
}

export async function createUserForm(formData: FormData) {
  const r = await createUser(formData);
  if ("error" in r && r.error) {
    redirect(withMsg("/admin/users", "err", r.error));
  }
  redirect(withMsg("/admin/users", "ok", r.message!));
}

export async function updateUserGlobalRole(
  targetUserId: string,
  nextRole: GlobalRole,
) {
  try {
    const user = await requireAdmin();
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target) return { error: "用户不存在" };
    if (target.globalRole === nextRole) {
      return { ok: true as const, message: "身份未变化" };
    }

    if (isPlatformAdmin(target.globalRole) && !isPlatformAdmin(nextRole)) {
      const adminCount = await prisma.user.count({
        where: { globalRole: "ADMIN" },
      });
      if (adminCount < 2) {
        return { error: "至少需要保留一名管理员" };
      }
    }

    const previousRole = target.globalRole;
    await prisma.user.update({
      where: { id: targetUserId },
      data: { globalRole: nextRole },
    });

    await createOperationLog({
      actorUserId: user.id,
      action: "user.update_global_role",
      targetType: "User",
      targetId: target.id,
      summary: `将用户 ${target.name || target.email} 的身份从「${platformRoleLabel(previousRole)}」改为「${platformRoleLabel(nextRole)}」`,
    });

    revalidatePath("/admin/users");
    return { ok: true as const, message: "平台身份已更新" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "更新失败" };
  }
}

export async function updateUserGlobalRoleForm(
  targetUserId: string,
  formData: FormData,
) {
  const nextRole = parsePlatformRole(
    String(formData.get("globalRole") ?? "DEVELOPER"),
  );
  const r = await updateUserGlobalRole(targetUserId, nextRole);
  if ("error" in r && r.error) {
    redirect(withMsg("/admin/users", "err", r.error));
  }
  redirect(withMsg("/admin/users", "ok", r.message!));
}
