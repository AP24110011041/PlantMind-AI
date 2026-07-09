export type DocumentStatus = 'Indexed' | 'Uploaded' | 'Processing' | 'Needs Review'

export type UploadedDocument = {
  id: string
  fileName: string
  uploadDate: string
  size: string
  status: DocumentStatus
}
