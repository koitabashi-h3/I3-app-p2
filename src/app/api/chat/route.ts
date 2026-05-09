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
  const { selectedIdea, chatHistory, userMessage } = await req.json();

  const systemPrompt = `
あなたはプロダクト開発の専門家です。

ユーザーのアイデアを深く掘り下げ、改善し、現実的に実現可能な形に導いてください。

【ルール】
- 単なる相槌は禁止
- 具体的な改善提案をする
- 必要なら課題も指摘する
- ユーザーの意図を確認しながら進める
- 過去の会話内容を踏まえて一貫性を保つ
- selectedIdea の内容を常に中心にする
- 一般論ではなく、アイデア固有の課題・価値・実現性に触れる
- 3〜6文で簡潔に答える
`;

  const messages = [
    { role: "system", content: systemPrompt },

    // 初期アイデア
    {
      role: "assistant",
      content: `現在のアイデア概要:
タイトル: ${selectedIdea.title}
説明: ${selectedIdea.description}
価値: ${selectedIdea.value}
実現性: ${selectedIdea.feasibility}`
    },

    // 会話履歴
    ...chatHistory,

    // 今回の発言
    { role: "user", content: userMessage },
  ];

  const reply = await askLLM(messages);

  return Response.json({ reply });
}