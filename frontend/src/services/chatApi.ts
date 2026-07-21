export type Citation = {
  source_id: number
  filename: string
  page_number?: number | null
  chunk_id: number | null
  text: string
  similarity?: number
  distance: number | null
  citation_label?: string
}

export type ChatResponse = {
  answer: string
  citations: Citation[]
  confidence?: number
}

const API_BASE_URL = "http://127.0.0.1:8080"

async function getErrorMessage(response: Response) {
  try {
    const body = await response.json()
    return body.detail ?? "Chat request failed."
  } catch {
    return "Chat request failed."
  }
}

export async function askPlantMind(
  question: string
): Promise<ChatResponse> {
  console.log("Fetching backend...")
  console.log("Question:", question)
  console.log("URL:", `${API_BASE_URL}/chat`)

  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  })

  console.log("HTTP Status:", response.status)

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  const data = await response.json()
  console.log("Backend Response:", data)

  return data
}