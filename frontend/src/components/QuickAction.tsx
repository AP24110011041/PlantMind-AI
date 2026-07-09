import type { LucideIcon } from 'lucide-react'

type ActionTone = 'cyan' | 'green' | 'blue' | 'amber' | 'stone'

type QuickActionProps = {
  title: string
  description: string
  actionLabel: string
  icon?: LucideIcon
  tone?: ActionTone
  onClick?: () => void
}

const actionStyles: Record<ActionTone, string> = {
  cyan: 'border-[#06B6D4]/30 bg-[#06B6D4]/10 text-[#67E8F9] hover:bg-[#06B6D4]/15',
  green: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15',
  blue: 'border-sky-400/30 bg-sky-400/10 text-sky-300 hover:bg-sky-400/15',
  amber: 'border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/15',
  stone: 'border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-800',
}

export default function QuickAction({
  title,
  description,
  actionLabel,
  icon: Icon,
  tone = 'cyan',
  onClick,
}: QuickActionProps) {
  return (
    <article className="rounded-lg border border-slate-800 bg-[#111827] p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-cyan-500/30">
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className={`rounded-lg border p-2.5 ${actionStyles[tone]}`}>
            <Icon aria-hidden="true" className="h-5 w-5" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${actionLabel} — ${title}`}
        className="mt-5 w-full rounded-md border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 hover:border-[#06B6D4]/60 hover:bg-[#06B6D4]/10 hover:text-[#67E8F9]"
      >
        <span className="flex items-center justify-center gap-2">{actionLabel} <span aria-hidden>→</span></span>
      </button>
    </article>
  )
}
