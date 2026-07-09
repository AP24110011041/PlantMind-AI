import { Download, Eye, Trash2 } from 'lucide-react'

import type { DocumentStatus, UploadedDocument } from '../types/documents'

type DocumentsTableProps = {
  documents: UploadedDocument[]
  onRemove: (documentId: string) => void
}

const statusStyles: Record<DocumentStatus, string> = {
  Indexed: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  Uploaded: 'border-[#06B6D4]/25 bg-[#06B6D4]/10 text-[#67E8F9]',
  Processing: 'border-[#06B6D4]/25 bg-[#06B6D4]/10 text-[#67E8F9]',
  'Needs Review': 'border-amber-400/25 bg-amber-400/10 text-amber-300',
}

export default function DocumentsTable({ documents, onRemove }: DocumentsTableProps) {
  return (
    <section className="rounded-lg border border-slate-800 bg-[#111827] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Uploaded Documents</h2>
          <p className="mt-1 text-sm text-slate-400">
            Seeded dummy records plus PDFs uploaded in this session.
          </p>
        </div>
        <span className="w-fit rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300">
          {documents.length} files
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-slate-800">
        <div className="hidden grid-cols-[1.5fr_0.85fr_0.65fr_0.75fr_0.9fr] gap-4 border-b border-slate-800 bg-slate-950/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
          <span>File Name</span>
          <span>Upload Date</span>
          <span>Size</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {documents.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="font-medium text-white">No documents uploaded</p>
            <p className="mt-2 text-sm text-slate-500">Add a PDF to populate the table.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {documents.map((document) => (
              <article
                key={document.id}
                className="grid gap-3 px-4 py-4 lg:grid-cols-[1.5fr_0.85fr_0.65fr_0.75fr_0.9fr] lg:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{document.fileName}</p>
                  <p className="mt-1 text-xs text-slate-500 lg:hidden">
                    {document.uploadDate} / {document.size}
                  </p>
                </div>
                <p className="hidden text-sm text-slate-400 lg:block">{document.uploadDate}</p>
                <p className="hidden text-sm text-slate-400 lg:block">{document.size}</p>
                <span
                  className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[document.status]}`}
                >
                  {document.status}
                </span>
                <div className="flex items-center gap-2 lg:justify-end">
                  <button
                    type="button"
                    aria-label={`View ${document.fileName}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-[#06B6D4]/60 hover:bg-[#06B6D4]/10 hover:text-[#67E8F9]"
                  >
                    <Eye aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Download ${document.fileName}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-[#06B6D4]/60 hover:bg-[#06B6D4]/10 hover:text-[#67E8F9]"
                  >
                    <Download aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${document.fileName}`}
                    onClick={() => onRemove(document.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-rose-400/60 hover:bg-rose-400/10 hover:text-rose-300"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
