import type { GlobalRole } from "@prisma/client";

/** 平台身份（与 Prisma `GlobalRole` 一致） */
export const PLATFORM_ROLE_ORDER: GlobalRole[] = [
  "DEVELOPER",
  "TESTER",
  "PROJECT_MANAGER",
  "PRODUCT_MANAGER",
  "ADMIN",
];

export const PLATFORM_ROLE_LABEL: Record<GlobalRole, string> = {
  DEVELOPER: "开发",
  TESTER: "测试",
  PROJECT_MANAGER: "项目经理",
  PRODUCT_MANAGER: "产品经理",
  ADMIN: "管理员",
};

export function platformRoleLabel(role: GlobalRole) {
  return PLATFORM_ROLE_LABEL[role] ?? role;
}

export function isPlatformAdmin(role: GlobalRole | undefined) {
  return role === "ADMIN";
}

const ROLE_SET = new Set<string>(PLATFORM_ROLE_ORDER);

export function parsePlatformRole(raw: string): GlobalRole {
  const v = raw.trim();
  if (ROLE_SET.has(v)) return v as GlobalRole;
  return "DEVELOPER";
}

/** 兼容旧 JWT / 脏数据 */
export function normalizeGlobalRole(raw: unknown): GlobalRole {
  if (raw === "USER") return "DEVELOPER";
  if (typeof raw === "string" && ROLE_SET.has(raw)) return raw as GlobalRole;
  return "DEVELOPER";
}
