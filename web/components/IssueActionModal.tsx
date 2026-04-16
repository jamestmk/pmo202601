"use client";

import { useState } from "react";
import { PRIORITY_LABELS, CARD_COLOR_OPTIONS } from "@/lib/priority";

interface IssueActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: {
    id: string;
    title: string;
    priority: number;
    cardColor: string;
    isFlagged: boolean;
  };
  members: Array<{
    userId: string;
    user: { name?: string | null; email: string };
    role: string;
  }>;
  onPromote: (issueId: string, assigneeId: string) => void;
  onClose: (issueId: string, reason: string) => void;
  onUpdatePresentation: (issueId: string, data: any) => void;
}

export function IssueActionModal({
  isOpen,
  onClose,
  issue,
  members,
  onPromote,
  onCloseIssue,
  onUpdatePresentation,
}: IssueActionModalProps) {
  const [activeTab, setActiveTab] = useState<"promote" | "close" | "style">("promote");
  const [assigneeId, setAssigneeId] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [priority, setPriority] = useState(issue.priority);
  const [cardColor, setCardColor] = useState(issue.cardColor);
  const [isFlagged, setIsFlagged] = useState(issue.isFlagged);

  if (!isOpen) return null;

  const handleSubmit = () => {
    switch (activeTab) {
      case "promote":
        if (assigneeId) {
          onPromote(issue.id, assigneeId);
          onClose();
        }
        break;
      case "close":
        if (closeReason.trim()) {
          onCloseIssue(issue.id, closeReason.trim());
          onClose();
        }
        break;
      case "style":
        onUpdatePresentation(issue.id, { priority, cardColor, isFlagged });
        onClose();
        break;
    }
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* 模态框 */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl">
        {/* 标题 */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            {issue.title}
          </h2>
        </div>

        {/* 标签页 */}
        <div className="mb-4 flex gap-1 rounded-lg bg-zinc-100 p-1">
          <button
            onClick={() => setActiveTab("promote")}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "promote"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            转入开发
          </button>
          <button
            onClick={() => setActiveTab("close")}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "close"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            关闭需求
          </button>
          <button
            onClick={() => setActiveTab("style")}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "style"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            样式设置
          </button>
        </div>

        {/* 内容区 */}
        <div className="mb-6">
          {activeTab === "promote" && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-600">
                将需求转入「开发中」状态，需要指定承接人
              </p>
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  选择承接人
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
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
              </div>
            </div>
          )}

          {activeTab === "close" && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-600">
                关闭需求后将不再显示在需求池中
              </p>
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  关闭原因
                </label>
                <input
                  type="text"
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  placeholder="如：不做 / 重复 / 合并到其他需求"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                  required
                />
              </div>
            </div>
          )}

          {activeTab === "style" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  优先级
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                >
                  {PRIORITY_LABELS.map((label, i) => (
                    <option key={label} value={i}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  卡片颜色
                </label>
                <select
                  value={cardColor}
                  onChange={(e) => setCardColor(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                >
                  {CARD_COLOR_OPTIONS.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="flagged"
                  checked={isFlagged}
                  onChange={(e) => setIsFlagged(e.target.checked)}
                  className="size-4 rounded border-zinc-300"
                />
                <label htmlFor="flagged" className="text-sm font-medium text-zinc-700">
                  添加旗标
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 按钮区 */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium text-white ${
              activeTab === "promote"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : activeTab === "close"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-zinc-900 hover:bg-zinc-800"
            }`}
          >
            {activeTab === "promote"
              ? "转入开发"
              : activeTab === "close"
              ? "关闭需求"
              : "保存设置"}
          </button>
        </div>
      </div>
    </>
  );
}