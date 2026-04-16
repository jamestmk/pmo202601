# PMO — 小型项目管理平台

面向中小团队的轻量级项目管理工具，支持需求池收集、研发状态流转、看板统计。

## 项目结构

```
├── docs/                        # 需求与设计文档
│   ├── requirements-mvp.md      # MVP 需求说明（当前实现范围）
│   └── requirements-full.md     # 完整版需求蓝图（含后续扩展规划）
│
└── web/                         # Next.js 全栈应用
    ├── app/                     # App Router 页面
    │   ├── page.tsx             # 总看板首页
    │   ├── login/               # 登录
    │   ├── projects/            # 项目列表 & 项目详情
    │   │   └── [projectId]/
    │   │       ├── pool/        # 需求池
    │   │       ├── board/       # 研发看板
    │   │       └── settings/    # 项目设置（状态配置、成员）
    │   └── admin/               # 管理员页面（用户管理、操作日志）
    ├── components/              # React 组件
    ├── lib/                     # 业务逻辑
    │   ├── actions/             # Server Actions
    │   ├── access.ts            # 权限控制
    │   ├── dashboard-metrics.ts # 看板统计
    │   └── priority.ts          # 优先级 & 卡片样式
    └── prisma/                  # 数据库
        ├── schema.prisma        # 数据模型
        └── seed.ts              # 种子数据
```

## 技术栈

- Next.js 16 (App Router + Server Actions)
- Prisma + SQLite
- NextAuth v5 (邮箱密码认证)
- Tailwind CSS 4

## 快速开始

```bash
cd web
npm install
cp .env.example .env        # 配置环境变量
npm run db:push             # 初始化数据库
npm run db:seed             # 写入种子数据
npm run dev                 # 启动开发服务器
```

默认账号：
- 管理员：`admin@local.test` / `admin123`
- 开发成员：`dev@local.test` / `dev123`

## 核心功能

1. 需求池 — 成员随时录入需求，标优先级，关闭或转入开发
2. 研发看板 — PM 配置状态列，承接人/PM 流转并指定下一承接人
3. 总看板 — 按项目汇总需求数量、交付完成率
4. 用户管理 — 管理员创建账号、管理角色
5. 项目设置 — 研发状态配置、成员管理
