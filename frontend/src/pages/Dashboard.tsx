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

const kpiCards: KpiCard[] = [
  {
    title: 'Documents',
    value: '1,284',
    detail: 'SOPs, manuals, audit files, and shift reports indexed for operations.',
    trend: '+42 this week',
    tone: 'cyan',
    icon: FileText,
  },
  {
    title: 'Compliance',
    value: '96%',
    detail: 'Controls with assigned owners, evidence, and current review status.',
    trend: '4 gaps open',
    tone: 'green',
    icon: ShieldCheck,
  },
  {
    title: 'AI Queries',
    value: '3,842',
    detail: 'Operational questions logged across document and asset workflows.',
    trend: '+18% usage',
    tone: 'amber',
    icon: Bot,
  },
  {
    title: 'Alerts',
    value: '7',
    detail: 'Open operational alerts requiring review by asset or compliance owners.',
    trend: '2 critical',
    tone: 'rose',
    icon: AlertTriangle,
  },
]

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

const recentDocuments: RecentDocument[] = [
  {
    name: 'Boiler Startup SOP',
    category: 'Procedure',
    owner: 'Operations',
    status: 'Indexed',
    updatedAt: 'Today, 09:30',
  },
  {
    name: 'Compressor C-12 Maintenance Manual',
    category: 'Manual',
    owner: 'Reliability',
    status: 'Review',
    updatedAt: 'Yesterday, 16:10',
  },
  {
    name: 'Quarterly Safety Audit Evidence',
    category: 'Compliance',
    owner: 'Safety',
    status: 'Updated',
    updatedAt: 'Jul 8, 2026',
  },
  {
    name: 'Cooling Loop Inspection Checklist',
    category: 'Checklist',
    owner: 'Maintenance',
    status: 'Indexed',
    updatedAt: 'Jul 7, 2026',
  },
]

const statusStyles: Record<RecentDocument['status'], string> = {
  Indexed: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  Review: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  Updated: 'border-[#06B6D4]/25 bg-[#06B6D4]/10 text-[#67E8F9]',
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-800 bg-[#111827] p-5 shadow-xl shadow-slate-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#06B6D4]">
              Unified Asset & Operations Brain
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
              Dashboard overview
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
              Monitor document readiness, compliance posture, operational query volume,
              and active alerts from one responsive enterprise workspace.
            </p>
          </div>
          <div className="rounded-lg border border-[#06B6D4]/25 bg-[#06B6D4]/10 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#06B6D4] p-2 text-slate-950">
                <SearchCheck aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Demo data only</p>
                <p className="mt-1 text-xs text-cyan-100/70">No AI, RAG, or backend feature logic.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Dashboard KPIs" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
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
                Latest dummy document activity for the dashboard layout.
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#06B6D4]/60 hover:bg-[#06B6D4]/10 hover:text-[#67E8F9]"
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
                  className="grid gap-3 px-4 py-4 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.7fr_0.9fr] lg:items-center"
                >
                  <div>
                    <p className="font-medium text-white">{document.name}</p>
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
