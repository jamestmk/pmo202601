# PMO Web — Next.js 全栈应用

项目管理平台的 Web 端实现，基于 Next.js 16 App Router。

## 开发

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

访问 http://localhost:3000

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run db:push` | 同步 Prisma schema 到数据库 |
| `npm run db:seed` | 写入种子数据 |
| `npm run lint` | ESLint 检查 |

## 目录说明

- `app/` — 页面路由（App Router）
- `components/` — 共享 React 组件
- `lib/actions/` — Server Actions（表单处理）
- `lib/` — 工具函数（权限、统计、优先级等）
- `prisma/` — 数据库 schema 与种子数据

## 默认账号

- 管理员：`admin@local.test` / `admin123`
- 开发成员：`dev@local.test` / `dev123`
