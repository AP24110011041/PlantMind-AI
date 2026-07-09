const nodes = [
  { label: 'Compressor C-12', kind: 'Asset', className: 'bg-emerald-100 text-emerald-900' },
  { label: 'Bearing Vibration', kind: 'Symptom', className: 'bg-amber-100 text-amber-900' },
  { label: 'Vendor Manual 8.2', kind: 'Document', className: 'bg-sky-100 text-sky-900' },
  { label: 'Lockout Procedure', kind: 'Control', className: 'bg-rose-100 text-rose-900' },
  { label: 'Work Order 4182', kind: 'Task', className: 'bg-stone-200 text-stone-900' },
  { label: 'Safety Audit Q3', kind: 'Audit', className: 'bg-teal-100 text-teal-900' },
]

const relationships = [
  { source: 'Compressor C-12', relation: 'shows', target: 'Bearing Vibration' },
  { source: 'Bearing Vibration', relation: 'references', target: 'Vendor Manual 8.2' },
  { source: 'Work Order 4182', relation: 'requires', target: 'Lockout Procedure' },
  { source: 'Safety Audit Q3', relation: 'checks', target: 'Lockout Procedure' },
]

export default function KnowledgeGraph() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-950">Graph Explorer</h2>
            <p className="mt-1 text-sm text-stone-500">
              A simplified view of the entity graph behind PlantMind answers.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Rebuild graph
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nodes.map((node) => (
            <article key={node.label} className={`rounded-lg border border-white p-4 shadow-sm ${node.className}`}>
              <p className="text-xs font-bold uppercase tracking-wide opacity-70">{node.kind}</p>
              <h3 className="mt-2 font-semibold">{node.label}</h3>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50 p-4">
          <p className="text-sm font-semibold text-stone-700">Selected Path</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-700">
            <span className="rounded-md bg-white px-3 py-2 shadow-sm">Compressor C-12</span>
            <span>-&gt;</span>
            <span className="rounded-md bg-white px-3 py-2 shadow-sm">Bearing Vibration</span>
            <span>-&gt;</span>
            <span className="rounded-md bg-white px-3 py-2 shadow-sm">Vendor Manual 8.2</span>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Relationships</h2>
        <p className="mt-1 text-sm text-stone-500">
          Edges explain why an answer can connect an asset to a control or document.
        </p>
        <div className="mt-5 space-y-3">
          {relationships.map((edge) => (
            <div key={`${edge.source}-${edge.target}`} className="rounded-md border border-stone-200 p-3">
              <p className="text-sm font-medium text-stone-950">{edge.source}</p>
              <p className="my-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                {edge.relation}
              </p>
              <p className="text-sm text-stone-600">{edge.target}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
