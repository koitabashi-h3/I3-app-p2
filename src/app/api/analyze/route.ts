export const runtime = "nodejs";

import OpenAI from "openai";

const client = new OpenAI({
    baseURL: "https://router.huggingface.co/v1",
    apiKey: process.env.HF_API_KEY,
});

async function askLLama(prompt: string) {
    const completion = await client.chat.completions.create({
        model: "meta-llama/Llama-3.1-8B-Instruct",
        messages: [{ role: "user", content: prompt }],
    });
    return completion.choices[0].message.content || "";
}

export async function POST(req: Request) {
  const { text, mode, interpretation } = await req.json();
  const safeMode = mode === "solve" || mode === "create" ? mode : "solve";

  const prompt = `
あなたは「不満からアイデアを生み出す専門家」です。
ユーザーの目的（mode）に応じて、返す JSON を切り替えてください。
ユーザーが入力した不満とその解釈を分析し、以下の項目を必ず出力してください。

【重要ルール】
- 出力は JSON のみ（文章・説明文を混ぜない）
- キー名・構造を絶対に変更しない
- 値はすべて文字列または配列
- 既存サービスは最低3つ返す
- description は必ず二文で書く
- 文末は「。」で終える
- 余計な説明を加えない
- URL は必ず実在する公式サイトまたは信頼できる情報源
- 既存サービスには「limit（限界・弱点）」を必ず含める
- 余計な文章を JSON の外に書かない

--------------------------------
【mode = "solve" の場合】
--------------------------------
以下の JSON を返す：
{
  "summary": "不満の要約",
  "category": "原因・カテゴリー（例：効率の悪さ、情報不足、操作性の悪さ など）",
  "existingServices": [
    {
      "name": "サービス名",
      "description": "どんなサービスか（2文程度で簡潔に）",
      "limit": "そのサービスの限界・弱点",
      "url": "https://example.com"
    }
  ]
}
※ solve モードでは「gap」「ideaSeed」「importance」「target」は返さない。

--------------------------------
【mode = "create" の場合】
--------------------------------
以下の JSON を返す：
{
  "summary": "不満の要約",
  "category": "原因・カテゴリー（例：効率の悪さ、情報不足、操作性の悪さ など）",
  "existingServices": [
    {
      "name": "サービス名",
      "description": "どんなサービスか（2文程度で簡潔に）",
      "limit": "そのサービスの限界・弱点",
      "url": "https://example.com"
    }
  ],
  "gap": "既存サービスでは解決できていない部分（アイデアの余地）",
  "ideaSeed": "新しいアイデアにつながる視点（アイデアの種）",
  "importance": "高・中・低 のいずれか1つ。理由も含める",
  "target": "主なターゲット（誰が困っているか）"
}

--------------------------------
【対象の不満】
${text}

【不満の解釈】
${interpretation}

【ユーザーの目的】
mode = ${safeMode}
`;

  const raw = await askLLama(prompt);

  return Response.json({ raw });
}