import { chatCompletion, isAIConfigured } from "@/lib/ai";

export type ClassifyResult = {
  category: string;
  module: string;
  complexity: string;
  suggestedPriority: number;
};

const SYSTEM_PROMPT = `你是一个项目管理助手，负责对需求进行分类。根据需求的标题和描述，返回以下 JSON 格式（不要返回其他内容）：

{
  "category": "FEATURE | BUG | IMPROVEMENT | ANNOTATION | TECH_DEBT | OTHER",
  "module": "一个简短的模块/领域标签，如：用户系统、数据处理、前端UI、后端API、数据标注、基础设施等",
  "complexity": "SIMPLE | MEDIUM | COMPLEX",
  "suggestedPriority": 0-3 的数字，0=P0最紧急，3=P3最低
}

分类说明：
- FEATURE: 新功能需求
- BUG: 缺陷修复
- IMPROVEMENT: 优化改进（性能、体验、重构等）
- ANNOTATION: 数据标注相关任务
- TECH_DEBT: 技术债务
- OTHER: 其他

复杂度判断：
- SIMPLE: 预计半天内可完成
- MEDIUM: 预计 1-3 天
- COMPLEX: 预计 3 天以上

只返回 JSON，不要解释。`;

export async function classifyIssue(
  title: string,
  description?: string | null,
): Promise<ClassifyResult | null> {
  if (!isAIConfigured()) return null;

  try {
    const userContent = description
      ? `标题：${title}\n描述：${description}`
      : `标题：${title}`;

    const raw = await chatCompletion([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ]);

    // 提取 JSON（兼容 markdown code block 包裹）
    const jsonStr = raw.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    const validCategories = ["FEATURE", "BUG", "IMPROVEMENT", "ANNOTATION", "TECH_DEBT", "OTHER"];
    const validComplexity = ["SIMPLE", "MEDIUM", "COMPLEX"];

    return {
      category: validCategories.includes(parsed.category) ? parsed.category : "OTHER",
      module: String(parsed.module || "").slice(0, 50) || "未分类",
      complexity: validComplexity.includes(parsed.complexity) ? parsed.complexity : "MEDIUM",
      suggestedPriority: Math.min(3, Math.max(0, Math.round(Number(parsed.suggestedPriority) || 2))),
    };
  } catch {
    return null;
  }
}
