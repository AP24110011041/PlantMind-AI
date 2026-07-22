import {
  Activity,
  AlertTriangle,
  Bot,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
}

type NavigationItem = {
  to: string
  label: string
  description: string
  icon: LucideIcon
  end?: boolean
  disabled?: boolean
  badge?: string
}

const navigationItems: NavigationItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    description: 'Live command center',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/documents',
    label: 'Documents',
    description: 'PDF repository',
    icon: FileText,
  },
  {
    to: '/analytics',
    label: 'Analytics',
    description: 'Charts & trends',
    icon: Activity,
  },
  {
  to: '/compliance',
  label: 'Compliance',
  description: 'AI compliance analysis',
  icon: ShieldCheck,
  },
  {
    to: '/assistant',
    label: 'AI Assistant',
    description: 'RAG chat',
    icon: Bot,
  },
  {
  to: '/alerts',
  label: 'Alerts',
  description: 'AI generated alerts',
  icon: AlertTriangle,
  },
  {
  to: "/settings",
  label: "Settings",
  description: "Workspace settings",
  icon: Settings,
  },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-800 bg-[#020617] text-slate-100 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#06B6D4] text-slate-950 shadow-lg shadow-[#06B6D4]/20">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-white">Veritas AI</p>
            <p className="text-xs text-slate-500">
  Agentic AI Platform
</p>
          </div>
        </div>
        
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Dashboard
        </p>
        {navigationItems.map((item) => {
          const Icon = item.icon

          if (item.disabled) {
            return (
              <button
                key={item.label}
                type="button"
                disabled
                aria-disabled="true"
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-3 text-left text-slate-600"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-900 text-slate-600">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                  <span className="block truncate text-xs text-slate-700">{item.description}</span>
                </span>
              </button>
            )
          }

          return (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${
                  isActive
                    ? 'border border-[#06B6D4]/30 bg-[#06B6D4]/10 text-[#67E8F9]'
                    : 'text-slate-400 hover:bg-[#111827] hover:text-slate-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                      isActive ? 'bg-[#06B6D4] text-slate-950' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{item.label}</span>
                      {item.badge ? (
                        <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                          {item.badge}
                        </span>
                      ) : null}
                    </span>
                    <span className={`block truncate text-xs ${isActive ? 'text-cyan-100/70' : 'text-slate-500'}`}>
                      {item.description}
                    </span>
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Workspace
        </p>
        <div className="mt-3 rounded-lg border border-slate-800 bg-[#111827] p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">
  Veritas AI
</span>
            <span className="font-semibold text-[#67E8F9]">
  Production
</span><span className="font-semibold text-[#67E8F9]">Demo</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
  Enterprise AI for document verification, semantic search, and compliance intelligence.
</p>
        </div>
        <NavLink
  to="/settings"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-[#06B6D4]/50 hover:text-[#67E8F9]"
        >
          <Settings aria-hidden="true" className="h-4 w-4" />
          Settings
        </NavLink>
      </div>
    </aside>
  )
}
