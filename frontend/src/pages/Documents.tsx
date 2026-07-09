import { useMemo, useState } from 'react'
import { FileCheck2, Files, HardDrive, ShieldAlert } from 'lucide-react'

import DashboardCard from '../components/DashboardCard'
import DocumentUploadDropzone from '../components/DocumentUploadDropzone'
import DocumentsTable from '../components/DocumentsTable'
import type { UploadedDocument } from '../types/documents'

const initialDocuments: UploadedDocument[] = [
  {
    id: 'doc-001',
    fileName: 'Boiler Startup SOP.pdf',
    uploadDate: 'Jul 09, 2026',
    size: '2.4 MB',
    status: 'Indexed',
  },
  {
    id: 'doc-002',
    fileName: 'Compressor C-12 Maintenance Manual.pdf',
    uploadDate: 'Jul 08, 2026',
    size: '8.9 MB',
    status: 'Needs Review',
  },
  {
    id: 'doc-003',
    fileName: 'Quarterly Safety Audit Evidence.pdf',
    uploadDate: 'Jul 07, 2026',
    size: '5.1 MB',
    status: 'Indexed',
  },
]

type UploadMessage = {
  type: 'success' | 'error' | 'info'
  text: string
}

const uploadMessageStyles: Record<UploadMessage['type'], string> = {
  success: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  error: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
  info: 'border-[#06B6D4]/25 bg-[#06B6D4]/10 text-cyan-100',
}

const formatFileSize = (sizeInBytes: number) => {
  if (sizeInBytes < 1024 * 1024) {
    return `${Math.max(sizeInBytes / 1024, 1).toFixed(1)} KB`
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatUploadDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date)

export default function Documents() {
  const [documents, setDocuments] = useState<UploadedDocument[]>(initialDocuments)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadMessage, setUploadMessage] = useState<UploadMessage | null>(null)

  const storageUsed = useMemo(() => {
    const totalMegabytes = documents.reduce((total, document) => {
      const numericSize = Number.parseFloat(document.size)
      return document.size.endsWith('KB') ? total + numericSize / 1024 : total + numericSize
    }, 0)

    return `${totalMegabytes.toFixed(1)} MB`
  }, [documents])

  const needsReviewCount = documents.filter((document) => document.status === 'Needs Review').length
  const uploadedCount = documents.filter((document) =>
    ['Indexed', 'Uploaded'].includes(document.status),
  ).length

  // Simulate upload locally (do NOT connect to backend)
  const handleFilesSelected = async (files: File[]) => {
    if (isUploading || !files.length) return

    const now = new Date()
    const uploadedDocuments: UploadedDocument[] = []

    setIsUploading(true)
    setUploadProgress(0)
    setUploadMessage({ type: 'info', text: `Preparing ${files.length} file(s) for upload...` })

    // Simulate per-file upload progress
    for (const [index, file] of files.entries()) {
      setUploadMessage({ type: 'info', text: `Uploading ${file.name} (${index + 1}/${files.length})` })

      // Simulate incremental progress
      for (let p = 0; p <= 100; p += Math.floor(10 + Math.random() * 20)) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 120))
        const overall = Math.min(100, Math.round(((index + p / 100) / files.length) * 100))
        setUploadProgress(overall)
      }

      uploadedDocuments.push({
        id: `uploaded-${now.getTime()}-${index}`,
        fileName: file.name,
        uploadDate: formatUploadDate(now),
        size: formatFileSize(file.size),
        status: 'Uploaded',
      })
    }

    setDocuments((currentDocuments) => [...uploadedDocuments, ...currentDocuments])
    setUploadProgress(100)
    setUploadMessage({ type: 'success', text: `Added ${uploadedDocuments.length} file(s)` })
    // brief pause so user sees completion
    await new Promise((r) => setTimeout(r, 600))
    setIsUploading(false)
    setUploadProgress(0)
  }

  const handleRemoveDocument = (documentId: string) => {
    setDocuments((currentDocuments) =>
      currentDocuments.filter((document) => document.id !== documentId),
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-800 bg-[#111827] p-5 shadow-xl shadow-slate-950/20">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#06B6D4]">
              Documents Module
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
              PDF document workspace
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
              Upload PDFs to the FastAPI backend and review document status in a production-ready
              layout. Seeded rows remain as dummy data.
            </p>
          </div>
          <span className="w-fit rounded-full border border-[#06B6D4]/25 bg-[#06B6D4]/10 px-3 py-1.5 text-xs font-semibold text-[#67E8F9]">
            Backend upload connected
          </span>
        </div>
      </section>

      <section aria-label="Document summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          title="Total Documents"
          value={String(documents.length)}
          detail="PDF records currently visible in the local document table."
          trend="Dummy data"
          tone="cyan"
          icon={Files}
        />
        <DashboardCard
          title="Uploaded"
          value={String(uploadedCount)}
          detail="Documents currently available in the uploaded document list."
          trend="Backend POST"
          tone="green"
          icon={FileCheck2}
        />
        <DashboardCard
          title="Needs Review"
          value={String(needsReviewCount)}
          detail="Documents flagged in dummy data for human validation."
          trend="No AI logic"
          tone="amber"
          icon={ShieldAlert}
        />
        <DashboardCard
          title="Storage Used"
          value={storageUsed}
          detail="Estimated from dummy records and PDFs added in this browser session."
          trend="Client-side"
          tone="rose"
          icon={HardDrive}
        />
      </section>

      <DocumentUploadDropzone
        onFilesSelected={handleFilesSelected}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
      />

      {uploadMessage ? (
        <div
          role={uploadMessage.type === 'error' ? 'alert' : 'status'}
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${uploadMessageStyles[uploadMessage.type]}`}
        >
          {uploadMessage.text}
        </div>
      ) : null}

      <DocumentsTable documents={documents} onRemove={handleRemoveDocument} />
    </div>
  )
}
