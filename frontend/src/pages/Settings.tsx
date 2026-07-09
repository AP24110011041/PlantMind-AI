const integrations = [
  { name: 'Historian', detail: 'Sensor and production time-series data', enabled: true },
  { name: 'CMMS', detail: 'Work orders, spares, and maintenance plans', enabled: true },
  { name: 'Document Store', detail: 'SOPs, PDFs, drawings, and evidence files', enabled: true },
  { name: 'Email Digest', detail: 'Shift briefs and leadership summaries', enabled: false },
]

export default function Settings() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Workspace Settings</h2>
        <p className="mt-1 text-sm text-stone-500">
          Keep AI behavior aligned with plant policies, evidence standards, and team ownership.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-stone-700">Plant Name</span>
            <input
              type="text"
              defaultValue="PlantMind Demo Site"
              className="mt-2 w-full rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-stone-700">Default Evidence Threshold</span>
            <select className="mt-2 w-full rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100">
              <option>High confidence only</option>
              <option>Medium confidence or better</option>
              <option>Allow exploratory answers</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-stone-700">AI Response Policy</span>
            <textarea
              rows={4}
              defaultValue="Require source citations for safety, maintenance, compliance, and process-control recommendations."
              className="mt-2 w-full resize-none rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            Save settings
          </button>
          <button
            type="button"
            className="rounded-md border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Reset changes
          </button>
        </div>
      </section>

      <aside className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Integrations</h2>
        <div className="mt-4 divide-y divide-stone-100">
          {integrations.map((integration) => (
            <label key={integration.name} className="flex cursor-pointer items-start justify-between gap-4 py-4">
              <span>
                <span className="block font-medium text-stone-950">{integration.name}</span>
                <span className="mt-1 block text-sm leading-6 text-stone-500">{integration.detail}</span>
              </span>
              <input
                type="checkbox"
                defaultChecked={integration.enabled}
                className="mt-1 h-5 w-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
            </label>
          ))}
        </div>
      </aside>
    </div>
  )
}
