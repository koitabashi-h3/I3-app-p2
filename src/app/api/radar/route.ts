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
    temperature: 0.3,
  });

  return completion.choices[0].message.content || "";
}

export async function POST(req: Request) {
  const { idea, chatHistory } = await req.json();

  const systemPrompt = `
あなたはプロダクト評価の専門家です。
ユーザーの利益のために厳しい評価を行うことで、アイデアの改善を図ります。
ユーザーのアイデアとチャット内容をもとに、以下の6項目を1〜5で評価してください。

【評価軸】
- 独自性（Uniqueness）
- 実現性（Feasibility）
- 市場性（Market）
- 具体性（Concreteness）
- 収益性（Profit）
- ユーザー価値（UserValue）

【評価ルール】
- 厳しく評価する
- ユーザーが否定した案は採用しない
- 各項目は必ず1~5で評価する
- JSON 以外の文章は絶対に出力しない
- 前後に説明文を付けない
- 出力は JSON のみ

【追加要件】
- 各スコアの理由を explanations として返す
- explanations は 1〜2 文の簡潔な説明
- JSON の外に文章を出さない
- すべてのプロパティの間に必ずカンマを入れる
- 文末に「。」をつけない
- 説明文は 1 文のみ
- 改行を入れない

【出力形式】
{
  "scores": {
    "uniqueness": 0,
    "feasibility": 0,
    "market": 0,
    "concreteness": 0,
    "profit": 0,
    "userValue": 0
  },
  "explanations": {
    "uniqueness": "",
    "feasibility": "",
    "market": "",
    "concreteness": "",
    "profit": "",
    "userValue": ""
  }
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

  let radar;
  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("JSON not found in LLM output");
    }
    const jsonString = raw.slice(jsonStart, jsonEnd + 1);
    radar = JSON.parse(jsonString);
  } catch (e) {
    console.error("Radar JSON parse error:", e, raw);
    radar = { error: "JSON parse error", raw };
  }

  return Response.json(radar);
}
