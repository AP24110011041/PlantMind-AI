import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

type EmptyStateProps = {
  title?: string
  description?: string
  children?: ReactNode
}

export default function EmptyState({
  title = 'No documents yet',
  description = 'Upload PDF files to begin building your document workspace. Drag and drop or use the upload panel above.',
  children,
}: EmptyStateProps) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-md bg-slate-900">
        <Inbox className="h-6 w-6 text-cyan-300" aria-hidden />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}
