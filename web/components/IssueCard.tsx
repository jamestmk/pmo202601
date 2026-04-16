"use client";

import { useState } from "react";
import Link from "next/link";
import {
  priorityLabel,
  priorityTagClass,
  cardTintClass,
  colorDotClass,
} from "@/lib/priority";

interface IssueCardProps {
  issue: {
    id: string;
    title: string;
    description?: string | null;
    priority: number;
    isFlagged: boolean;
    cardColor: string;
    requester?: { name?: string | null; email: string };
    assignee?: { name?: string | null; email: string } | null;
    closeReason?: string | null;
  };
  projectId: string;
  compact?: boolean;
  showActions?: boolean;
  children?: React.ReactNode; // 用于自定义操作按钮
}

export function IssueCard({
  issue,
  projectId,
  compact = false,
  showActions = true,
  children
}: IssueCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`group relative rounded-lg border p-4 transition-shadow hover:shadow-md ${cardTintClass(issue.cardColor)}`}
    >
      {/* 优先级和标记 */}
      <div className="mb-2 flex items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${priorityTagClass(issue.priority)}`}>
          {priorityLabel(issue.priority)}
        </span>
        {issue.isFlagged && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
            🚩 旗标
          </span>
        )}
        <span className={`ml-auto inline-block size-2 rounded-full ${colorDotClass(issue.cardColor)}`} />
      </div>

      {/* 标题 */}
      <h3 className="font-medium text-zinc-900">
        {issue.title}
      </h3>

      {/* 描述（非紧凑模式） */}
      {!compact && issue.description && (
        <p className="mt-2 text-sm text-zinc-600 line-clamp-2">
          {issue.description}
        </p>
      )}

      {/* 关闭原因 */}
      {issue.closeReason && (
        <div className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
          关闭原因：{issue.closeReason}
        </div>
      )}

      {/* 底部信息 */}
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <div>
          {issue.assignee ? (
            <span>承接：{issue.assignee.name || issue.assignee.email}</span>
          ) : issue.requester ? (
            <span>提出：{issue.requester.name || issue.requester.email}</span>
          ) : null}
        </div>

        {/* 操作按钮区域 */}
        {showActions && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Link
              href={`/projects/${projectId}/issues/${issue.id}/edit`}
              className="rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100"
              title="编辑"
            >
              ✏️
            </Link>

            {/* 更多操作下拉菜单 */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100"
                title="更多操作"
              >
                ⋯
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border bg-white py-1 shadow-lg">
                    {children}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 自定义操作区（如转入开发按钮），不在下拉菜单中 */}
      {children && !showActions && (
        <div className="mt-3 border-t pt-3">
          {children}
        </div>
      )}
    </div>
  );
}