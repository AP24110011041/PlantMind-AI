import { useEffect, useState } from 'react'

import DashboardCard from '../components/DashboardCard'

type ReportsStats = {
  total_pdfs: number
  total_pages: number
  total_chunks: number
  indexed_documents: number
  failed_documents: number
  upload_dates: string[]
}

export default function Reports() {
  const [stats, setStats] = useState<ReportsStats>({
    total_pdfs: 0,
    total_pages: 0,
    total_chunks: 0,
    indexed_documents: 0,
    failed_documents: 0,
    upload_dates: [],
  })

  useEffect(() => {
    const loadReports = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8080/reports')
        if (!response.ok) {
          throw new Error('Failed to load reports')
        }

        const data = (await response.json()) as ReportsStats
        setStats(data)
      } catch {
        setStats({
          total_pdfs: 0,
          total_pages: 0,
          total_chunks: 0,
          indexed_documents: 0,
          failed_documents: 0,
          upload_dates: [],
        })
      }
    }

    void loadReports()
  }, [])

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="Total PDFs"
          value={String(stats.total_pdfs)}
          detail="PDF documents available in the workspace."
          tone="cyan"
        />
        <DashboardCard
          title="Total Pages"
          value={String(stats.total_pages)}
          detail="Pages extracted from uploaded PDF files."
          tone="green"
        />
        <DashboardCard
          title="Total Chunks"
          value={String(stats.total_chunks)}
          detail="Text chunks generated for retrieval indexing."
          tone="blue"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">Document Coverage</h2>
          <p className="mt-1 text-sm text-stone-500">
            Current ingestion and indexing status for uploaded PDF files.
          </p>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-md border border-stone-100 bg-stone-50 px-3 py-3">
              <span className="font-medium text-stone-800">Indexed Documents</span>
              <span className="text-stone-700">{stats.indexed_documents}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-stone-100 bg-stone-50 px-3 py-3">
              <span className="font-medium text-stone-800">Failed Documents</span>
              <span className="text-stone-700">{stats.failed_documents}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-stone-100 bg-stone-50 px-3 py-3">
              <span className="font-medium text-stone-800">Upload Dates</span>
              <span className="text-stone-700">{stats.upload_dates.length}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">Upload Timeline</h2>
          <div className="mt-4 space-y-3">
            {stats.upload_dates.length === 0 ? (
              <p className="text-sm text-stone-500">No upload dates available yet.</p>
            ) : (
              stats.upload_dates.map((date) => (
                <article key={date} className="rounded-md border border-stone-200 p-3">
                  <h3 className="font-semibold text-stone-950">{date}</h3>
                  <p className="mt-1 text-sm text-stone-500">Document uploaded on this date.</p>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
