import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Menu, Search, ShieldCheck, UserCircle } from 'lucide-react'

type NavbarProps = {
  pageTitle: string
  pageSubtitle: string
  onMenuToggle: () => void
}

export default function Navbar({ pageTitle, pageSubtitle, onMenuToggle }: NavbarProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-[#020617]/90 backdrop-blur-xl">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onMenuToggle}
              aria-label="Open navigation"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-[#111827] text-slate-200 transition hover:border-[#06B6D4]/50 lg:hidden"
            >
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#06B6D4]">
                PlantMind AI
              </p>
              <h1 className="truncate text-xl font-semibold text-white sm:text-2xl">
                {pageTitle}
              </h1>
              <p className="mt-1 hidden text-sm text-slate-400 sm:block">{pageSubtitle}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
  type="button"
  onClick={() => navigate("/settings")}
  className="hidden items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-400/20 md:inline-flex"
>
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              System healthy
            </button>
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => navigate("/alerts")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-[#111827] text-slate-300 transition hover:border-[#06B6D4]/50 hover:text-[#67E8F9]"
            >
              <Bell aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="User profile"
              onClick={() => navigate("/settings")}

              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-[#111827] text-slate-300 transition hover:border-[#06B6D4]/50 hover:text-[#67E8F9]"
            >
              <UserCircle aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative md:w-[min(520px,55vw)]">
            <label className="sr-only" htmlFor="workspace-search">
              Search workspace
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            />
            <input
  id="workspace-search"
  type="search"
  placeholder="Search documents, controls, alerts..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && search.trim()) {
      navigate('/assistant', {
        state: {
          question: search,
        },
      })
    }
  }}
  className="w-full rounded-lg border border-slate-800 bg-[#111827] py-2.5 pl-10 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#06B6D4]/70 focus:ring-2 focus:ring-[#06B6D4]/15"
/>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium">

  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
    🟢 Live Backend
  </span>

  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-cyan-300">
    ⚡ FastAPI Connected
  </span>

  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-purple-300">
    🤖 AI Ready
  </span>

</div>
        </div>
      </div>
    </header>
  )
}
