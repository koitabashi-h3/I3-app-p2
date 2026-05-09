"use client";
import { useState, useEffect, useRef } from "react";
import { Idea } from "@/types/idea";
import { Radar } from "react-chartjs-2";

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

type Solution = {
  name: string;
  description: string;
  limit: string;
  url: string;
};

export default function Home() {
  const [screen, setScreen] = useState<"input" | "result" | "ideas" | "chat">("input");
  const [complaint, setComplaint] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [fixText, setFixText] = useState("");
  const [step, setStep] = useState<"idle" | "show" | "fix">("idle");
  const [mode, setMode] = useState<"solve" | "create" | null>(null);
  const [analysisIdeas, setAnalysisIdeas] = useState<any[]>([]);

  const [analysis, setAnalysis] = useState<{
    summary: string;
    category: string;
    existingServices: Solution[];
    gap?: string;
    ideaSeed?: string;
    importance?: string;
    target?: string;
  } | null>(null);

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [isThinking, setIsThinking] = useState(false)
  const [tab, setTab] = useState("summary");
  const [summaryShort, setSummaryShort] = useState("");
  const [summaryFull, setSummaryFull] = useState("");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [compare, setCompare] = useState(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [radar, setRadar] = useState(null);
  const [isRadarOpen, setIsRadarOpen] = useState(false);

  // AI分析
  const analyzeComplaint = async (
    text: string,
    mode: "solve" | "create",
    interpretation: string
  ) => {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mode, interpretation }),
    });
    return await res.json();
  };

  // 最初の不満から意図確認
  const handleInterpretFirst = async () => {
    const res = await fetch("/api/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complaint }),
    });
    const data = await res.json();
    setInterpretation(data.interpretation);
    setStep("show");
  };

  // 修正後の再解釈
  const handleReInterpret = async () => {
    const res = await fetch("/api/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complaint: fixText }),
    });
    const data = await res.json();
    setInterpretation(data.interpretation);
    setStep("show");
  };

  const handleAnalyze = async () => {
    if (!complaint.trim()) return;

    const result = await analyzeComplaint(complaint, mode, interpretation);

    let parsed;
    try {
      parsed = JSON.parse(result.raw);
    } catch {
      alert("AIの返答を解析できませんでした");
      return;
    }
    
    setAnalysis(parsed);
    setScreen("result");
  };

  const handleGenerateIdeas = async () => {
    if (!analysis) return;

    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis }),
    });

    const data = await res.json();
    if (!data.ideas || data.ideas.length === 0) {
      alert("アイデア生成に失敗しました");
      return;
    }

    setAnalysisIdeas(data.ideas);
    setScreen("ideas");
  };

  // 自動スクロール
  const messageRefs = useRef({})
  const chatContainerRef = useRef(null)

  useEffect(() => {
    if (chatHistory.length === 0) return;

    const lastIndex = chatHistory.length - 1
    const lastMsg = chatHistory[lastIndex]

    if (lastMsg.role === "user") {
      const container = chatContainerRef.current
      const target = messageRefs.current[lastIndex]

      if (container && target) {
        const containerTop = container.getBoundingClientRect().top
        const targetTop = target.getBoundingClientRect().top

        container.scrollTo({
          top: container.scrollTop + (targetTop - containerTop),
          behavior: "smooth",
        })
      }
    }
  }, [chatHistory])

  // chat送信
  const sendMessage = async () => {
    if (!chatInput.trim()) return;

    const updated = [...chatHistory, { role: "user", content: chatInput }];
    setChatHistory(updated);

    setIsThinking(true)

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selectedIdea,
        chatHistory: updated,
        userMessage: chatInput,
      }),
    });

    const data = await res.json();

    setChatHistory(prev => [...prev, { role: "assistant", content: data.reply }]);
    setIsThinking(false)
    setChatInput("");
  };

  const handleSummarize = async () => {
    const res = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idea: selectedIdea,
        chatHistory,
      }),
    });

    const data = await res.json();
    setSummaryShort(data.summaryShort);
    setSummaryFull(data.summaryFull);

    const improved = data.improvedIdea || selectedIdea;
    setSelectedIdea(improved);

    // レーダーチャートを自動更新
    const radarRes = await fetch("/api/radar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idea: improved,
        chatHistory,
      }),
    });

    const radarData = await radarRes.json();
    setRadar(radarData);
  };

  const handleCompare = async () => {
    const res = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idea: selectedIdea,
        chatHistory,
      }),
    });

    const data = await res.json();
    setCompare(data);
  };

  const handleRadar = async () => {
    const res = await fetch("/api/radar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idea: selectedIdea,
        chatHistory,
      }),
    });

    const data = await res.json();
    setRadar(data);
  };



  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-purple-50 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl space-y-2">
        <h1 className="text-4xl font-bold text-indigo-700 text-center">Ideas in Itch</h1>
        <p className="text-center text-gray-600">そのモヤモヤを、新しいアイデアに</p>
        <br />
      </div>
      <div className="w-full max-w-3xl space-y-10">
        {/*入力画面*/}
        {screen === "input" && (
          <div className="bg-white shadow-md rounded-2xl p-8 space-y-6">
            <h2 className="text-xl font-semibold mb-2">日常の不満を入力してください</h2>
            <div className="border-t border-indigo-200 my-3"></div>
            <p className="text-gray-600">
              あなたの不満や失敗から、課題や解決策を探します
            </p>
            <textarea
              className="w-full p-3 border border-indigo-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-indigo-300 mb-2"
              rows={4}
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              onBlur={(e) => {
                setStep("show");
                handleInterpretFirst();
              }}
              placeholder="例：レジがいつも混んでいて時間がかかる"
            />
            <p className="text-sm text-gray-400">※個人情報は入力しないでください</p>

            {/* 意図確認 UI（interpretation を見せる） */}
            {step === "show" && (
              <div className="p-4 bg-white rounded shadow mb-4 border">
                <p className="font-semibold mb-2">AIの解釈</p>
                <p className="text-gray-700 mb-4">{interpretation}</p>

                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 bg-gray-300 rounded"
                    onClick={() => setStep("fix")}
                  >
                    解釈が異なる・補足する
                  </button>
                </div>
              </div>
            )}

            {/* 修正 UI */}
            {step === "fix" && (
              <div className="p-4 bg-white rounded shadow mb-4 border">
                <p className="font-semibold mb-2">AIの解釈</p>
                <p className="text-gray-700 mb-4">{interpretation}</p>
                <p className="font-semibold mb-2">どの部分が違いますか？</p>
                <textarea
                  className="w-full border rounded p-2 mb-2"
                  value={fixText}
                  onChange={(e) => setFixText(e.target.value)}
                />
                <button
                  className="px-3 py-1 bg-green-600 text-white rounded"
                  onClick={handleReInterpret}  // 修正内容で interpret 再実行
                >
                  修正して再解釈
                </button>
              </div>
            )}

            <div className="border-t border-indigo-200 mb-4"></div>

            <h3 className="font-semibold text-gray-700 mb-4">あなたの目的は？</h3>
            <div className="flex gap-3">
              <button
                className={`flex-1 py-3 rounded-xl border text-base font-medium ${
                  mode === "solve"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border-indigo-200"
                }`}
                onClick={() => setMode("solve")}
              >
                問題を解決したい
              </button>
              <button
                className={`flex-1 py-3 rounded-xl border text-base font-medium ${
                  mode === "create"
                    ? "bg-purple-500 text-white"
                    : "bg-white text-gray-700 border-purple-200"
                }`}
                onClick={() => setMode("create")}
              >
                アイデアを創出したい
              </button>
            </div>
            <br />
            <button
              onClick={handleAnalyze}
              disabled={!mode}
              className="w-full py-4 bg-indigo-600 text-white text-lg rounded-xl font-semibold disabled:bg-gray-300"
            >
              課題を分析する
            </button>

          </div>
        )}

        {/*結果画面*/}
        {screen === "result" && analysis && (
          <div className="bg-white shadow-lg rounded-2xl p-8 space-y-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-8 rounded-full bg-gradient-to-b from-indigo-300 to-purple-300 mb-3"></div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">分析結果</h2>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-indigo-50 p-4 rounded-xl border border-indigo-300">
              <p className="text-sm text-indigo-700 font-medium">入力された不満</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">{complaint}</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gradient-to-br from-gray-50 to-indigo-50 p-4 rounded-xl border border-indigo-300">
                <p className="text-sm text-indigo-700 font-medium">要約</p>
                <p className="text-gray-800 mt-1">{analysis.summary}</p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-indigo-50 p-4 rounded-xl border border-indigo-300">
                <p className="text-sm text-indigo-700 font-medium">カテゴリー</p>
                <p className="text-gray-800 mt-1">{analysis.category}</p>
              </div>
            </div>
            <br />
          
            {/* solve/create モード共通 */}
            <div>
              <h3 className="text-xl font-semibold text-blue-700 mb-3">既存の解決策</h3>
              <div className="space-y-4">
                {analysis.existingServices.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm hover:shadow-md transition"
                  >
                    <p className="text-lg font-bold text-gray-900">{item.name}</p>
                    <p className="text-gray-700 mt-1">{item.description}</p>
                    <a
                      href={item.url}
                      target="_blank"
                      className="text-blue-600 underline text-sm mt-2 inline-block"
                    >
                      詳しく見る
                    </a>
                    <p className="text-gray-600 text-sm mt-2">限界：{item.limit}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* create モードのみ */}
            {mode === "create" && (
              <div className="space-y-4">

                <div className="bg-gradient-to-br from-gray-50 to-purple-50 p-4 rounded-xl border border-purple-300">
                  <p className="text-sm text-purple-600 font-medium">アイデアの余地</p>
                  <p className="text-gray-800 mt-1">{analysis.gap}</p>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-purple-50 p-4 rounded-xl border border-purple-300">
                  <p className="text-sm text-purple-600 font-medium">アイデアの種</p>
                  <p className="text-gray-800 mt-1">{analysis.ideaSeed}</p>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-purple-50 p-4 rounded-xl border border-purple-300">
                  <p className="text-sm text-purple-600 font-medium">重要度</p>
                  <p className="text-gray-800 mt-1">{analysis.importance}</p>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-purple-50 p-4 rounded-xl border border-purple-300 mb-8">
                  <p className="text-sm text-purple-600 font-medium">ターゲット</p>
                  <p className="text-gray-800 mt-1">{analysis.target}</p>
                </div>

                <button
                  onClick={handleGenerateIdeas}
                  className="w-full py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition"
                >
                  アイデアを生成する
                </button>
              </div>
            )}

            {/* 戻るボタン */}
            <button
              onClick={() => setScreen("input")}
              className="w-full py-4 bg-gray-300 text-gray-800 rounded-xl font-semibold hover:bg-gray-400 transition"
            >
              戻る
            </button>
          </div>
        )}

        {/*アイデア画面*/}
        {screen === "ideas" && (
          <div className="bg-white shadow-lg rounded-2xl p-8 space-y-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-8 rounded-full bg-gradient-to-b from-indigo-300 to-purple-300 mb-3"></div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">生成されたアイデア</h2>
            </div>

            {analysisIdeas.map((idea) => (
              <div key={idea.id} className="bg-gradient-to-br from-gray-50 to-purple-50 border border-purple-400 rounded-xl p-5 space-y-2">
                <h3 className="text-xl font-semibold text-purple-700"><strong>{idea.title}</strong></h3>
                <p className="text-gray-700">{idea.description}</p>
                <p><strong>価値：</strong>{idea.value}</p>
                <p><strong>実現性：</strong>{idea.feasibility}</p>
                <hr />
                <button
                  onClick={() => {
                    setSelectedIdea(idea);
                    setScreen("chat"); // deepdive画面へ
                  }}
                  className="w-full py-4 bg-violet-500 text-white rounded-xl font-semibold hover:bg-violet-700 transition"
                >
                  このアイデアを深掘りする
                </button>
              </div>
            ))}

            <button
              onClick={handleGenerateIdeas}
              className="w-full py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition"
            >
              アイデアを再生成する
            </button>
            <button
              onClick={() => setScreen("input")}
              className="w-full py-4 bg-gray-300 text-gray-800 text-lg rounded-xl font-semibold hover:bg-gray-400 transition"
            >
              最初に戻る</button>
          </div>
        )}

        {/*チャット画面*/}
        {screen === "chat" && selectedIdea && (
          <div className="flex flex-col w-full h-screen bg-white rounded-2xl shadow-lg p-2 space-x-2">
            
            <div className="flex flex-1 min-h-0">
              {/* 左：チャット */}
              <div className="flex-1 flex flex-col border-r p-4">
                <h2 className="text-xl font-bold mb-3">深掘りチャット</h2>

                {/* 選択中のアイデア */}
                <div className="mb-4 p-3 bg-purple-50 rounded border border-purple-400">
                  <p className="font-semibold text-purple-700">現在のアイデア</p>
                  <p className="font-semibold">{selectedIdea.title}</p>
                  {summaryShort ? (
                    // まとめ更新後 → 要約
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {summaryShort}
                    </p>
                  ) : (
                    // 初期状態 → 選んだアイデア
                    <>
                      <p className="text-sm text-gray-600">{selectedIdea.description}</p>
                    </>
                  )}
                </div>

                {/* チャット履歴 */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 flex flex-col overflow-y-auto space-y-3 mb-4 p-3 bg-gray-50 border border-purple-400 rounded"
                >
                  {chatHistory.map((msg, i) => (
                    <div
                      key={i}
                      ref={(el) => (messageRefs.current[i] = el)}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2 rounded-lg ${
                          msg.role === "user"
                            ? "bg-blue-400 text-white"
                            : "bg-gray-200 text-gray-900"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {/* Thinking アニメーション */}
                  {isThinking && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 text-gray-400 animate-pulse px-4 py-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 入力欄 */}
                <div className="flex gap-2 mb-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                    placeholder="質問や追加したい内容を入力…"
                    className="flex-1 border border-purple-400 rounded px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    onClick={sendMessage}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    送信
                  </button>
                </div>

              </div>

              {/* 右：タブ + 内容 */}
              <div className="w-1/3 flex flex-col border-l bg-gray-50">

                {/* タブ部分（固定） */}
                <div className="flex border-b bg-white sticky top-0 z-10">
                  <button
                    className={`flex-1 px-4 py-2 text-center ${
                      tab === "summary" ? "border-b-2 border-green-600 font-bold" : "text-gray-500"
                    }`}
                    onClick={() => setTab("summary")}
                  >
                    まとめ
                  </button>

                  <button
                    className={`flex-1 px-4 py-2 text-center ${
                      tab === "compare" ? "border-b-2 border-green-600 font-bold" : "text-gray-500"
                    }`}
                    onClick={() => setTab("compare")}
                  >
                    比較
                  </button>

                  <button
                    className={`flex-1 px-4 py-2 text-center ${
                      tab === "radar" ? "border-b-2 border-green-600 font-bold" : "text-gray-500"
                    }`}
                    onClick={() => setTab("radar")}
                  >
                    評価
                  </button>
                </div>

                {/* タブ内容*/}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                  {/* ▼▼▼ 選択中カードの説明文 ▼▼▼ */}
                  {tab === "summary" && (
                    <p className="text-sm text-gray-600 leading-relaxed">
                      このアイデアの全体像を短く整理した内容を表示します。改善点や方向性を素早く把握できます。
                    </p>
                  )}

                  {tab === "compare" && (
                    <p className="text-sm text-gray-600 leading-relaxed">
                      類似サービスとの比較により、差別化ポイントを確認できます。市場での立ち位置を理解するのに役立ちます。
                    </p>
                  )}

                  {tab === "radar" && (
                    <p className="text-sm text-gray-600 leading-relaxed">
                      実現性・独自性・市場性など複数の観点からアイデアを評価します。強みと弱みをバランスよく把握できます。
                    </p>
                  )}

                  {/* ▼▼▼ カードを並び替える ▼▼▼ */}
                  {[
                    { key: "summary" },
                    { key: "compare" },
                    { key: "radar" },
                  ]
                    .sort((a) => {
                      return a.key === tab ? -1 : 1;
                    }) // 選択中カードを先頭へ
                    .map((item) => {
                      const isActive = item.key === tab;

                      return (
                        <div
                          key={item.key}
                          className={`
                            rounded-xl shadow border cursor-pointer transition-all duration-200
                            ${isActive ? "p-4 bg-white border border-indigo-400 scale-[1.03] mb-6" : "p-4 bg-white/70 border-t border-gray-200 scale-[0.90] mb-1"}
                          `}
                          onClick={() => setTab(item.key)}
                        >
                          {/* カードの中身を切り替える */}
                          {item.key === "summary" && (
                            <>
                              <div className="flex justify-between items-center mb-2">
                                <h2 className="text-lg font-bold">まとめ</h2>
                              </div>

                              {summaryFull ? (
                                <p className="text-gray-700 line-clamp-2 mb-2">
                                  最新のアイデアはこちらから!!
                                </p>
                              ) : (
                                <p className="text-gray-400 mb-2">まだまとめはありません。</p>
                              )}

                              {/* 右下に */}
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSummarize()
                                  }}
                                  className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  更新
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setIsSummaryOpen(true)
                                  }}
                                  className="text-blue-500 hover:text-blue-700 text-lg"
                                >
                                  ⓘ
                                </button>
                              </div>
                            </>
                          )}


                          {item.key === "compare" && (
                            <>
                              <div className="flex justify-between items-center mb-2">
                                <h2 className="text-lg font-bold">類似サービス比較</h2>
                              </div>

                              {compare ? (
                                <p className="text-gray-700 line-clamp-2 mb-2">比較結果はこちらから!!</p>
                              ) : (
                                <p className="text-gray-400 mb-2">まだ比較はありません。</p>
                              )}
                              
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCompare()
                                  }}
                                  className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  更新
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setIsCompareOpen(true)
                                  }}
                                  className="text-blue-500 hover:text-blue-700 text-lg"
                                >
                                  ⓘ
                                </button>
                              </div>
                            </>
                          )}

                          {item.key === "radar" && (
                            <>
                              <div className="flex justify-between items-center mb-2">
                                <h2 className="text-lg font-bold">評価（チャート）</h2>
                              </div>

                              {radar ? (
                                <p className="text-gray-700 mb-2">
                                  平均スコア:{" "}
                                  {(
                                    Object.values(radar.scores).reduce((a, b) => a + b, 0) /
                                    Object.values(radar.scores).length
                                  ).toFixed(1)}
                                </p>
                              ) : (
                                <p className="text-gray-400 mb-2">まだ評価はありません。</p>
                              )}

                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRadar()
                                  }}
                                  className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  更新
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setIsRadarOpen(true)
                                  }}
                                  className="text-blue-500 hover:text-blue-700 text-lg"
                                >
                                  ⓘ
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            </div>


            <button
              onClick={() => setScreen("ideas")}
              className="w-full py-4 bg-gray-300 text-gray-800 text-lg rounded-xl font-semibold hover:bg-gray-400 transition"
            >
              戻る</button>
            
            {isSummaryOpen && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-start z-50">
                <div className="bg-white w-full max-w-3xl mt-10 rounded-xl shadow-xl p-6 overflow-y-auto max-h-[80vh]">

                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">まとめ（詳細）</h2>
                    <button
                      onClick={() => setIsSummaryOpen(false)}
                      className="text-gray-500 hover:text-gray-700 text-xl"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {summaryFull}
                  </div>
                </div>
              </div>
            )}

            {isCompareOpen && compare && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-start z-50">
                <div className="bg-white w-full max-w-4xl mt-10 rounded-xl shadow-xl p-6 overflow-y-auto max-h-[85vh]">

                  {/* ヘッダー */}
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">類似サービス比較（詳細）</h2>
                    <button
                      onClick={() => setIsCompareOpen(false)}
                      className="text-gray-500 hover:text-gray-700 text-xl"
                    >
                      ✕
                    </button>
                  </div>

                  {/* サービス一覧 */}
                  <div className="space-y-6 mb-8">
                    {compare.services?.map((s, i) => (
                      <div key={i} className="border rounded-lg p-4">
                        <h3 className="text-xl font-semibold">{s.name}</h3>
                        <a href={s.url} target="_blank" className="text-blue-600 underline text-sm">
                          {s.url}
                        </a>
                        <p className="mt-2 text-gray-700">{s.description}</p>

                        <div className="mt-3">
                          <h4 className="font-bold">強み</h4>
                          <ul className="list-disc ml-5 text-gray-700">
                            {s.strengths.map((st, j) => <li key={j}>{st}</li>)}
                          </ul>
                        </div>

                        <div className="mt-3">
                          <h4 className="font-bold">弱み</h4>
                          <ul className="list-disc ml-5 text-gray-700">
                            {s.weaknesses.map((wk, j) => <li key={j}>{wk}</li>)}
                          </ul>
                        </div>

                        <p className="mt-3 text-gray-800">
                          <span className="font-bold">あなたのアイデアとの違い：</span>
                          {s.difference}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* 表形式の比較 */}
                  <h3 className="text-xl font-bold mb-2">比較表</h3>
                  <table className="w-full border-collapse text-sm mb-8">
                    <tbody>
                      {compare.table?.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="border px-3 py-2">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* 差別化ポイント */}
                  <h3 className="text-xl font-bold mb-2">差別化ポイント</h3>
                  <ul className="list-disc ml-5 text-gray-800">
                    {compare.insights?.map((ins, i) => (
                      <li key={i}>{ins}</li>
                    ))}
                  </ul>

                </div>
              </div>
            )}

            {isRadarOpen && radar && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-start z-50">
                <div className="bg-white w-full max-w-3xl mt-10 rounded-xl shadow-xl p-6 overflow-y-auto max-h-[85vh]">

                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">評価（レーダーチャート）</h2>
                    <button
                      onClick={() => setIsRadarOpen(false)}
                      className="text-gray-500 hover:text-gray-700 text-xl"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex justify-center my-6">
                    <div className="w-[500px]">
                      <Radar
                        data={{
                          labels: [
                            "独自性",
                            "実現性",
                            "市場性",
                            "具体性",
                            "収益性",
                            "ユーザー価値",
                          ],
                          datasets: [
                            {
                              label: "評価",
                              data: [
                                radar?.scores?.uniqueness ?? 0,
                                radar?.scores?.feasibility ?? 0,
                                radar?.scores?.market ?? 0,
                                radar?.scores?.concreteness ?? 0,
                                radar?.scores?.profit ?? 0,
                                radar?.scores?.userValue ?? 0,
                              ],
                              backgroundColor: "rgba(59,130,246,0.2)",
                              borderColor: "rgba(59,130,246,1)",
                              borderWidth: 2,
                            },
                          ],
                        }}
                        options={{
                          scales: {
                            r: {
                              min: 0,
                              max: 5,
                              ticks: { stepSize: 1 },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-xl font-bold mb-2">各指標の評価理由</h3>
                    <div className="space-y-3 text-gray-700 leading-relaxed">
                      <p><strong>独自性:</strong> {radar?.explanations?.uniqueness ?? "—"}</p>
                      <p><strong>実現性:</strong> {radar?.explanations?.feasibility ?? "—"}</p>
                      <p><strong>市場性:</strong> {radar?.explanations?.market ?? "—"}</p>
                      <p><strong>具体性:</strong> {radar?.explanations?.concreteness ?? "—"}</p>
                      <p><strong>収益性:</strong> {radar?.explanations?.profit ?? "—"}</p>
                      <p><strong>ユーザー価値:</strong> {radar?.explanations?.userValue ?? "—"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}
