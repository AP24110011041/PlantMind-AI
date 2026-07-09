import { useEffect, useMemo, useRef, useState } from 'react'
import { getGraph, ingestText } from '../services/kgApi'

type Node = { id: string; label: string; group?: string; x?: number; y?: number; vx?: number; vy?: number }
type Link = { source: string; target: string; label?: string }

const WIDTH = 900
const HEIGHT = 520

function useForceSimulation(nodes: Node[], links: Link[]) {
  const rafRef = useRef<number | null>(null)
  const [ticks, setTicks] = useState(0)

  useEffect(() => {
    // simple force simulation stepping
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    nodes.forEach((n) => {
      if (n.x == null) n.x = Math.random() * WIDTH
      if (n.y == null) n.y = Math.random() * HEIGHT
      if (n.vx == null) n.vx = 0
      if (n.vy == null) n.vy = 0
    })

    const step = () => {
      // apply link spring
      links.forEach((l) => {
        const a = nodeMap.get(String(l.source))
        const b = nodeMap.get(String(l.target))
        if (!a || !b) return
        const dx = b.x! - a.x!
        const dy = b.y! - a.y!
        const dist = Math.max(1, Math.hypot(dx, dy))
        const k = 0.02
        const fx = (dx / dist) * (dist - 120) * k
        const fy = (dy / dist) * (dist - 120) * k
        a.vx! += fx
        a.vy! += fy
        b.vx! -= fx
        b.vy! -= fy
      })

      // repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = b.x! - a.x!
          const dy = b.y! - a.y!
          const dist = Math.max(1, Math.hypot(dx, dy))
          const minDist = 40
          if (dist < minDist) {
            const rep = (minDist - dist) * 0.05
            const ux = dx / dist
            const uy = dy / dist
            a.vx! -= ux * rep
            a.vy! -= uy * rep
            b.vx! += ux * rep
            b.vy! += uy * rep
          }
        }
      }

      // integration & damping
      nodes.forEach((n) => {
        n.vx! *= 0.9
        n.vy! *= 0.9
        n.x! += n.vx!
        n.y! += n.vy!
        // bounds
        n.x = Math.max(20, Math.min(WIDTH - 20, n.x!))
        n.y = Math.max(20, Math.min(HEIGHT - 20, n.y!))
      })

      setTicks((t) => t + 1)
      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links])

  return ticks
}

export default function KnowledgeGraph() {
  const [graph, setGraph] = useState<{ nodes: Node[]; links: Link[] }>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getGraph()
      .then((res) => {
        const edges = res.data.edges || []
        const nMap = new Map<string, Node>()
        const links: Link[] = []
        edges.forEach((e: any) => {
          const s = e.source
          const t = e.target
          if (!nMap.has(s)) nMap.set(s, { id: s, label: s, group: e.source_label })
          if (!nMap.has(t)) nMap.set(t, { id: t, label: t, group: e.target_label })
          links.push({ source: s, target: t, label: e.rel })
        })

        setGraph({ nodes: Array.from(nMap.values()), links })
      })
      .catch(() => setGraph({ nodes: [], links: [] }))
      .finally(() => setLoading(false))
  }, [])

  const fgData = useMemo(() => ({ nodes: graph.nodes, links: graph.links }), [graph])
  useForceSimulation(graph.nodes, graph.links)

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-950">Graph Explorer</h2>
            <p className="mt-1 text-sm text-stone-500">Interactive entity graph built from ingested documents.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
              onClick={() => {
                // trigger rebuild by re-ingesting a small sample; in production this would call server-side refresh
                setLoading(true)
                ingestText('Rebuild trigger: scan recent documents')
                  .then(() => getGraph())
                  .then((res) => {
                    const edges = res.data.edges || []
                    const nMap = new Map<string, Node>()
                    const links: Link[] = []
                    edges.forEach((e: any) => {
                      const s = e.source
                      const t = e.target
                      if (!nMap.has(s)) nMap.set(s, { id: s, label: s, group: e.source_label })
                      if (!nMap.has(t)) nMap.set(t, { id: t, label: t, group: e.target_label })
                      links.push({ source: s, target: t, label: e.rel })
                    })
                    setGraph({ nodes: Array.from(nMap.values()), links })
                  })
                  .catch(() => {})
                  .finally(() => setLoading(false))
              }}
            >
              Rebuild graph
            </button>
            <button
              type="button"
              className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
              onClick={() => {
                // zoom to fit could be implemented via ref to the graph component; kept simple here
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              Reset view
            </button>
          </div>
        </div>

        <div className="mt-6 h-[520px] w-full rounded border border-stone-100 overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center">Loading graph…</div>
          ) : (
            <svg width="100%" height="520" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="10" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="#999" />
                </marker>
              </defs>
              {graph.links.map((l, i) => {
                const s = graph.nodes.find((n) => n.id === l.source)
                const t = graph.nodes.find((n) => n.id === l.target)
                if (!s || !t) return null
                return (
                  <g key={`link-${i}`}>
                    <line
                      x1={s.x}
                      y1={s.y}
                      x2={t.x}
                      y2={t.y}
                      stroke="#cbd5e1"
                      strokeWidth={1.5}
                      markerEnd="url(#arrow)"
                    />
                    {l.label ? (
                      <text x={(s.x! + t.x!) / 2} y={(s.y! + t.y!) / 2 - 6} fontSize={10} fill="#065f46">
                        {l.label}
                      </text>
                    ) : null}
                  </g>
                )
              })}

              {graph.nodes.map((n) => (
                <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                  <circle r={18} fill={n.group ? '#a7f3d0' : '#bfdbfe'} stroke="#334155" strokeWidth={0.5} />
                  <text x={24} y={6} fontSize={12} fill="#0f172a">
                    {n.label}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Relationships</h2>
        <p className="mt-1 text-sm text-stone-500">Edges explain why an answer can connect an asset to a control or document.</p>
        <div className="mt-5 space-y-3 max-h-[520px] overflow-auto">
          {graph.links.map((edge) => (
            <div key={`${edge.source}-${edge.target}`} className="rounded-md border border-stone-200 p-3">
              <p className="text-sm font-medium text-stone-950">{edge.source}</p>
              <p className="my-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">{edge.label}</p>
              <p className="text-sm text-stone-600">{edge.target}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
