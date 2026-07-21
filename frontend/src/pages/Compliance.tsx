import { useEffect, useState } from 'react'

import DashboardCard from '../components/DashboardCard'

const controls = [
  { name: 'Lockout evidence mapped to assets', owner: 'Safety', status: 'Complete' },
  { name: 'Pressure vessel inspection certificates', owner: 'Compliance', status: 'Due soon' },
  { name: 'Operator training acknowledgements', owner: 'HR', status: 'Missing' },
  { name: 'Environmental discharge report', owner: 'Quality', status: 'Complete' },
]

const statusStyles: Record<string, string> = {
  Complete: 'bg-emerald-50 text-emerald-700',
  'Due soon': 'bg-amber-50 text-amber-800',
  Missing: 'bg-rose-50 text-rose-700',
}

export default function Compliance() {
  const [stats, setStats] = useState({
    indexed_documents: 0,
    uploaded_documents: 0,
    failed_uploads: 0,
    documents_needing_review: 0,
  })

  useEffect(() => {
    const loadComplianceStats = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8080/compliance')
        if (!response.ok) {
          throw new Error('Failed to load compliance stats')
        }

        const data = (await response.json()) as typeof stats
        setStats(data)
      } catch {
        setStats({
          indexed_documents: 0,
          uploaded_documents: 0,
          failed_uploads: 0,
          documents_needing_review: 0,
        })
      }
    }

    void loadComplianceStats()
  }, [])

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <DashboardCard
          title="Indexed Documents"
          value={String(stats.indexed_documents)}
          detail="PDFs successfully indexed into the retrieval store."
          tone="green"
        />
        <DashboardCard
          title="Uploaded Documents"
          value={String(stats.uploaded_documents)}
          detail="Documents that are present but still awaiting indexing."
          tone="cyan"
        />
        <DashboardCard
          title="Failed Uploads"
          value={String(stats.failed_uploads)}
          detail="Uploads that did not complete successfully."
          tone="rose"
        />
        <DashboardCard
          title="Needs Review"
          value={String(stats.documents_needing_review)}
          detail="Documents flagged for follow-up review."
          tone="amber"
        />
      </section>

      <section className="rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 p-5">
          <h2 className="text-lg font-semibold text-stone-950">Control Evidence</h2>
          <p className="mt-1 text-sm text-stone-500">
            Evidence readiness for the next safety and environmental review.
          </p>
        </div>
        <div className="divide-y divide-stone-100">
          {controls.map((control) => (
            <div key={control.name} className="grid gap-3 p-5 md:grid-cols-[1fr_160px_140px] md:items-center">
              <div>
                <p className="font-medium text-stone-950">{control.name}</p>
                <p className="mt-1 text-sm text-stone-500">Owner: {control.owner}</p>
              </div>
              <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[control.status]}`}>
                {control.status}
              </span>
              <button
  type="button"
  onClick={() => window.open("http://127.0.0.1:8080/documents", "_blank")}
  className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
>
  View Evidence
</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
