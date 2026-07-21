import { useEffect, useState } from "react";
import axios from "axios";

type Analytics = {
  total_documents: number;
  indexed_documents: number;
  uploaded_documents: number;
  total_pages: number;
  total_chunks: number;
  average_chunks_per_document: number;
  total_storage: string;
};

function SmallStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-stone-900">{value}</p>
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const response = await axios.get(
          "http://127.0.0.1:8080/analytics"
        );
        setData(response.data);
      } catch (err) {
        console.error("Analytics Error:", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  if (!data) {
    return (
      <div className="p-8 text-red-500">
        Failed to load analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
  <div>
    <h1 className="text-3xl font-bold text-stone-900">
      Analytics Dashboard
    </h1>

    <p className="mt-2 text-stone-500">
      Live analytics from the PlantMind AI backend.
    </p>
  </div>
      <div className="grid grid-cols-4 gap-4">
        <SmallStat label="Documents" value={data.total_documents} />
        <SmallStat label="Indexed" value={data.indexed_documents} />
        <SmallStat label="Uploaded" value={data.uploaded_documents} />
        <SmallStat label="Storage" value={data.total_storage} />
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Document Metrics</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <SmallStat
  label="Index Success"
  value={
    data.total_documents
      ? `${Math.round(
          (data.indexed_documents / data.total_documents) * 100
        )}%`
      : "0%"
  }
/>

<SmallStat
  label="Pending Review"
  value={data.uploaded_documents}
/>

<SmallStat
  label="System Status"
  value="Healthy"
/>
          <SmallStat label="Total Pages" value={data.total_pages} />
          <SmallStat label="Total Chunks" value={data.total_chunks} />
          <SmallStat label="Avg Chunks / Document" value={data.average_chunks_per_document} />
        </div>
      </section>
    </div>
  );
}