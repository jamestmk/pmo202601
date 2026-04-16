import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { classifyIssue } from "@/lib/ai-classify";
import { isAIConfigured } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (!isAIConfigured()) {
    return NextResponse.json({ error: "AI 未配置" }, { status: 503 });
  }

  const body = await req.json();
  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }

  const result = await classifyIssue(title, body.description);
  if (!result) {
    return NextResponse.json({ error: "AI 归类失败" }, { status: 500 });
  }

  return NextResponse.json(result);
}
