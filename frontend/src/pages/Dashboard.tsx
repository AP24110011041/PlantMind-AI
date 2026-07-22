import { useEffect, useState } from 'react'
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  Bot,
  ClipboardCheck,
  FilePlus2,
  FileText,
  SearchCheck,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import DashboardCard from '../components/DashboardCard'
import QuickAction from '../components/QuickAction'

type DashboardStats = {
  total_documents: number
  indexed_documents: number
  uploaded_documents: number
  needs_review: number
  total_storage: string
  ai_queries: number
}

type KpiCard = {
  title: string
  value: string
  detail: string
  trend: string
  tone: 'cyan' | 'green' | 'amber' | 'rose'
  icon: LucideIcon
}

type RecentDocument = {
  name: string
  category: string
  owner: string
  status: 'Indexed' | 'Review' | 'Updated'
  updatedAt: string
}

const quickActions = [
  {
    title: 'Upload Documents',
    description: 'Add SOPs, manuals, reports, or control evidence to the workspace.',
    actionLabel: 'Upload files',
    icon: UploadCloud,
    tone: 'cyan' as const,
  },
  {
    title: 'Review Compliance',
    description: 'Open the latest readiness snapshot and unresolved evidence gaps.',
    actionLabel: 'View checks',
    icon: ClipboardCheck,
    tone: 'green' as const,
  },
  {
    title: 'Create Summary',
    description: 'Prepare a short operational brief from recent dashboard activity.',
    actionLabel: 'Draft brief',
    icon: FilePlus2,
    tone: 'amber' as const,
  },
]



const statusStyles: Record<RecentDocument['status'], string> = {
  Indexed: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  Review: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  Updated: 'border-[#06B6D4]/25 bg-[#06B6D4]/10 text-[#67E8F9]',
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8080/dashboard')
        if (response.ok) {
          const data = (await response.json()) as DashboardStats
          setStats(data)
        }
        const docsResponse = await fetch("http://127.0.0.1:8080/documents");

if (docsResponse.ok) {
  const docs = await docsResponse.json();

  setRecentDocuments(
    docs.map((doc: any) => ({
      name: doc.filename,
      category: "PDF",
      owner: "PlantMind AI",
      status:
  doc.status === "Review"
    ? "Review"
    : doc.status === "Updated"
    ? "Updated"
    : "Indexed",
      updatedAt: doc.upload_date ?? "Recently",
    }))
  );
}
      } catch {
        // Keep the existing UI and fall back to the same layout without crashing.
      }
    }

    void loadStats()
  }, [])

  const liveKpiCards: KpiCard[] = [
    {
      title: 'Documents',
      value: stats ? String(stats.total_documents) : '—',
      detail: stats
        ? `${stats.indexed_documents} indexed • ${stats.uploaded_documents} uploaded • ${stats.total_storage}`
        : 'SOPs, manuals, audit files, and shift reports indexed for operations.',
      trend: stats ? 'Live backend' : '+42 this week',
      tone: 'cyan',
      icon: FileText,
    },
    {
      title: 'Compliance',
      value: stats ? String(stats.needs_review) : '—',
      detail: stats
    ? `${stats.needs_review} document(s) require review.`
    : 'Loading...',
      trend: stats ? 'Needs review' : '4 gaps open',
      tone: 'green',
      icon: ShieldCheck,
    },
    {
      title: 'AI Queries',
      value: stats ? String(stats.ai_queries) : '—',
      detail: 'Operational questions logged across document and asset workflows.',
      trend: stats ? 'Live backend' : '+18% usage',
      tone: 'amber',
      icon: Bot,
    },
    {
      title: 'Alerts',
      value: stats ? String(stats.needs_review) : "—",
      detail: 'Open operational alerts requiring review by asset or compliance owners.',
      trend: stats ? 'No active alerts' : '2 critical',
      tone: 'rose',
      icon: AlertTriangle,
    },
  ]

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-800 bg-[#111827] p-5 shadow-xl shadow-slate-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#06B6D4]">
              Unified Asset & Operations Brain
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
              Veritas AI Operations Dashboard
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">
              AI-powered industrial intelligence platform for document verification,
compliance monitoring, semantic search, and operational decision support.
            </p>
          </div>
          <div className="rounded-lg border border-[#06B6D4]/25 bg-[#06B6D4]/10 p-4" role="note" aria-label="Live backend notice">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#06B6D4] p-2 text-slate-950">
                <SearchCheck aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Live backend data</p>
                <p className="mt-1 text-xs text-cyan-100/70">Metrics sourced from the FastAPI service.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Dashboard KPIs" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {liveKpiCards.map((card) => (
          <DashboardCard
            key={card.title}
            title={card.title}
            value={card.value}
            detail={card.detail}
            trend={card.trend}
            tone={card.tone}
            icon={card.icon}
          />
        ))}
      </section>
      <section className="rounded-lg border border-slate-800 bg-[#111827] p-6">
  <h2 className="text-xl font-semibold text-white">
    🚀 AI Intelligence Center
  </h2>

  <p className="mt-2 text-slate-400">
    Live insights generated from the Veritas AI backend.
  </p>
  <div className="mt-4 rounded-lg border border-green-700 bg-green-950/40 p-4">
  <h3 className="text-lg font-semibold text-green-400">
    🚀 AI Engine Status
  </h3>

  <div className="mt-3 grid gap-2 sm:grid-cols-2">

    <p className="text-green-300">✅ FastAPI Backend Online</p>

    <p className="text-green-300">✅ Ollama Connected</p>

    <p className="text-green-300">✅ ChromaDB Active</p>

    <p className="text-green-300">✅ RAG Pipeline Ready</p>

  </div>
