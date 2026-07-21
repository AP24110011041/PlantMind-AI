import { useEffect, useState } from "react";

const integrations = [
  {
    name: "OSIsoft PI Historian",
    detail: "Sensor and production time-series data",
    enabled: true,
  },
  {
    name: "SAP PM / IBM Maximo",
    detail: "Work orders, spares, and maintenance plans",
    enabled: true,
  },
  {
    name: "Knowledge Repository",
    detail: "SOPs, PDFs, drawings, and evidence files",
    enabled: true,
  },
  {
    name: "Email Digest",
    detail: "Shift briefs and leadership summaries",
    enabled: false,
  },
];

export default function Settings() {
  const [plantName, setPlantName] = useState("");
  const [threshold, setThreshold] = useState("High confidence only");
  const [policy, setPolicy] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [model, setModel] = useState("llama3");

  useEffect(() => {
    const saved = localStorage.getItem("plantmind-settings");

    if (saved) {
      const settings = JSON.parse(saved);

      setPlantName(settings.plantName);
      setThreshold(settings.threshold);
      setPolicy(settings.policy);
      setOllamaUrl(settings.ollamaUrl ?? "http://localhost:11434");
      setModel(settings.model ?? "llama3");
    } else {
      setPlantName("Veritas AI Demo Plant");
      setThreshold("High confidence only");
      setPolicy(
        "Require source citations for safety, maintenance, compliance, and process-control recommendations."
      );
      setOllamaUrl("http://localhost:11434");
      setModel("llama3");
    }
  }, []);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">

        <h2 className="text-lg font-semibold text-stone-950">
          Workspace Configuration
        </h2>

        <p className="mt-1 text-sm text-stone-500">
          Keep AI behavior aligned with plant policies, evidence standards,
          and team ownership.
        </p>
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
  <h3 className="text-base font-semibold text-emerald-800">
    🟢 AI System Status
  </h3>

  <p className="mt-2 text-sm text-emerald-700">
    ✓ Ollama Connected <br />
    ✓ FastAPI Running <br />
    ✓ ChromaDB Active <br />
    ✓ Vector Store Ready
  </p>
</div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">

          {/* Plant Name */}
          <label className="block">
            <span className="text-sm font-semibold text-stone-700">
              Plant Name
            </span>

            <input
              type="text"
              value={plantName}
              onChange={(e) => setPlantName(e.target.value)}
              className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          {/* Ollama URL */}
          <label className="block">
            <span className="text-sm font-semibold text-stone-700">
              Ollama Server URL
            </span>

            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          {/* AI Model */}
          <label className="block">
            <span className="text-sm font-semibold text-stone-700">
              AI Model
            </span>

            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="deepseek-r1">deepseek-r1 ⭐ Recommended</option>
<option value="llama3">llama3</option>
<option value="mistral">mistral</option>
<option value="phi3">phi3</option>
            </select>
          </label>

          {/* Evidence Threshold */}
          <label className="block">
            <span className="text-sm font-semibold text-stone-700">
              Default Evidence Threshold
            </span>

            <select
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option>High confidence only</option>
              <option>Medium confidence or better</option>
              <option>Allow exploratory answers</option>
            </select>
          </label>

          {/* AI Response Policy */}
          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-stone-700">
              AI Response Policy
            </span>

            <textarea
              rows={4}
              value={policy}
              onChange={(e) => setPolicy(e.target.value)}
              className="mt-2 w-full resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">

          <button
            type="button"
            onClick={() => {
              localStorage.setItem(
                "plantmind-settings",
                JSON.stringify({
                  plantName,
                  threshold,
                  policy,
                  ollamaUrl,
                  model,
                })
              );

              alert("✅ Workspace settings saved successfully!");
            }}
            className="rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            Save Settings
          </button>

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("plantmind-settings");

              setPlantName("Veritas AI Demo Plant");
              setThreshold("High confidence only");
              setPolicy(
                "Require source citations for safety, maintenance, compliance, and process-control recommendations."
              );
              setOllamaUrl("http://localhost:11434");
              setModel("llama3");
            }}
            className="rounded-md border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Reset Changes
          </button>

        </div>

      </section>

      <aside className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">

        <h2 className="text-lg font-semibold text-stone-950">
          Enterprise Integrations
        </h2>

        <div className="mt-4 divide-y divide-stone-100">

          {integrations.map((integration) => (
            <label
              key={integration.name}
              className="flex cursor-pointer items-start justify-between gap-4 py-4"
            >
              <span>
                <span className="block font-medium text-stone-950">
                  {integration.name}
                </span>

                <span className="mt-1 block text-sm leading-6 text-stone-500">
                  {integration.detail}
                </span>
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
      <div className="col-span-full mt-6 rounded-lg border border-stone-200 bg-white p-4 text-center text-sm text-stone-500">
  Veritas AI • Powered by React + FastAPI + Ollama + ChromaDB
  <br />
  ET AI Hackathon 2026
</div>

    </div>
  );
}