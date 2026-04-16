import type { GlobalRole } from "@prisma/client";

/** 平台身份（与 Prisma `GlobalRole` 一致） */
export const PLATFORM_ROLE_ORDER: GlobalRole[] = [
  "ANNOTATOR",
  "ANNOTATOR_LEAD",
  "DEVELOPER",
  "TESTER",
  "PROJECT_MANAGER",
  "PRODUCT_MANAGER",
  "ADMIN",
];

export const PLATFORM_ROLE_LABEL: Record<GlobalRole, string> = {
  ANNOTATOR: "数据标注员",
  ANNOTATOR_LEAD: "数据标注组长",
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

/** 可查看薪资数据的角色（自己的 + 管辖范围的） */
export function canViewSalary(role: GlobalRole | undefined) {
  return (
    role === "ADMIN" ||
    role === "PROJECT_MANAGER" ||
    role === "ANNOTATOR_LEAD"
  );
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
