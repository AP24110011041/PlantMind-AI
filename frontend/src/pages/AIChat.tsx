import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import type { FormEvent } from "react";
import { Bot, FileText, Send, Sparkles } from "lucide-react";

import { askPlantMind } from "../services/chatApi";
import type { Citation } from "../services/chatApi";
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

const starterQuestions = [
  "What does the uploaded document say about pump maintenance?",
  "Summarize the compliance actions from the indexed documents.",
  "Which source mentions inspection or review steps?",
];

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Ask a question about uploaded documents. I will retrieve the most relevant chunks and cite the sources used in the answer.",
  },
];

export default function AIChat() {
  const location = useLocation();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
  const saved = localStorage.getItem("plantmind-chat");

  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return initialMessages;
    }
  }

  return initialMessages;
});
  const [isLoading, setIsLoading] = useState(false);

  const submitQuestion = async (questionText: string) => {
    console.log("submitQuestion called");
    console.log("Question:", questionText);

    const cleanQuestion = questionText.trim();

    if (!cleanQuestion) {
      console.log("Question is empty");
      return;
    }

    if (isLoading) {
      console.log("Already loading");
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: cleanQuestion,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setIsLoading(true);

    try {
      console.log("Calling askPlantMind()...");

      const response = await askPlantMind(cleanQuestion);

      console.log("Response received:", response);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        citations: response.citations,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Backend Error:", err);

      const assistantMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        content:
          err instanceof Error
            ? err.message
            : "Unable to answer right now.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
  const state = location.state as { question?: string };

  if (state?.question) {
    setQuestion(state.question);
    void submitQuestion(state.question);
  }
}, [location.state]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("Form Submitted");
    void submitQuestion(question);
  };
  useEffect(() => {
  localStorage.setItem(
    "plantmind-chat",
    JSON.stringify(messages)
  );
}, [messages]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">

      <section className="flex min-h-[680px] flex-col rounded-lg border border-slate-800 bg-[#111827]">

        <div className="border-b border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-cyan-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                AI Assistant
              </h2>

              <p className="text-sm text-slate-400">
                Ask questions about uploaded PDFs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {messages.map((message) => {

            const assistant = message.role === "assistant";

            return (
              <div
                key={message.id}
                className={`flex ${
                  assistant ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    assistant
                      ? "bg-slate-900 text-white"
                      : "bg-cyan-700 text-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap">
                    {message.content}
                  </p>

                  {message.citations &&
                    message.citations.length > 0 && (
                      <div className="mt-4 border-t border-slate-700 pt-4">

                        <p className="font-bold text-cyan-300 mb-3">
                          Sources
                        </p>

                        {message.citations.map((citation) => (
                          <div
                            key={`${citation.source_id}-${citation.chunk_id}`}
                            className="mb-3 rounded bg-slate-800 p-3"
                          >
                            <p className="font-semibold text-cyan-400">
                              Source {citation.source_id}
                            </p>

                            <button
  type="button"
  onClick={() => {
    const id = citation.filename
      .replace(".pdf", "")
      .replace(/\s+/g, "_");

    window.open(
      `http://127.0.0.1:8080/documents/${id}/file`,
      "_blank"
    );
  }}
  className="text-left text-sm font-semibold text-cyan-400 hover:underline"
>
  📄 {citation.filename}
</button>

                            {citation.page_number && (
                              <p className="text-xs">
                                Page {citation.page_number}
                              </p>
                            )}

                            <p className="mt-2 text-xs">
                              {citation.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-cyan-300">
              <Sparkles className="h-5 w-5" />
              PlantMind AI is searching indexed documents...
            </div>
          )}

        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-800 p-4"
        >

          <textarea
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about your uploaded documents..."
            className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white"
          />

          <button
            type="submit"
            disabled={isLoading || question.trim() === ""}
            className="mt-3 flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-black disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Ask PlantMind AI
          </button>
          <button
  type="button"
  onClick={() => {
    localStorage.removeItem("plantmind-chat");
    setMessages(initialMessages);
  }}
  className="mt-3 ml-3 rounded-lg border border-red-500 px-4 py-2 font-semibold text-red-400 hover:bg-red-500 hover:text-white"
>
  Clear Chat
</button>

        </form>

      </section>

      <aside className="space-y-4">

        <section className="rounded-lg border border-slate-800 bg-[#111827] p-5">

          <h3 className="font-semibold text-white">
            Prompt Starters
          </h3>

          <div className="mt-4 space-y-2">

            {starterQuestions.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => void submitQuestion(starter)}
                disabled={isLoading}
                className="w-full rounded border border-slate-700 p-3 text-left text-white hover:bg-slate-800"
              >
                {starter}
              </button>
            ))}

          </div>

        </section>

        <section className="rounded-lg border border-cyan-500 bg-cyan-950/20 p-5">

          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            <h3 className="font-semibold text-white">
              Citation Rules
            </h3>
          </div>

          <ul className="mt-3 space-y-2 text-sm text-cyan-100">
            <li>Upload PDFs before asking questions.</li>
            <li>Answers come only from retrieved chunks.</li>
            <li>Sources are always displayed.</li>
          </ul>

        </section>

      </aside>

    </div>
  );
}