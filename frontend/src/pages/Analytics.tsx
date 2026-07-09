import { useEffect, useState } from 'react'
import { get } from 'axios'

type Analytics = {
  documents_uploaded: number
  documents_trend: Record<string, number>
  chunks_indexed: number
  plant_health: Array<{ asset: string; risk_score: number | null; confidence: number | null }>
  compliance_scores: Array<{ asset: string; compliance_score: number | null }>
  ai_usage: Record<string, any>
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-stone-900">{value}</p>
    </div>
  )
}

export default function Analytics() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    get('/analytics')
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading analytics…</div>
  if (!data) return <div>Failed to load analytics.</div>

  const trendEntries = Object.entries(data.documents_trend || {})

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <SmallStat label="Documents" value={data.documents_uploaded} />
        <SmallStat label="Chunks Indexed" value={data.chunks_indexed} />
        <SmallStat label="AI Requests" value={data.ai_usage.requests ?? '—'} />
        <SmallStat label="Avg Compliance" value={(data.compliance_scores.length && Math.round((data.compliance_scores.reduce((s, c) => s + (c.compliance_score || 0), 0) / data.compliance_scores.length) * 10) / 10) || '—'} />
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Documents Trend (last 14 days)</h3>
        <div className="mt-4 h-36 w-full">
          <svg width="100%" height="100%" viewBox="0 0 700 150">
            {trendEntries.map(([date, count], i) => {
              const x = 20 + i * (660 / Math.max(1, trendEntries.length - 1))
              const h = Math.min(120, count * 20)
              return (
                <g key={date}>
                  <rect x={x} y={140 - h} width={12} height={h} fill="#06B6D4" />
                </g>
              )
            })}
          </svg>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Plant Health (sampled)</h3>
        <div className="mt-4 space-y-3">
          {data.plant_health.map((p) => (
            <div key={p.asset} className="flex items-center justify-between rounded border p-3">
              <div>
                <p className="font-semibold">{p.asset}</p>
                <p className="text-xs text-stone-500">Confidence: {p.confidence ?? '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{p.risk_score ?? '—'}</p>
                <p className="text-xs text-stone-500">Risk score (0-100)</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Compliance Scores (sampled)</h3>
        <div className="mt-4 space-y-3">
          {data.compliance_scores.map((c) => (
            <div key={c.asset} className="flex items-center justify-between rounded border p-3">
              <div>
                <p className="font-semibold">{c.asset}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{c.compliance_score ?? '—'}</p>
                <p className="text-xs text-stone-500">Compliance score (0-100)</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
