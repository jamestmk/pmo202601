"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  promoteFromForm,
  closePoolIssueForm,
  updateIssuePresentationForm,
  moveIssueForm,
} from "@/lib/actions/issues";
import { PRIORITY_LABELS, CARD_COLOR_OPTIONS } from "@/lib/priority";

interface PoolIssueActionsProps {
  issue: {
    id: string;
    title: string;
    priority: number;
    cardColor: string;
    isFlagged: boolean;
  };
  projectId: string;
  members: Array<{
    userId: string;
    user: { name?: string | null; email: string };
    role: string;
  }>;
}

export function PoolIssueActions({ issue, projectId, members }: PoolIssueActionsProps) {
  const [showPromote, setShowPromote] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showStyle, setShowStyle] = useState(false);
  const [assigneeId, setAssigneeId] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const router = useRouter();

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigneeId) return;

    const formData = new FormData();
    formData.set("assigneeId", assigneeId);

    await promoteFromForm(issue.id, formData);
    router.refresh();
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeReason.trim()) return;

    const formData = new FormData();
    formData.set("reason", closeReason);

    await closePoolIssueForm(issue.id, formData);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2">
      {/* 主要操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setShowPromote(!showPromote);
            setShowClose(false);
            setShowStyle(false);
          }}
          className="flex-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          转入开发
        </button>
        <button
          onClick={() => {
            setShowClose(!showClose);
            setShowPromote(false);
            setShowStyle(false);
          }}
          className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          关闭
        </button>
      </div>

      {/* 转入开发表单 */}
      {showPromote && (
        <form onSubmit={handlePromote} className="rounded-md border bg-zinc-50 p-3">
          <label className="block text-sm font-medium text-zinc-700">
            选择承接人
          </label>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            required
          >
            <option value="">请选择...</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.name || m.user.email}
                {m.role === "PM" ? " (PM)" : ""}
              </option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-md bg-emerald-600 px-2 py-1 text-sm font-medium text-white hover:bg-emerald-700"
            >
              确认转入
            </button>
            <button
              type="button"
              onClick={() => setShowPromote(false)}
              className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-600 hover:bg-white"
            >
              取消
            </button>
          </div>
        </form>
      )}

      {/* 关闭表单 */}
      {showClose && (
        <form onSubmit={handleClose} className="rounded-md border bg-zinc-50 p-3">
          <label className="block text-sm font-medium text-zinc-700">
            关闭原因
          </label>
          <input
            type="text"
            value={closeReason}
            onChange={(e) => setCloseReason(e.target.value)}
            placeholder="如：不做 / 重复 / 合并"
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            required
          />
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-md bg-red-600 px-2 py-1 text-sm font-medium text-white hover:bg-red-700"
            >
              确认关闭
            </button>
            <button
              type="button"
              onClick={() => setShowClose(false)}
              className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-600 hover:bg-white"
            >
              取消
            </button>
          </div>
        </form>
      )}

      {/* 次要操作 */}
      <div className="flex gap-2 text-xs">
        <a
          href={`/projects/${projectId}/issues/${issue.id}/edit`}
          className="flex-1 rounded border border-zinc-200 px-2 py-1 text-center text-zinc-600 hover:bg-zinc-50"
        >
          编辑
        </a>
        <button
          onClick={() => {
            setShowStyle(!showStyle);
            setShowPromote(false);
            setShowClose(false);
          }}
          className="flex-1 rounded border border-zinc-200 px-2 py-1 text-zinc-600 hover:bg-zinc-50"
        >
          样式
        </button>
        <form action={moveIssueForm.bind(null, issue.id)} className="flex-1">
          <input type="hidden" name="direction" value="up" />
          <button
            type="submit"
            className="w-full rounded border border-zinc-200 px-2 py-1 text-zinc-600 hover:bg-zinc-50"
          >
            ↑
          </button>
        </form>
        <form action={moveIssueForm.bind(null, issue.id)} className="flex-1">
          <input type="hidden" name="direction" value="down" />
          <button
            type="submit"
            className="w-full rounded border border-zinc-200 px-2 py-1 text-zinc-600 hover:bg-zinc-50"
          >
            ↓
          </button>
        </form>
      </div>

      {/* 样式设置表单 */}
      {showStyle && (
        <form
          action={updateIssuePresentationForm.bind(null, issue.id)}
          className="rounded-md border bg-zinc-50 p-3"
        >
          <div className="grid gap-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700">优先级</label>
              <select
                name="priority"
                defaultValue={issue.priority}
                className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
              >
                {PRIORITY_LABELS.map((label, i) => (
                  <option key={label} value={i}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">颜色</label>
              <select
                name="cardColor"
                defaultValue={issue.cardColor}
                className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
              >
                {CARD_COLOR_OPTIONS.map((color) => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isFlagged"
                defaultChecked={issue.isFlagged}
                className="size-4 rounded border-zinc-300"
              />
              <span>旗标</span>
            </label>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-md bg-zinc-900 px-2 py-1 text-sm font-medium text-white hover:bg-zinc-800"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => setShowStyle(false)}
              className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-600 hover:bg-white"
            >
              取消
            </button>
          </div>
        </form>
      )}
    </div>
  );
}