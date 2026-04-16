/**
 * 通用 AI 调用层，兼容 OpenAI API 格式（也适用于 DeepSeek、通义千问等）。
 */

type Message = { role: "system" | "user" | "assistant"; content: string };

type ChatResponse = {
  choices: { message: { content: string } }[];
};

function getConfig() {
  const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const apiKey = process.env.AI_API_KEY || "";
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  return { baseUrl, apiKey, model };
}

export function isAIConfigured(): boolean {
  return !!process.env.AI_API_KEY;
}

export async function chatCompletion(
  messages: Message[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const { baseUrl, apiKey, model } = getConfig();
  if (!apiKey) throw new Error("未配置 AI_API_KEY");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI API 调用失败 (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as ChatResponse;
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}
