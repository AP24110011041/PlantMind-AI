import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

type AlertItem = {
  severity: 'success' | 'warning' | 'info'
  title: string
  message: string
}

type AlertsResponse = {
  total_alerts: number
  alerts: AlertItem[]
}

export default function Alerts() {
  const [data, setData] = useState<AlertsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://127.0.0.1:8080/alerts/')
      .then((res) => res.json())
      .then((json) => {
        setData(json)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircle2 className="h-6 w-6 text-green-400" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-400" />
      default:
        return <Info className="h-6 w-6 text-cyan-400" />
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-white">
        Loading alerts...
      </div>
    )
  }
  if (!data) {
  return (
    <div className="p-6 text-red-400">
      Failed to load alerts from the backend.
    </div>
  )
}

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-800 bg-[#111827] p-6">
        <h1 className="text-3xl font-bold text-white">
          Alerts
        </h1>

        <p className="mt-2 text-slate-400">
  {data?.total_alerts ?? 0} active alert(s) detected.
</p>
      </div>

      <div className="grid gap-4">
  {data?.alerts.length ? (
    data.alerts.map((alert, index) => (
      <div
        key={index}
        className="flex items-start gap-4 rounded-lg border border-slate-800 bg-[#111827] p-5"
      >
        {getIcon(alert.severity)}

        <div>
          <h2 className="font-semibold text-white">
            {alert.title}
          </h2>

          <p className="mt-1 text-slate-400">
            {alert.message}
          </p>
        </div>
      </div>
    ))
  ) : (
    <div className="rounded-lg border border-green-700 bg-green-900/20 p-6 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-green-400" />
      <h2 className="mt-3 text-lg font-semibold text-white">
        No Active Alerts
      </h2>
      <p className="mt-2 text-slate-400">
        Your Veritas AI workspace is healthy. No action is required.
      </p>
    </div>
  )}
      </div>
    </div>
  )
}