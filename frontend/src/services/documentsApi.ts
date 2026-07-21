export type UploadDocumentResponse = {
  filename: string
  status: 'uploaded' | 'indexed' | 'failed'
  pages?: number
  characters?: number
  chunks_indexed?: number
}

export type DocumentListItem = {
  id: string
  filename: string
  uploadDate: string
  size: string
  status: 'Indexed' | 'Uploaded' | 'Processing' | 'Needs Review' | 'Failed'
}

export type DeleteDocumentResponse = {
  success: true
  deleted_document: string
  deleted_chunks: number
}

const API_BASE_URL = 'http://127.0.0.1:8080'

const getErrorMessage = (responseText: string) => {
  if (!responseText) {
    return 'Request failed.'
  }

  try {
    const response = JSON.parse(responseText) as { detail?: string }
    return response.detail ?? 'Request failed.'
  } catch {
    return 'Request failed.'
  }
}

export const getDocuments = () =>
  new Promise<DocumentListItem[]>((resolve, reject) => {
    const request = new XMLHttpRequest()

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          const response = JSON.parse(request.responseText) as DocumentListItem[]
          resolve(response)
        } catch {
          reject(new Error('Invalid response from documents server.'))
        }
        return
      }

      reject(new Error(getErrorMessage(request.responseText)))
    }

    request.onerror = () => {
      reject(new Error('Unable to reach the documents server.'))
    }

    request.open('GET', `${API_BASE_URL}/documents`)
    request.send()
  })

export const getDocumentFileUrl = (documentId: string) =>
  `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/view`

export const getDocumentDownloadUrl = (documentId: string) =>
  `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/download`

export const deleteDocument = (documentId: string) =>
  new Promise<DeleteDocumentResponse>((resolve, reject) => {
    const request = new XMLHttpRequest()

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          resolve(JSON.parse(request.responseText) as DeleteDocumentResponse)
        } catch {
          reject(new Error('Document deleted, but the server returned an invalid response.'))
        }
        return
      }

      reject(new Error(getErrorMessage(request.responseText)))
    }

    request.onerror = () => {
      reject(new Error('Unable to reach the documents server.'))
    }

    request.open('DELETE', `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}`)
    request.send()
  })

export const uploadDocument = (
  file: File,
  onProgress?: (progress: number) => void,
) =>
  new Promise<UploadDocumentResponse>((resolve, reject) => {
    const request = new XMLHttpRequest()
    const formData = new FormData()

    formData.append('file', file)

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return
      }

      onProgress?.(Math.round((event.loaded / event.total) * 100))
    }

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          resolve(JSON.parse(request.responseText) as UploadDocumentResponse)
        } catch {
          reject(new Error('Upload succeeded, but the server returned an invalid response.'))
        }
        return
      }

      reject(new Error(getErrorMessage(request.responseText)))
    }

    request.onerror = () => {
      reject(new Error('Unable to reach the upload server.'))
    }

    request.open('POST', `${API_BASE_URL}/upload`)
    request.send(formData)
  })
