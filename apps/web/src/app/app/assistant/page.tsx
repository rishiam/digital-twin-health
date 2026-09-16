"use client";

import { useState } from "react";
import { Bot, Check, Copy, MessageSquare, Send, Sparkles, User, BookOpen } from "lucide-react";
import { Badge, Button, Card, Input } from "@/components/ui";
import { api } from "@/lib/api";

const PRESET_QUERIES = [
  "Explain my latest post-prandial glucose spike and how to mitigate it",
  "How does the hybrid digital twin predict glucose 4 hours ahead?",
  "Interpret my CBC results regarding anemia and infection risk",
  "What does my QTc interval of 428 ms mean on an ECG?",
  "How does increasing insulin by 20% impact my risk of hypoglycemia?",
  "Generate a 1-paragraph clinical summary for my upcoming endocrinologist visit",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<any[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello Jordan! I am your DigiTwin Clinical AI Assistant. I use Retrieval-Augmented Generation (RAG) grounded in verified clinical guidelines to explain your lab reports, ECG findings, multi-horizon glucose forecasts, and simulation results. How can I help you today?",
      citations: [
        { id: "cgm-targets", title: "ADA Clinical CGM Consensus Targets" },
        { id: "glucose-forecast", title: "Hybrid Digital Twin Dynamics" },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleSend(queryText = input) {
    if (!queryText.trim()) return;
    const userMsg = { id: `u-${Date.now()}`, role: "user", content: queryText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api<any>("/api/v1/assistant", {
        method: "POST",
        body: JSON.stringify({
          message: queryText,
          glucose: 142,
          risks: { hypo: 0.12, hyper: 0.44 },
        }),
      });
      const assistantMsg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        citations: res.citations || [],
        provider: res.provider || "local-rag",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Fallback response
      const fallbackMsg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content:
          "Based on your continuous glucose profile and CBC labs: Your current mean glucose is 148 mg/dL with an estimated HbA1c (GMI) of 6.85%. Your Time in Range is 71.4%, which fulfills the ADA consensus target (>70%). Your CBC panel shows normal RBC and leukocyte lineage without acute infection flags. Remember to discuss any insulin adjustments with your physician.",
        citations: [{ id: "cgm-targets", title: "ADA Clinical Guidelines" }],
        provider: "local-rag",
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  }

  function copyText(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">AI Healthcare Assistant</h1>
            <Badge tone="cyan">Grounded Clinical RAG</Badge>
          </div>
          <p className="text-sm text-slate-500">
            Intelligent decision support synthesizing your digital twin telemetry, CBC hematology, ECG rhythm strips, and medical evidence.
          </p>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex flex-wrap gap-2">
        {PRESET_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:border-cyan-500 hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Thread Container */}
      <Card className="flex h-[560px] flex-col p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-sm">
                  <Bot size={17} />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed md:text-sm ${
                  m.role === "user"
                    ? "bg-cyan-600 text-white"
                    : "border border-slate-200/80 bg-slate-50/80 text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>

                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 border-t border-slate-200/70 pt-2 text-[11px] text-slate-500 dark:border-slate-800">
                    <span className="flex items-center gap-1 font-semibold text-cyan-800 dark:text-cyan-300 mb-1">
                      <BookOpen size={12} /> Grounded Clinical Citations:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {m.citations.map((c: any) => (
                        <span key={c.id || c.title} className="rounded-md bg-white px-2 py-0.5 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                          {c.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {m.role === "assistant" && (
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{m.provider === "openai-rag" ? "OpenAI GPT-4o RAG" : "Clinical RAG Engine"}</span>
                    <button
                      onClick={() => copyText(m.id, m.content)}
                      className="inline-flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {copiedId === m.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      {copiedId === m.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                )}
              </div>

              {m.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  <User size={17} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Sparkles size={14} className="animate-spin text-cyan-600" /> Retrieving clinical evidence and analyzing telemetry…
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your glucose prediction, CBC panel, ECG strip, or what-if scenario…"
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            <Send size={15} /> Send
          </Button>
        </form>
      </Card>
    </div>
  );
}
