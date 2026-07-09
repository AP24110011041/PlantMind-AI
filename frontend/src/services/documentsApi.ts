export type UploadDocumentResponse = {
  filename: string
  status: 'uploaded'
  pages?: number
  characters?: number
  chunks_indexed?: number
}

const API_BASE_URL = 'http://127.0.0.1:8000'

const getErrorMessage = (responseText: string) => {
  if (!responseText) {
    return 'Upload failed.'
  }

  try {
    const response = JSON.parse(responseText) as { detail?: string }
    return response.detail ?? 'Upload failed.'
  } catch {
    return 'Upload failed.'
  }
}

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
