import { useRef, useState } from 'react'
import { FileUp, UploadCloud } from 'lucide-react'

type DocumentUploadDropzoneProps = {
  onFilesSelected: (files: File[]) => void
  isUploading?: boolean
  uploadProgress?: number
}

export default function DocumentUploadDropzone({
  onFilesSelected,
  isUploading = false,
  uploadProgress = 0,
}: DocumentUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) {
      return
    }

    const pdfFiles = Array.from(fileList).filter(
      (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
    )

    if (pdfFiles.length > 0) {
      onFilesSelected(pdfFiles)
    }
  }

  const openFilePicker = () => {
    if (!isUploading) {
      inputRef.current?.click()
    }
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-[#111827] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Upload PDFs</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Drag and drop PDF files into the workspace. Files upload to the FastAPI backend.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#06B6D4]/25 bg-[#06B6D4]/10 px-3 py-1.5 text-xs font-semibold text-[#67E8F9]">
          <FileUp aria-hidden="true" className="h-4 w-4" />
          PDF only
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-disabled={isUploading}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openFilePicker()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          if (isUploading) {
            return
          }
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          if (isUploading) {
            return
          }
          handleFiles(event.dataTransfer.files)
        }}
        className={`mt-5 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition ${
          isDragging
            ? 'border-[#06B6D4] bg-[#06B6D4]/10'
            : 'border-slate-700 bg-slate-950/40 hover:border-[#06B6D4]/60 hover:bg-[#06B6D4]/5'
        } ${isUploading ? 'cursor-not-allowed opacity-75' : ''}`}
      >
        <div className="rounded-full border border-[#06B6D4]/25 bg-[#06B6D4]/10 p-4 text-[#67E8F9]">
          <UploadCloud aria-hidden="true" className="h-8 w-8" />
        </div>
        <p className="mt-4 text-base font-semibold text-white">
          {isUploading ? 'Uploading PDF...' : 'Drop PDF files here'}
        </p>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
          {isUploading
            ? 'Keep this page open while the upload finishes.'
            : 'Or click to browse from your device. Multiple PDFs can be added at once.'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          disabled={isUploading}
          className="sr-only"
          onChange={(event) => {
            handleFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </div>

      {(isUploading || uploadProgress > 0) ? (
        <div className="mt-4" aria-live="polite">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Upload progress</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950">
            <div
              className="h-full rounded-full bg-[#06B6D4] transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}
