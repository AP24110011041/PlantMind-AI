import DashboardCard from '../components/DashboardCard'

const workOrders = [
  {
    id: 'WO-4182',
    asset: 'Compressor C-12',
    priority: 'High',
    reason: 'Bearing vibration trending above learned baseline.',
    owner: 'Mechanical Team',
  },
  {
    id: 'WO-4190',
    asset: 'Cooling Loop 2',
    priority: 'Medium',
    reason: 'Temperature drift aligns with fouling pattern from prior incident.',
    owner: 'Utilities',
  },
  {
    id: 'WO-4201',
    asset: 'Packaging Line 4',
    priority: 'Low',
    reason: 'Preventive inspection due within next production window.',
    owner: 'Reliability',
  },
]

const priorityStyles: Record<string, string> = {
  High: 'bg-rose-50 text-rose-700',
  Medium: 'bg-amber-50 text-amber-800',
  Low: 'bg-emerald-50 text-emerald-700',
}

export default function Maintenance() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="Open Work Orders"
          value="46"
          detail="Active jobs prioritized by risk, production impact, and safety dependency."
          tone="blue"
        />
        <DashboardCard
          title="Predicted Failures"
          value="5"
          detail="Assets with a model-backed likelihood increase in the next 14 days."
          tone="rose"
        />
        <DashboardCard
          title="Planned Downtime"
          value="11h"
          detail="Maintenance hours currently aligned with approved production windows."
          tone="green"
        />
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-950">Priority Work Orders</h2>
            <p className="mt-1 text-sm text-stone-500">
              AI-ranked work with explainable risk context for planners.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            Create work order
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          {workOrders.map((order) => (
            <article key={order.id} className="rounded-lg border border-stone-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-500">{order.id}</p>
                  <h3 className="mt-1 text-lg font-semibold text-stone-950">{order.asset}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{order.reason}</p>
                </div>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyles[order.priority]}`}>
                  {order.priority}
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-500">Owner: {order.owner}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
