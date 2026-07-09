import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type CardTone = 'cyan' | 'green' | 'blue' | 'amber' | 'rose' | 'neutral'

type DashboardCardProps = {
  title: string
  value: string
  detail: string
  icon?: LucideIcon
  trend?: string
  tone?: CardTone
  children?: ReactNode
}

const toneStyles: Record<CardTone, string> = {
  cyan: 'border-[#06B6D4]/35 bg-[#06B6D4]/10 text-[#06B6D4]',
  green: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300',
  blue: 'border-sky-400/35 bg-sky-400/10 text-sky-300',
  amber: 'border-amber-400/35 bg-amber-400/10 text-amber-300',
  rose: 'border-rose-400/35 bg-rose-400/10 text-rose-300',
  neutral: 'border-slate-700 bg-slate-800/70 text-slate-300',
}

export default function DashboardCard({
  title,
  value,
  detail,
  icon: Icon,
  trend,
  tone = 'cyan',
  children,
}: DashboardCardProps) {
  return (
    <article
      role="article"
      aria-labelledby={`kpi-${title.replace(/\s+/g, '-').toLowerCase()}`}
      tabIndex={0}
      className="rounded-lg border border-slate-800 bg-[#111827] p-5 shadow-xl shadow-slate-950/20 transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p id={`kpi-${title.replace(/\s+/g, '-').toLowerCase()}`} className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-white">{value}</p>
        </div>
        {Icon ? (
          <div
            className={`rounded-lg border p-2.5 ${toneStyles[tone]} flex items-center justify-center`}>
            <Icon aria-hidden="true" className="h-5 w-5" />
          </div>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{detail}</p>
      {trend ? (
        <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#06B6D4]/25 bg-[#06B6D4]/10 px-2.5 py-1 text-xs font-semibold text-[#67E8F9]">
          {trend}
        </span>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </article>
  )
}
