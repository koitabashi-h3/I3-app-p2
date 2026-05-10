export const runtime = "nodejs";

import OpenAI from "openai";
import { v4 as uuid } from "uuid";

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
  const { analysis } = await req.json();

  const systemPrompt = `
あなたは「不満から新しいアイデアを生み出す専門家」です。

【重要ルール】
- 出力は必ず JSON のみ。絶対に JSON のみ。
- 文章を一切混ぜない
- コードブロックを使わない
- 各アイデアは「title」「description」「value」「feasibility」を含む
- descriptionは二文、valueは一分、feasibilityは一文とする。
- 文末は「。」で終える
- 入力された不満・分析結果と直接関係するアイデアのみを生成する
- 関係のない一般的なアイデアは絶対に出さない
- 分析結果のキーワードを必ず説明文に含める

`;

  const userPrompt = `
以下の分析結果(analysis)をもとに、直接関連する具体的な新規アイデアを3つ生成してください。
分析結果(analysis)に含まれる課題・不満・状況を必ず反映してください。
出力は必ず JSON のみにしてください。

【分析結果】
- 不満の要約: ${analysis.summary}
- カテゴリ: ${analysis.category}
- アイデアの余地: ${analysis.gap}
- アイデアの種: ${analysis.ideaSeed}
- 重要度: ${analysis.importance}
- ターゲット: ${analysis.target}

【出力フォーマット】
{
  "ideas": [
    {
      "title": "アイデア名",
      "description": "アイデアの説明（二文）",
      "value": "ユーザーにとっての価値（一文）",
      "feasibility": "実現性や導入のしやすさ（一文）"
    }
  ]
}
  `;

  const raw = await askLLM([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  console.log("analysis:", analysis);
  // JSON パース
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { ideas: [] };
  }

  const ideas = Array.isArray(parsed.ideas) ? parsed.ideas : [];
  // id を付与して返す
  const ideasWithId = ideas.map((idea: any) => ({
    id: uuid(),
    title: idea.title,
    description: idea.description,
    value: idea.value,
    feasibility: idea.feasibility,
  }));

  return Response.json({ ideas: ideasWithId });
}
