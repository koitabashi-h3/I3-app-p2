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
  const { text } = await req.json();

  const prompt = `
以下の制約を厳密に守ってください。

【目的】
ユーザーの不満や失敗を解決する「既に実在する」サービス・商品・仕組みを3つ挙げる。

【重要ルール】
- 必ず3つ挙げること。
- 各項目は「名前：」「説明：」「URL：」の3行構成で返すこと。
- URL は必ず実在する公式サイトまたは関連情報ページにすること。
- 架空のURLは禁止。
- 新しいサービス案を作らないこと（例：LINEBOTを作る、など）
- 箇条書きは禁止。必ず以下の形式で3つ連続で出力すること。

【「説明」に関するルール】
- 何をするサービスか（仕組み）を具体的に書くこと。
- ユーザーにどんなメリットがあるかを書くこと。
- 不満がどう解決されるかを明確にすること。
- なるべく専門用語は使わず、誰でも理解できる文章にすること。
- 2〜4文程度で簡潔にまとめること。

【出力フォーマット（厳守）】
名前：
説明：
URL：

名前：
説明：
URL：

名前：
説明：
URL：

【対象の不満・失敗】
${text}
`;

  const raw = await askLLama(prompt);

  const blocks = raw.split("名前：").slice(1);

  const solutions = blocks.map((block) => {
    const name = block.split("説明：")[0]?.trim() || "";
    const descPart = block.split("説明：")[1];
    const desc = descPart ? descPart.split("URL：")[0].trim() : "";
    const url = block.split("URL：")[1]?.trim() || "";

    return { name, desc, url };
  });

  return Response.json({ solutions });
}