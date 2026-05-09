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
あなたはプロダクト開発の専門家です。
ユーザーと行った深掘りチャットの内容をもとに、
「短い要約」「詳細なまとめ」「改善後のアイデア」を作成してください。

【統合ルール】
- ユーザーの意見を最優先とする。
- AI が提案した内容でも、ユーザーが肯定・採用したものは反映する。
- ユーザーが否定した案は採用しない。
- ユーザーが迷っている案は「検討事項」として扱う。
- ユーザーが「変更したい」と言った部分だけ変更する。
- ユーザーが言及していない部分は絶対に変更しない。
- 元のアイデアの構造・意図・要素は維持する。
- 改善は「追加」「補足」「明確化」を中心に行い、勝手に削除・置換しない。
- タイトルや主要要素はユーザーが変更を希望しない限り変えない。

【summaryShort（短い要約）】
- アイデアを一文で要約した説明

【summaryFull（詳細なまとめ）】
- アイデアの要点（1〜2文）
- 深掘りで明らかになった課題（箇条書き）
- 改善ポイント（箇条書き）
- 実現性の評価（1文）
- 次のアクション（1〜2文）
- 改行・箇条書きは積極的に使い、読みやすい文章にする

【絶対ルール】
- JSON の外に文章を出さない
- JSON の中の文章は自由に書いてよい

【出力形式】
{
  "summaryShort": "",
  "summaryFull": "",
  "improvedIdea": {
    "title": "",
    "description": "",
    "value": "",
    "feasibility": ""
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

  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  const jsonString = raw.slice(jsonStart, jsonEnd + 1);

  let summaryData;
  try {
    summaryData = JSON.parse(jsonString);
  } catch (e) {
    summaryData = { error: "JSON parse error", raw };
  }

  return Response.json(summaryData);
}