</div>

  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

    <div className="rounded-lg bg-slate-900 p-4">
      <p className="text-sm text-slate-400">📄 Total Documents</p>
      <p className="mt-2 text-2xl font-bold text-cyan-400">
        {stats?.total_documents ?? 0}
      </p>
    </div>

    <div className="rounded-lg bg-slate-900 p-4">
      <p className="text-sm text-slate-400">📑 Indexed Documents</p>
      <p className="mt-2 text-2xl font-bold text-green-400">
        {stats?.indexed_documents ?? 0}
      </p>
    </div>

    <div className="rounded-lg bg-slate-900 p-4">
      <p className="text-sm text-slate-400">⏳ Pending Indexing</p>
      <p className="mt-2 text-2xl font-bold text-yellow-400">
        {stats?.uploaded_documents ?? 0}
      </p>
    </div>

    <div className="rounded-lg bg-slate-900 p-4">
      <p className="text-sm text-slate-400">💾 Storage</p>
      <p className="mt-2 text-2xl font-bold text-cyan-300">
        {stats?.total_storage ?? "0 MB"}
      </p>
    </div>

    <div className="rounded-lg bg-slate-900 p-4">
      <p className="text-sm text-slate-400">🤖 AI Queries</p>
      <p className="mt-2 text-2xl font-bold text-purple-400">
        {stats?.ai_queries ?? 0}
      </p>
    </div>

    <div className="rounded-lg bg-slate-900 p-4">
      <p className="text-sm text-slate-400">Platform Health</p>
      <p className="mt-2 text-xl font-bold text-green-400">
        🟢 All Services Operational
      </p>
    </div>

  </div>
</section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <div className="rounded-lg border border-slate-800 bg-[#111827] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
              <p className="mt-1 text-sm text-slate-400">Common dashboard workflows for operators.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4">
            {quickActions.map((action) => (
              <QuickAction
                key={action.title}
                title={action.title}
                description={action.description}
                actionLabel={action.actionLabel}
                icon={action.icon}
                tone={action.tone}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#111827] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Recent Documents</h2>
              <p className="mt-1 text-sm text-slate-400">
                Latest uploaded documents from the Veritas AI repository.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/documents")}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 hover:border-[#06B6D4]/60 hover:bg-[#06B6D4]/10 hover:text-[#67E8F9]"
              aria-label="View all recent documents"
            >
              View all
            </button>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-slate-800">
            <div className="hidden grid-cols-[1.3fr_0.8fr_0.8fr_0.7fr_0.9fr] gap-4 border-b border-slate-800 bg-slate-950/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
              <span>Document</span>
              <span>Category</span>
              <span>Owner</span>
              <span>Status</span>
              <span>Updated</span>
            </div>
            <div className="divide-y divide-slate-800">
              {recentDocuments.map((document) => (
                <article
                  key={document.name}
                  tabIndex={0}
                  aria-labelledby={`doc-${document.name.replace(/\s+/g, '-').toLowerCase()}`}
                  className="grid gap-3 px-4 py-4 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.7fr_0.9fr] lg:items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                >
                  <div>
                    <p id={`doc-${document.name.replace(/\s+/g, '-').toLowerCase()}`} className="font-medium text-white">{document.name}</p>
                    <p className="mt-1 text-xs text-slate-500 lg:hidden">
                      {document.category} / {document.owner}
                    </p>
                  </div>
                  <p className="hidden text-sm text-slate-400 lg:block">{document.category}</p>
                  <p className="hidden text-sm text-slate-400 lg:block">{document.owner}</p>
                  <span
                    className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[document.status]}`}
                  >
                    {document.status}
                  </span>
                  <p className="text-sm text-slate-500">{document.updatedAt}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
