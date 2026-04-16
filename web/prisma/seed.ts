import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 升级前若库内仍为旧枚举值，统一修正
  await prisma.$executeRawUnsafe(
    `UPDATE User SET globalRole = 'DEVELOPER' WHERE globalRole = 'USER'`,
  );

  const adminHash = await bcrypt.hash("admin123", 10);
  const devHash = await bcrypt.hash("dev123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@local.test" },
    update: { passwordHash: adminHash, name: "管理员", globalRole: "ADMIN" },
    create: {
      email: "admin@local.test",
      passwordHash: adminHash,
      name: "管理员",
      globalRole: "ADMIN",
    },
  });

  const dev = await prisma.user.upsert({
    where: { email: "dev@local.test" },
    update: { passwordHash: devHash, name: "开发同学", globalRole: "DEVELOPER" },
    create: {
      email: "dev@local.test",
      passwordHash: devHash,
      name: "开发同学",
      globalRole: "DEVELOPER",
    },
  });

  let project = await prisma.project.findFirst({
    where: { name: "示例项目" },
  });
  if (!project) {
    project = await prisma.project.create({
      data: { name: "示例项目", description: "演示：需求池 + 研发看板" },
    });
  }

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: admin.id },
    },
    update: { role: "PM" },
    create: { projectId: project.id, userId: admin.id, role: "PM" },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: dev.id },
    },
    update: { role: "MEMBER" },
    create: { projectId: project.id, userId: dev.id, role: "MEMBER" },
  });

  const statusNames = ["评估中", "开发中", "测试中", "已上线"];
  const existing = await prisma.workflowStatus.findMany({
    where: { projectId: project.id },
  });
  if (existing.length === 0) {
    await prisma.workflowStatus.createMany({
      data: statusNames.map((name, i) => ({
        projectId: project.id,
        name,
        sortOrder: i,
      })),
    });
  }

  const backlogCount = await prisma.issue.count({
    where: { projectId: project.id, phase: "BACKLOG" },
  });
  if (backlogCount === 0) {
    await prisma.issue.create({
      data: {
        projectId: project.id,
        title: "示例：从需求池转入开发中",
        description: "登录后可在需求池关闭或转入开发，并指定承接人。",
        priority: 1,
        phase: "BACKLOG",
        requesterId: admin.id,
      },
    });
  }

  console.log("Seed OK. 管理员 admin@local.test / admin123 ，成员 dev@local.test / dev123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
