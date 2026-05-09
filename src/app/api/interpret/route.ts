// import { askLLM } from "@/utils/askLLM";
export const runtime = "nodejs";

import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_API_KEY,
});

async function askLLM(messages: any[]) {
  const completion = await client.chat.completions.create({
    model: "meta-llama/Llama-3.1-8B-Instruct",
    messages,
  });
  return completion.choices[0].message.content || "";
}

export async function POST(req: Request) {
  const { complaint } = await req.json();

  const systemPrompt = `
あなたはユーザーの不満を正確に理解する専門家です。

【目的】
ユーザーが入力した不満を、AI がどう解釈したかを短く説明し、
その解釈が正しいかどうかをユーザーに確認するための文章を生成します。

【出力形式】
{
  "interpretation": "AI が解釈した不満の意味（1文）"
}

【ルール】
- JSON の外に文章を出さない
- 解釈は短く、具体的に
- 推測しすぎない
- 出力は絶対に JSON のみ
`;

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `ユーザーの不満: ${complaint}`,
    },
  ];

  const raw = await askLLM(messages);

  // JSON 部分だけ抽出
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  const jsonString = raw.slice(jsonStart, jsonEnd + 1);

  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    data = { error: "JSON parse error", raw };
  }

  return Response.json(data);
}
