"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${data.error}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ 网络错误，请重试" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 flex size-12 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition hover:bg-zinc-800"
        aria-label="打开 AI 助手"
      >
        {open ? "✕" : "💬"}
      </button>

      {/* 对话面板 */}
      {open ? (
        <div className="fixed bottom-20 right-6 z-40 flex w-80 flex-col rounded-xl border border-zinc-200 bg-white shadow-2xl sm:w-96">
          {/* 头部 */}
          <div className="border-b border-zinc-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-900">PMO AI 助手</h3>
            <p className="text-xs text-zinc-500">查询项目状态、需求统计等</p>
          </div>

          {/* 消息区 */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3"
            style={{ maxHeight: "24rem", minHeight: "12rem" }}
          >
            {messages.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                <p>试试问我：</p>
                <p className="mt-2">「各项目的需求积压情况？」</p>
                <p>「我还有多少任务没完成？」</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {loading ? (
                  <div className="flex justify-start">
                    <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500">
                      思考中…
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* 输入区 */}
          <div className="border-t border-zinc-200 px-3 py-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入问题…"
                className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                发送
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
