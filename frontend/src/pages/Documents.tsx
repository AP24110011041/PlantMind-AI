import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileCheck2, Files, HardDrive, ShieldAlert } from 'lucide-react'

import DashboardCard from '../components/DashboardCard'
import DocumentUploadDropzone from '../components/DocumentUploadDropzone'
import DocumentsTable from '../components/DocumentsTable'
import { deleteDocument, getDocumentDownloadUrl, getDocumentFileUrl, getDocuments, uploadDocument } from '../services/documentsApi'
import type { UploadedDocument } from '../types/documents'

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
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadMessage, setUploadMessage] = useState<UploadMessage | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const backendDocuments = await getDocuments()

        const mappedDocuments: UploadedDocument[] = backendDocuments.map((document) => ({
          id: document.id,
          fileName: document.filename,
          uploadDate: document.uploadDate,
          size: document.size,
          status: document.status,
        }))

        setDocuments(mappedDocuments)
      } catch {
        setUploadMessage({ type: 'error', text: 'Unable to load documents from the backend.' })
      }
    }

    void loadDocuments()
  }, [])

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

  const handleFilesSelected = async (files: File[]) => {
    if (isUploading || !files.length) return

    const now = new Date()
    const uploadedDocuments: UploadedDocument[] = []

    setIsUploading(true)
    setUploadProgress(0)
    setUploadMessage({ type: 'info', text: `Preparing ${files.length} file(s) for upload...` })

    try {
      for (const [index, file] of files.entries()) {
        setUploadMessage({ type: 'info', text: `Uploading ${file.name} (${index + 1}/${files.length})` })

        try {
          const response = await uploadDocument(file, (progress) => {
            setUploadProgress(progress)
          })

          const status: UploadedDocument['status'] =
            (response.chunks_indexed ?? 0) > 0 ? 'Indexed' : 'Failed'

          uploadedDocuments.push({
            id: `uploaded-${now.getTime()}-${index}`,
            fileName: response.filename || file.name,
            uploadDate: formatUploadDate(now),
            size: formatFileSize(file.size),
            status,
          })
        } catch {
          uploadedDocuments.push({
            id: `uploaded-${now.getTime()}-${index}`,
            fileName: file.name,
            uploadDate: formatUploadDate(now),
            size: formatFileSize(file.size),
            status: 'Failed',
          })
        }
      }

      const backendDocuments = await getDocuments()
      const mappedDocuments: UploadedDocument[] = backendDocuments.map((document) => ({
        id: document.id,
        fileName: document.filename,
        uploadDate: document.uploadDate,
        size: document.size,
        status: document.status,
      }))

      setDocuments(mappedDocuments)
      setUploadProgress(100)
      setUploadMessage({
        type: 'success',
        text: uploadedDocuments.every((document) => document.status === 'Indexed')
          ? `Uploaded ${uploadedDocuments.length} file(s)`
          : `Processed ${uploadedDocuments.length} file(s)`,
      })
    } catch {
      setUploadMessage({ type: 'error', text: 'Upload failed.' })
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 600))
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handlePreviewDocument = (documentId: string) => {
    const previewUrl = getDocumentFileUrl(documentId)
    window.open(previewUrl, '_blank', 'noopener,noreferrer')
  }

  const handleDownloadDocument = (documentId: string) => {
    const downloadUrl = getDocumentDownloadUrl(documentId)
    window.open(downloadUrl, '_blank', 'noopener,noreferrer')
  }
  const handleSummarize = (document: UploadedDocument) => {
  navigate('/ai-chat', {
    state: {
      question: `Summarize the document "${document.fileName}".`,
    },
  })
}

  const handleRemoveDocument = async (documentId: string) => {
    try {
      await deleteDocument(documentId)
      const backendDocuments = await getDocuments()
      const mappedDocuments: UploadedDocument[] = backendDocuments.map((document) => ({
        id: document.id,
        fileName: document.filename,
        uploadDate: document.uploadDate,
        size: document.size,
        status: document.status,
      }))

      setDocuments(mappedDocuments)
      setUploadMessage({ type: 'success', text: 'Document deleted.' })
    } catch {
      setUploadMessage({ type: 'error', text: 'Failed to delete document.' })
    }
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

      <DocumentsTable
  documents={documents}
  onPreview={handlePreviewDocument}
  onDownload={handleDownloadDocument}
  onRemove={handleRemoveDocument}
  onSummarize={handleSummarize}
/>
    </div>
  )
}
