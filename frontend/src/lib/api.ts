import axios from 'axios'

const DEFAULT_API_BASE_URL = 'http://localhost:5000'
const baseURL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL

export const api = axios.create({
  baseURL,
  timeout: 60_000,
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getBackendErrorMessage(data: unknown, fallback: string) {
  if (!isRecord(data)) return fallback
  const ok = data.ok
  if (ok !== false) return fallback
  const error = data.error
  if (!isRecord(error)) return fallback
  const message = typeof error.message === 'string' ? error.message : fallback
  const details = error.details
  return details !== undefined ? `${message}: ${String(details)}` : message
}

api.interceptors.response.use(
  (response) => {
    // If the backend ever returns { ok: false } with a 2xx status,
    // normalize it into a thrown Error.
    const data: unknown = response?.data
    if (isRecord(data) && data.ok === false) {
      const err = new Error(getBackendErrorMessage(data, 'Request failed'))
      return Promise.reject(err)
    }
    return response
  },
  (error) => {
    // Normalize Axios errors into something UI-friendly.
    if (axios.isAxiosError(error)) {
      const data: unknown = error.response?.data
      const fallback = error.message || 'Request failed'
      const err = new Error(getBackendErrorMessage(data, fallback))
      return Promise.reject(err)
    }
    return Promise.reject(error)
  }
)

export type ParsedResume = {
  filename: string
  pages: number
  text: string
}

export type InterviewQuestion = {
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
}

export type AnswerEvaluation = {
  score: number
  verdict: string
  strengths: string[]
  improvements: string[]
  suggestedAnswer: string
  followUpQuestion: string
}

function unwrap<T>(responseData: unknown): T {
  if (isRecord(responseData) && responseData.ok === true) return responseData.data as T
  throw new Error(getBackendErrorMessage(responseData, 'Request failed'))
}

export async function uploadResume(file: File): Promise<ParsedResume> {
  const form = new FormData()
  form.append('file', file)

  const { data } = await api.post('/upload-resume', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return unwrap<ParsedResume>(data)
}

export async function generateQuestion(input: {
  resumeText?: string
  role?: string
  level?: string
  focusAreas?: string[]
  askedQuestions?: string[]
}): Promise<{ model: string; question: InterviewQuestion }> {
  const { data } = await api.post('/generate-question', input)
  return unwrap<{ model: string; question: InterviewQuestion }>(data)
}

export async function evaluateAnswer(input: {
  question: string
  answer: string
  resumeText?: string
  role?: string
  level?: string
}): Promise<{ model: string; evaluation: AnswerEvaluation }> {
  const { data } = await api.post('/evaluate-answer', input)
  return unwrap<{ model: string; evaluation: AnswerEvaluation }>(data)
}
