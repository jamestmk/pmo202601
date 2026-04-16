"use client";

import { useEffect, useState } from "react";

type Props = {
  message?: string;
  tone?: "success" | "error";
};

export function Toast({ message, tone = "success" }: Props) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    setVisible(Boolean(message));
    if (!message) return;
    const timer = window.setTimeout(() => setVisible(false), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message || !visible) return null;

  const style =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-emerald-100/80"
      : "border-red-200 bg-red-50 text-red-900 shadow-red-100/80";

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
      <div
        className={`pointer-events-auto min-w-[18rem] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${style}`}
        role="alert"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-base leading-none">
            {tone === "success" ? "✓" : "!"}
          </span>
          <div className="flex-1">
            <p className="font-medium">
              {tone === "success" ? "操作成功" : "操作失败"}
            </p>
            <p className="mt-1 leading-5">{message}</p>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded px-1 text-base leading-none opacity-60 transition hover:opacity-100"
            aria-label="关闭提示"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
