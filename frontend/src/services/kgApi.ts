import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8080' })


export const ingestText = (text: string, source?: string) => api.post('/kg/ingest', { text, source })
export const getGraph = (limit = 500) => api.get('/kg/graph', { params: { limit } })
