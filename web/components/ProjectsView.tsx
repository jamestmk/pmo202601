"use client";

import { useState } from "react";
import Link from "next/link";
import { updateProjectTags } from "@/lib/actions/projects";

type Tag = { label: string; color: string };

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  tags: string | null;
  labelColor: string | null;
  owner: { name: string | null; email: string } | null;
};

const TAG_COLORS = [
  { name: "红", value: "red", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  { name: "橙", value: "orange", bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  { name: "黄", value: "yellow", bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  { name: "绿", value: "green", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  { name: "蓝", value: "blue", bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  { name: "紫", value: "purple", bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  { name: "灰", value: "gray", bg: "bg-zinc-100", text: "text-zinc-600", dot: "bg-zinc-400" },
];

const LABEL_COLORS = [
  { name: "无", value: null, border: "border-zinc-200", bar: "" },
  { name: "红", value: "red", border: "border-red-300", bar: "bg-red-400" },
  { name: "橙", value: "orange", border: "border-orange-300", bar: "bg-orange-400" },
  { name: "黄", value: "yellow", border: "border-yellow-300", bar: "bg-yellow-400" },
  { name: "绿", value: "green", border: "border-green-300", bar: "bg-green-400" },
  { name: "蓝", value: "blue", border: "border-blue-300", bar: "bg-blue-400" },
  { name: "紫", value: "purple", border: "border-purple-300", bar: "bg-purple-400" },
];

function getTagStyle(color: string) {
  return TAG_COLORS.find((c) => c.value === color) ?? TAG_COLORS[6];
}

function getLabelColor(color: string | null) {
  return LABEL_COLORS.find((c) => c.value === color) ?? LABEL_COLORS[0];
}

function TagEditor({ project, onClose }: { project: Project; onClose: () => void }) {
  const initTags: Tag[] = (() => {
    try { return project.tags ? JSON.parse(project.tags) : []; } catch { return []; }
  })();
  const [tags, setTags] = useState<Tag[]>(initTags);
  const [labelColor, setLabelColor] = useState<string | null>(project.labelColor);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await updateProjectTags(project.id, tags, labelColor);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-80 rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-zinc-900 mb-3">编辑标签 · {project.name}</h3>

        {/* 标记颜色 */}
        <p className="text-xs text-zinc-500 mb-1">项目颜色标记</p>
        <div className="flex gap-2 mb-4 flex-wrap">
          {LABEL_COLORS.map((c) => (
            <button
              key={String(c.value)}
              onClick={() => setLabelColor(c.value)}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${c.border} ${labelColor === c.value ? "ring-2 ring-offset-1 ring-zinc-400" : ""}`}
            >
              {c.value && <span className={`inline-block w-2 h-2 rounded-full ${c.bar}`} />}
              {c.name}
            </button>
          ))}
        </div>

        {/* 现有标签 */}
        <p className="text-xs text-zinc-500 mb-1">标签</p>
        <div className="flex flex-wrap gap-1 mb-3 min-h-6">
          {tags.map((t, i) => {
            const s = getTagStyle(t.color);
            return (
              <span key={i} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${s.bg} ${s.text}`}>
                {t.label}
                <button onClick={() => setTags(tags.filter((_, j) => j !== i))} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
              </span>
            );
          })}
        </div>

        {/* 新增标签 */}
        <div className="flex gap-2 mb-4">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="标签名"
            className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newLabel.trim()) {
                setTags([...tags, { label: newLabel.trim(), color: newColor }]);
                setNewLabel("");
              }
            }}
          />
          <select value={newColor} onChange={(e) => setNewColor(e.target.value)} className="rounded-md border border-zinc-300 px-1 py-1 text-xs">
            {TAG_COLORS.map((c) => <option key={c.value} value={c.value}>{c.name}</option>)}
          </select>
          <button
            onClick={() => { if (newLabel.trim()) { setTags([...tags, { label: newLabel.trim(), color: newColor }]); setNewLabel(""); } }}
            className="rounded-md bg-zinc-900 px-2 py-1 text-xs text-white"
          >+</button>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100">取消</button>
          <button onClick={save} disabled={saving} className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-white disabled:opacity-50">
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ p, compact, isAdmin }: { p: Project; compact: boolean; isAdmin: boolean }) {
  const [editing, setEditing] = useState(false);
  const tags: Tag[] = (() => { try { return p.tags ? JSON.parse(p.tags) : []; } catch { return []; } })();
  const lc = getLabelColor(p.labelColor);

  if (compact) {
    return (
      <>
        {editing && <TagEditor project={p} onClose={() => setEditing(false)} />}
        <li className={`flex items-center gap-3 rounded-lg border ${lc.border} bg-white px-3 py-2 shadow-sm hover:border-zinc-300 group`}>
          {p.labelColor && <span className={`w-1 self-stretch rounded-full ${lc.bar} shrink-0`} />}
          <Link href={`/projects/${p.id}`} className="flex flex-1 items-center gap-2 min-w-0">
            <span className="font-medium text-zinc-900 text-sm truncate">{p.name}</span>
            {p.status === "ARCHIVED" && <span className="text-xs text-zinc-400 shrink-0">已归档</span>}
            {tags.map((t, i) => {
              const s = getTagStyle(t.color);
              return <span key={i} className={`rounded-full px-1.5 py-0.5 text-xs shrink-0 ${s.bg} ${s.text}`}>{t.label}</span>;
            })}
          </Link>
          {isAdmin && (
            <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 text-xs text-zinc-400 hover:text-zinc-700 shrink-0">标签</button>
          )}
        </li>
      </>
    );
  }

  return (
    <>
      {editing && <TagEditor project={p} onClose={() => setEditing(false)} />}
      <li className={`relative rounded-xl border ${lc.border} bg-white shadow-sm hover:border-zinc-300 group overflow-hidden`}>
        {p.labelColor && <span className={`absolute left-0 top-0 bottom-0 w-1 ${lc.bar}`} />}
        <Link href={`/projects/${p.id}`} className="block px-4 py-4 pl-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-zinc-900">{p.name}</span>
            <span className="text-xs text-zinc-500">{p.status === "ARCHIVED" ? "已归档" : "进行中"}</span>
            {p.owner && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                Owner：{p.owner.name || p.owner.email}
              </span>
            )}
          </div>
          {p.description && <p className="mt-1 text-sm text-zinc-500">{p.description}</p>}
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((t, i) => {
                const s = getTagStyle(t.color);
                return <span key={i} className={`rounded-full px-2 py-0.5 text-xs ${s.bg} ${s.text}`}>{t.label}</span>;
              })}
            </div>
          )}
        </Link>
        {isAdmin && (
          <button
            onClick={() => setEditing(true)}
            className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 rounded-md px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
          >
            标签
          </button>
        )}
      </li>
    </>
  );
}

export function ProjectsView({ projects, isAdmin }: { projects: Project[]; isAdmin: boolean }) {
  const [compact, setCompact] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-zinc-500">{projects.length} 个项目</span>
        <div className="flex gap-1 rounded-lg border border-zinc-200 p-0.5">
          <button
            onClick={() => setCompact(false)}
            className={`rounded-md px-2.5 py-1 text-xs ${!compact ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-800"}`}
          >
            卡片
          </button>
          <button
            onClick={() => setCompact(true)}
            className={`rounded-md px-2.5 py-1 text-xs ${compact ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-800"}`}
          >
            紧凑
          </button>
        </div>
      </div>
      <ul className={compact ? "space-y-1" : "space-y-2"}>
        {projects.map((p) => (
          <ProjectCard key={p.id} p={p} compact={compact} isAdmin={isAdmin} />
        ))}
      </ul>
    </div>
  );
}
