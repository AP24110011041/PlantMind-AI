import DashboardCard from '../components/DashboardCard'

const reportBars = [
  { label: 'Availability', value: '96%', width: '96%' },
  { label: 'Performance', value: '88%', width: '88%' },
  { label: 'Quality', value: '93%', width: '93%' },
  { label: 'Energy Efficiency', value: '79%', width: '79%' },
]

const reports = [
  { name: 'Daily Plant Brief', audience: 'Operations', schedule: 'Every shift' },
  { name: 'Compliance Evidence Pack', audience: 'Leadership', schedule: 'Monthly' },
  { name: 'Reliability Risk Digest', audience: 'Maintenance', schedule: 'Weekly' },
]

export default function Reports() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="OEE"
          value="89.1%"
          detail="Overall equipment effectiveness across production-critical lines."
          trend="+2.1%"
          tone="green"
        />
        <DashboardCard
          title="Energy per Unit"
          value="4.8 kWh"
          detail="Average energy usage normalized to current production output."
          tone="amber"
        />
        <DashboardCard
          title="AI Briefs Sent"
          value="36"
          detail="Automated summaries generated for shift, maintenance, and leadership teams."
          tone="blue"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">Performance Breakdown</h2>
          <p className="mt-1 text-sm text-stone-500">
            Current reporting metrics prepared for the leadership dashboard.
          </p>

          <div className="mt-5 space-y-4">
            {reportBars.map((metric) => (
              <div key={metric.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-stone-800">{metric.label}</span>
                  <span className="text-stone-500">{metric.value}</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-stone-100">
                  <div className="h-3 rounded-full bg-sky-500" style={{ width: metric.width }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">Scheduled Reports</h2>
          <div className="mt-4 space-y-3">
            {reports.map((report) => (
              <article key={report.name} className="rounded-md border border-stone-200 p-3">
                <h3 className="font-semibold text-stone-950">{report.name}</h3>
                <p className="mt-1 text-sm text-stone-500">Audience: {report.audience}</p>
                <p className="text-sm text-stone-500">Schedule: {report.schedule}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
