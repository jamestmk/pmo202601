"use client";

import { useMemo, useState } from "react";
import { cardTintClass, colorDotClass, priorityLabel, priorityTagClass } from "@/lib/priority";

type IssueCard = {
  id: string;
  title: string;
  description?: string | null;
  priority: number;
  isFlagged: boolean;
  cardColor: string;
  assigneeName?: string | null;
  requesterName?: string | null;
};

type Column = {
  id: string;
  title: string;
  issues: IssueCard[];
};

export function DragSortableBoard({
  projectId,
  phase,
  columns,
  compact,
}: {
  projectId: string;
  phase: "BACKLOG" | "ACTIVE";
  columns: Column[];
  compact: boolean;
}) {
  const [state, setState] = useState(columns);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const issueToColumn = useMemo(() => {
    const map = new Map<string, string>();
    state.forEach((column) => {
      column.issues.forEach((issue) => map.set(issue.id, column.id));
    });
    return map;
  }, [state]);

  function reorderWithinColumn(columnId: string, sourceId: string, targetId: string) {
    setState((prev) =>
      prev.map((column) => {
        if (column.id !== columnId) return column;
        const next = [...column.issues];
        const from = next.findIndex((item) => item.id === sourceId);
        const to = next.findIndex((item) => item.id === targetId);
        if (from < 0 || to < 0 || from === to) return column;
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return { ...column, issues: next };
      }),
    );
  }

  async function persistColumn(columnId: string) {
    const column = state.find((item) => item.id === columnId);
    if (!column) return;
    setSaving(columnId);
    try {
      const res = await fetch("/api/issues/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          orderedIssueIds: column.issues.map((issue) => issue.id),
          workflowStatusId: phase === "ACTIVE" ? columnId : null,
          phase,
        }),
      });
      if (!res.ok) {
        window.location.reload();
        return;
      }
    } finally {
      setSaving(null);
    }
  }

  if (phase === "BACKLOG") {
    const column = state[0];
    return (
      <ul className={`mt-8 grid gap-4 ${compact ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
        {column?.issues.map((issue) => (
          <li
            key={issue.id}
            draggable
            onDragStart={() => setDraggingId(issue.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={async () => {
              const sourceId = draggingId;
              if (!sourceId || sourceId === issue.id) return;
              reorderWithinColumn(column.id, sourceId, issue.id);
              setDraggingId(null);
              await persistColumn(column.id);
            }}
            onDragEnd={() => setDraggingId(null)}
            className={`rounded-xl border p-4 shadow-sm transition ${cardTintClass(issue.cardColor)} ${draggingId === issue.id ? "opacity-60" : ""}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${priorityTagClass(issue.priority)}`}>
                {priorityLabel(issue.priority)}
              </span>
              {issue.isFlagged ? (
                <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                  旗标
                </span>
              ) : null}
              <span className={`inline-block size-2.5 rounded-full ${colorDotClass(issue.cardColor)}`} />
              <span className="ml-auto text-[11px] text-zinc-400">
                {saving === column.id ? "保存中…" : "拖拽排序"}
              </span>
            </div>
            <h3 className={`mt-2 font-medium text-zinc-900 ${compact ? "text-sm" : "text-base"}`}>
              {issue.title}
            </h3>
            {!compact && issue.description ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">{issue.description}</p>
            ) : null}
            {issue.requesterName ? (
              <p className="mt-2 text-xs text-zinc-500">提出：{issue.requesterName}</p>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
      {state.map((column) => (
        <div key={column.id} className="w-80 shrink-0 rounded-xl border border-zinc-200 bg-zinc-100/80 p-3">
          <h2 className="border-b border-zinc-200 pb-2 text-sm font-semibold text-zinc-800">
            {column.title}
            <span className="ml-2 text-xs font-normal text-zinc-400">
              {saving === column.id ? "保存中…" : "拖拽排序"}
            </span>
          </h2>
          <ul className="mt-3 space-y-3">
            {column.issues.map((issue) => (
              <li
                key={issue.id}
                draggable
                onDragStart={() => setDraggingId(issue.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async () => {
                  const sourceId = draggingId;
                  if (!sourceId || sourceId === issue.id) return;
                  const sourceColumnId = issueToColumn.get(sourceId);
                  if (sourceColumnId !== column.id) return;
                  reorderWithinColumn(column.id, sourceId, issue.id);
                  setDraggingId(null);
                  await persistColumn(column.id);
                }}
                onDragEnd={() => setDraggingId(null)}
                className={`rounded-lg border p-3 shadow-sm transition ${cardTintClass(issue.cardColor)} ${draggingId === issue.id ? "opacity-60" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${priorityTagClass(issue.priority)}`}>
                    {priorityLabel(issue.priority)}
                  </span>
                  {issue.isFlagged ? (
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                      旗标
                    </span>
                  ) : null}
                  <span className={`inline-block size-2.5 rounded-full ${colorDotClass(issue.cardColor)}`} />
                </div>
                <p className={`mt-2 font-medium text-zinc-900 ${compact ? "text-sm" : "text-base"}`}>
                  {issue.title}
                </p>
                {!compact && issue.assigneeName ? (
                  <p className="mt-1 text-xs text-zinc-500">承接：{issue.assigneeName}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
