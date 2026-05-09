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
    temperature: 0.4,
  });

  return completion.choices[0].message.content || "";
}

export async function POST(req: Request) {
  const { idea, chatHistory } = await req.json();

  const systemPrompt = `
あなたはプロダクト分析の専門家です。
ユーザーと行った深掘りチャットの内容と現在のアイデアをもとに、
類似サービスを3つ選び、比較分析を行ってください。

【統合ルール】
- ユーザーの意見を最優先とする。
- AI が提案した内容でも、ユーザーが肯定・採用したものは反映する。
- URL は実在するものを返す
- JSON 以外の文章は出力しない

【出力形式】
JSON で以下の形式にしてください：
{
  "services": [
    {
      "name": "",
      "url": "",
      "description": "",
      "strengths": [],
      "weaknesses": [],
      "difference": ""
    }
  ],
  "table": [
    ["項目", "サービスA", "サービスB", "サービスC", "あなたのアイデア"],
    ["目的", "", "", "", ""],
    ["特徴", "", "", "", ""],
    ["強み", "", "", "", ""],
    ["弱み", "", "", "", ""]
  ],
  "insights": []
}
`;

  const messages = [
    { role: "system", content: systemPrompt },

    {
      role: "user",
      content: `対象アイデア:
タイトル: ${idea.title}
説明: ${idea.description}
価値: ${idea.value}
実現性: ${idea.feasibility}`
    },

    ...chatHistory,
  ];

  const raw = await askLLM(messages);

  // パース
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  const jsonString = raw.slice(jsonStart, jsonEnd + 1);

  let compare;
  try {
    compare = JSON.parse(jsonString);
  } catch (e) {
    compare = { error: "JSON parse error", raw };
  }

  return Response.json(compare);
}