import { useState } from 'react'
import type { FormEvent } from 'react'
import { Bot, FileText, Send, Sparkles, UserCircle } from 'lucide-react'

import { askPlantMind } from '../services/chatApi'
import type { Citation } from '../services/chatApi'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

const starterQuestions = [
  'What does the uploaded document say about pump maintenance?',
  'Summarize the compliance actions from the indexed documents.',
  'Which source mentions inspection or review steps?',
]

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      'Ask a question about uploaded documents. I will retrieve the most relevant chunks and cite the sources used in the answer.',
  },
]

export default function AIChat() {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)

  const submitQuestion = async (questionText: string) => {
    const cleanQuestion = questionText.trim()

    if (!cleanQuestion || isLoading) {
      return
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: cleanQuestion,
    }

    setMessages((currentMessages) => [...currentMessages, userMessage])
    setQuestion('')
    setIsLoading(true)

    try {
      const response = await askPlantMind(cleanQuestion)
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
      }

      setMessages((currentMessages) => [...currentMessages, assistantMessage])
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Unable to answer right now.',
      }

      setMessages((currentMessages) => [...currentMessages, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submitQuestion(question)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="flex min-h-[680px] flex-col rounded-lg border border-slate-800 bg-[#111827] shadow-xl shadow-slate-950/20">
        <div className="border-b border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-[#06B6D4]/30 bg-[#06B6D4]/10 p-2 text-[#67E8F9]">
              <Bot aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
              <p className="mt-1 text-sm text-slate-400">
                RAG answers from indexed PDF chunks with source citations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((message) => {
            const isAssistant = message.role === 'assistant'
            const Icon = isAssistant ? Bot : UserCircle

            return (
              <article
                key={message.id}
                className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
              >
                {isAssistant ? (
                  <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#06B6D4] text-slate-950">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </div>
                ) : null}

                <div
                  className={`max-w-[820px] rounded-lg border px-4 py-3 ${
                    isAssistant
                      ? 'border-slate-800 bg-slate-950/60 text-slate-100'
                      : 'border-[#06B6D4]/30 bg-[#06B6D4]/10 text-cyan-50'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>

                  {message.citations?.length ? (
                    <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Source Citations
                      </p>
                      {message.citations.map((citation) => (
                        <div
                          key={`${citation.source_id}-${citation.chunk_id}`}
                          className="rounded-lg border border-slate-800 bg-[#111827] p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#67E8F9]">
                            <span>[Source {citation.source_id}]</span>
                            <span>{citation.filename}</span>
                            {citation.chunk_id ? <span>Chunk {citation.chunk_id}</span> : null}
                          </div>
                          <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">
                            {citation.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {!isAssistant ? (
                  <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-800 text-slate-300">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </div>
                ) : null}
              </article>
            )
          })}

          {isLoading ? (
            <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
              <Sparkles aria-hidden="true" className="h-4 w-4 text-[#67E8F9]" />
              Retrieving chunks and generating an answer...
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-slate-800 p-4">
          <label className="sr-only" htmlFor="rag-question">
            Ask PlantMind AI
          </label>
          <textarea
            id="rag-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={3}
            placeholder="Ask a question about uploaded PDFs..."
            className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#06B6D4]/70 focus:ring-2 focus:ring-[#06B6D4]/15"
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Answers are grounded in the top 5 vector-search chunks.
            </p>
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#06B6D4] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send aria-hidden="true" className="h-4 w-4" />
              Ask
            </button>
          </div>
        </form>
      </section>

      <aside className="space-y-4">
        <section className="rounded-lg border border-slate-800 bg-[#111827] p-5">
          <h3 className="font-semibold text-white">Prompt Starters</h3>
          <div className="mt-4 space-y-2">
            {starterQuestions.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => void submitQuestion(starter)}
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-800 px-3 py-2 text-left text-sm leading-6 text-slate-300 transition hover:border-[#06B6D4]/50 hover:bg-[#06B6D4]/10 hover:text-[#67E8F9] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {starter}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[#06B6D4]/25 bg-[#06B6D4]/10 p-5">
          <div className="flex items-center gap-3">
            <FileText aria-hidden="true" className="h-5 w-5 text-[#67E8F9]" />
            <h3 className="font-semibold text-white">Citation Rules</h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-cyan-100/80">
            <li>Upload PDFs before asking document questions.</li>
            <li>Answers are generated only from retrieved chunks.</li>
            <li>Each answer includes source cards for review.</li>
          </ul>
        </section>
      </aside>
    </div>
  )
}
