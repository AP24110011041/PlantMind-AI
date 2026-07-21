export type DocumentStatus = 'Indexed' | 'Uploaded' | 'Processing' | 'Needs Review' | 'Failed'

export type UploadedDocument = {
  id: string
  fileName: string
  uploadDate: string
  size: string
  status: DocumentStatus
}
