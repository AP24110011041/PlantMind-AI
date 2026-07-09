export type Citation = {
  source_id: number
  filename: string
  chunk_id: number | null
  text: string
  distance: number | null
}

export type ChatResponse = {
  answer: string
  citations: Citation[]
}

const API_BASE_URL = 'http://127.0.0.1:8000'

const getErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as { detail?: string }
    return body.detail ?? 'Chat request failed.'
  } catch {
    return 'Chat request failed.'
  }
}

export const askPlantMind = async (question: string): Promise<ChatResponse> => {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  return response.json() as Promise<ChatResponse>
}
