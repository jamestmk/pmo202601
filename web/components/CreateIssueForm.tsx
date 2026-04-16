"use client";

import { useState } from "react";
import { PRIORITY_LABELS, CARD_COLOR_OPTIONS } from "@/lib/priority";

const CATEGORY_LABELS: Record<string, string> = {
  FEATURE: "功能需求",
  BUG: "缺陷修复",
  IMPROVEMENT: "优化改进",
  ANNOTATION: "数据标注",
  TECH_DEBT: "技术债务",
  OTHER: "其他",
};

const COMPLEXITY_LABELS: Record<string, string> = {
  SIMPLE: "简单",
  MEDIUM: "中等",
  COMPLEX: "复杂",
};

export function CreateIssueForm({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(2);
  const [category, setCategory] = useState("");
  const [module, setModule] = useState("");
  const [complexity, setComplexity] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [classified, setClassified] = useState(false);

  async function handleClassify() {
    if (!title.trim()) return;
    setClassifying(true);
    try {
      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (res.ok) {
        const data = await res.json();
        setCategory(data.category || "");
        setModule(data.module || "");
        setComplexity(data.complexity || "");
        setPriority(data.suggestedPriority ?? 2);
        setClassified(true);
      }
    } catch {
      // 静默失败
    } finally {
      setClassifying(false);
    }
  }

  return (
    <form action={action} className="space-y-3" id="create-issue-form">
      <div className="flex flex-wrap gap-3">
        <input
          name="title"
          required
          placeholder="需求标题"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setClassified(false); }}
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <select
          name="priority"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          {PRIORITY_LABELS.map((label, i) => (
            <option key={label} value={i}>{label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleClassify}
          disabled={classifying || !title.trim()}
          className="rounded-md border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
        >
          {classifying ? "归类中…" : "🤖 AI 归类"}
        </button>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          添加到需求池
        </button>
      </div>
      <textarea
        name="description"
        placeholder="需求描述（可选）"
        rows={2}
        value={description}
        onChange={(e) => { setDescription(e.target.value); setClassified(false); }}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
      />

      {/* AI 归类结果 */}
      {classified && (category || module || complexity) ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs">
          <span className="font-medium text-violet-700">AI 归类：</span>
          {category ? (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-800">
              {CATEGORY_LABELS[category] || category}
            </span>
          ) : null}
          {module ? (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">
              {module}
            </span>
          ) : null}
          {complexity ? (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">
              {COMPLEXITY_LABELS[complexity] || complexity}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* 隐藏字段传递 AI 归类结果 */}
      <input type="hidden" name="cardColor" value="slate" />
      {category ? <input type="hidden" name="category" value={category} /> : null}
      {module ? <input type="hidden" name="module" value={module} /> : null}
      {complexity ? <input type="hidden" name="complexity" value={complexity} /> : null}
      {classified ? <input type="hidden" name="aiClassified" value="on" /> : null}
    </form>
  );
}
