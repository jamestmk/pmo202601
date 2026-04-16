import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TEST_USERS = [
  { email: "admin@local.test", name: "老板（管理员）", globalRole: "ADMIN" as const, password: "admin123" },
  { email: "pm@local.test", name: "张项目经理", globalRole: "PROJECT_MANAGER" as const, password: "test123" },
  { email: "pd@local.test", name: "李产品经理", globalRole: "PRODUCT_MANAGER" as const, password: "test123" },
  { email: "dev@local.test", name: "王开发", globalRole: "DEVELOPER" as const, password: "test123" },
  { email: "dev2@local.test", name: "赵前端", globalRole: "DEVELOPER" as const, password: "test123" },
  { email: "tester@local.test", name: "孙测试", globalRole: "TESTER" as const, password: "test123" },
  { email: "lead@local.test", name: "周标注组长", globalRole: "ANNOTATOR_LEAD" as const, password: "test123" },
  { email: "ann@local.test", name: "吴标注员", globalRole: "ANNOTATOR" as const, password: "test123" },
];

async function main() {
  // 兼容旧枚举
  await prisma.$executeRawUnsafe(
    `UPDATE User SET globalRole = 'DEVELOPER' WHERE globalRole = 'USER'`,
  );

  const users: Record<string, { id: string }> = {};

  for (const u of TEST_USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, name: u.name, globalRole: u.globalRole },
      create: { email: u.email, passwordHash: hash, name: u.name, globalRole: u.globalRole },
    });
    users[u.email] = user;
  }

  // --- 示例项目 ---
  let project = await prisma.project.findFirst({ where: { name: "示例项目" } });
  if (!project) {
    project = await prisma.project.create({
      data: { name: "示例项目", description: "演示：需求池 + 研发看板", ownerId: users["pm@local.test"].id },
    });
  }

  // 所有用户加入项目
  for (const u of TEST_USERS) {
    const role = (u.globalRole === "PROJECT_MANAGER" || u.globalRole === "ADMIN") ? "PM" as const : "MEMBER" as const;
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: users[u.email].id } },
      update: { role },
      create: { projectId: project.id, userId: users[u.email].id, role },
    });
  }

  // 研发状态
  const statusNames = ["评估中", "开发中", "标注中", "测试中", "已上线"];
  const existing = await prisma.workflowStatus.findMany({ where: { projectId: project.id } });
  if (existing.length === 0) {
    await prisma.workflowStatus.createMany({
      data: statusNames.map((name, i) => ({ projectId: project.id, name, sortOrder: i })),
    });
  }

  // 示例需求
  const backlogCount = await prisma.issue.count({ where: { projectId: project.id, phase: "BACKLOG" } });
  if (backlogCount === 0) {
    const sampleIssues = [
      { title: "用户登录页支持手机号", description: "除邮箱外增加手机号登录方式", priority: 1, requesterId: users["pd@local.test"].id },
      { title: "数据标注任务分配优化", description: "组长可以批量分配标注任务给标注员", priority: 0, requesterId: users["lead@local.test"].id },
      { title: "看板页面性能优化", description: "项目需求超过100条时加载缓慢", priority: 2, requesterId: users["dev@local.test"].id },
      { title: "修复导出报表格式错误", description: "Excel导出时日期列格式不对", priority: 1, requesterId: users["tester@local.test"].id },
      { title: "新增数据质检流程", description: "标注完成后需要质检环节", priority: 1, requesterId: users["pm@local.test"].id },
    ];
    for (const issue of sampleIssues) {
      await prisma.issue.create({
        data: { projectId: project.id, phase: "BACKLOG", ...issue },
      });
    }
  }

  console.log("Seed OK. 测试账号：");
  for (const u of TEST_USERS) {
    console.log(`  ${u.name.padEnd(10)} ${u.email.padEnd(22)} / ${u.password}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
