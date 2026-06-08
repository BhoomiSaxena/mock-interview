import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaLightbulb,
  FaPaperPlane,
  FaRegFilePdf,
  FaSpinner,
  FaTimes,
  FaUpload,
} from 'react-icons/fa'
import AnimatedCard from '../components/AnimatedCard'
import { MotionButton } from '../components/MotionPrimitives'
import ChatThread, { type ChatMessage as ThreadMessage } from '../components/chat/ChatThread'
import { type AnswerEvaluation, evaluateAnswer, generateQuestion, uploadResume } from '../lib/api'
import { getErrorMessage } from '../lib/errors'

type Topic = { label: string; score: number }
type ChatMsg = ThreadMessage

function SkeletonLine({ widthClassName = 'w-full' }: { widthClassName?: string }) {
  return <div className={`h-3 ${widthClassName} animate-pulse rounded bg-white/10`} />
}

function SkeletonBlock() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-pulse rounded bg-white/10" />
        <SkeletonLine widthClassName="w-28" />
      </div>
      <div className="mt-3 space-y-2">
        <SkeletonLine />
        <SkeletonLine widthClassName="w-11/12" />
        <SkeletonLine widthClassName="w-9/12" />
      </div>
    </div>
  )
}

function uid() {
  return Math.random().toString(16).slice(2)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractTopics(text: string): Topic[] {
  const t = (text || '').toLowerCase()
  if (!t.trim()) return []

  const commonSkills = [
    'javascript',
    'typescript',
    'react',
    'next.js',
    'node',
    'node.js',
    'express',
    'html',
    'css',
    'tailwind',
    'redux',
    'python',
    'java',
    'c++',
    'c#',
    'sql',
    'postgres',
    'postgresql',
    'mysql',
    'mongodb',
    'redis',
    'aws',
    'azure',
    'gcp',
    'docker',
    'kubernetes',
    'git',
    'github',
    'linux',
    'rest',
    'api',
    'microservices',
    'data structures',
    'algorithms',
    'dsa',
    'system design',
    'oop',
    'unit testing',
    'jest',
    'vitest',
  ]

  const hits = new Map<string, number>()
  for (const skill of commonSkills) {
    const re = new RegExp(`\\b${escapeRegExp(skill)}\\b`, 'gi')
    const count = (text.match(re) || []).length
    if (count > 0) hits.set(skill, count)
  }

  // Fallback: top frequent meaningful words
  const stop = new Set([
    'the',
    'and',
    'for',
    'with',
    'from',
    'this',
    'that',
    'your',
    'you',
    'their',
    'have',
    'has',
    'had',
    'was',
    'were',
    'are',
    'to',
    'of',
    'in',
    'on',
    'at',
    'as',
    'by',
    'an',
    'a',
    'or',
    'is',
    'be',
    'it',
    'we',
    'i',
    'my',
    'our',
    'using',
    'used',
    'built',
    'build',
    'project',
    'projects',
    'experience',
    'skills',
  ])

  const words = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+.#\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !stop.has(w))

  const freq = new Map<string, number>()
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1)

  const fallback = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .filter(([w]) => !hits.has(w))

  for (const [w, c] of fallback) hits.set(w, c)

  return [...hits.entries()]
    .map(([label, score]) => ({ label, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 16)
}

export default function ResumeInterviewPage() {
  const [file, setFile] = useState<File | null>(null)
  const [parsedText, setParsedText] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [latestEvaluation, setLatestEvaluation] = useState<AnswerEvaluation | null>(null)

  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const topics = useMemo(() => extractTopics(parsedText), [parsedText])
  const topTopicLabels = useMemo(() => topics.slice(0, 8).map((t) => t.label), [topics])

  // Interview state
  const [started, setStarted] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: uid(), role: 'assistant', text: 'Upload your resume to begin.' },
  ])
  const [askedQuestions, setAskedQuestions] = useState<string[]>([])
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  const preview = useMemo(() => parsedText.slice(0, 1200), [parsedText])

  async function onUpload() {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const res = await uploadResume(file)
      setParsedText(res.text)
      localStorage.setItem('aimia_resume_text', res.text)

      setLatestEvaluation(null)

      // Start the resume interview on this page immediately after parsing.
      setStarted(false)
      setAskedQuestions([])
      setCurrentQuestion('')
      setAnswer('')

      try {
        const focusAreas = extractTopics(res.text)
          .slice(0, 8)
          .map((t) => t.label)

        const q = await generateQuestion({
          resumeText: res.text,
          focusAreas,
          askedQuestions: [],
        })

        setStarted(true)
        setCurrentQuestion(q.question.question)
        setAskedQuestions([q.question.question])
        setMessages([{ id: uid(), role: 'assistant', text: q.question.question }])
      } catch (e: unknown) {
        // If auto-start fails, keep the resume parsed and let the user start manually.
        setStarted(false)
        setMessages([
          { id: uid(), role: 'assistant', text: 'Resume parsed. Click “Start Interview” when ready.' },
        ])
        setError(getErrorMessage(e, 'Failed to generate question'))
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to upload/parse resume'))
    } finally {
      setBusy(false)
    }
  }

  async function startInterview() {
    if (!parsedText.trim()) return
    setBusy(true)
    setError(null)
    try {
      const q = await generateQuestion({
        resumeText: parsedText,
        focusAreas: topTopicLabels,
        askedQuestions,
      })
      setStarted(true)
      setCurrentQuestion(q.question.question)
      setAskedQuestions((prev) => [...prev, q.question.question])
      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', text: q.question.question }])
      setLatestEvaluation(null)
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to generate question'))
    } finally {
      setBusy(false)
    }
  }

  async function sendAnswer() {
    if (!started || !currentQuestion.trim()) {
      setError('Start the interview first.')
      return
    }
    const a = answer.trim()
    if (!a) return

    setAnswer('')
    setMessages((prev) => [...prev, { id: uid(), role: 'user', text: a }])

    setBusy(true)
    setError(null)
    try {
      const ev = await evaluateAnswer({
        question: currentQuestion,
        answer: a,
        resumeText: parsedText,
      })

      setLatestEvaluation(ev.evaluation)
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          text: `Feedback: ${ev.evaluation.verdict} (Score ${ev.evaluation.score}/10)`
        },
      ])

      const next = await generateQuestion({
        resumeText: parsedText,
        focusAreas: topTopicLabels,
        askedQuestions: [...askedQuestions, currentQuestion].slice(0, 50),
      })
      setCurrentQuestion(next.question.question)
      setAskedQuestions((prev) => [...prev, next.question.question])
      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', text: next.question.question }])
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to evaluate/generate next question'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative space-y-4">
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-[40px] bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-600/10 blur-2xl" />
      <motion.section
        className="glass relative overflow-hidden p-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">Resume Interview</div>
            <div className="text-xl font-semibold">Upload PDF → tailored questions</div>
          </div>
          <div className="hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur px-3 py-2 text-xs text-white/60 md:block">
            Endpoint: /upload-resume
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr,auto]">
          <div
            className={
              `group rounded-2xl border-2 border-dashed p-8 text-center transition ` +
              (isDragging
                ? 'border-indigo-400/60 bg-white/10'
                : 'border-white/15 bg-white/5 hover:border-indigo-400/40 hover:bg-white/10')
            }
            onDragEnter={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDragging(true)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDragging(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDragging(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDragging(false)
              const f = e.dataTransfer.files?.[0]
              if (f) setFile(f)
            }}
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur">
              <FaUpload className="text-white/80" />
            </div>

            <div className="mt-4 text-base font-semibold">Drag & drop your resume (PDF)</div>
            <div className="mt-1 text-sm text-white/60">or choose a file from your computer</div>

            <div className="mt-4 flex items-center justify-center gap-3">
              <MotionButton
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
                type="button"
                disabled={busy}
              >
                Browse Files
              </MotionButton>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />

            <div className="mt-3 text-xs text-white/50">PDF only</div>

            {file ? (
              <motion.div
                className="mt-5 rounded-2xl border border-white/10 bg-slate-950/30 p-4"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/25 via-indigo-500/20 to-purple-600/25">
                    <FaRegFilePdf className="text-white/85" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white/90">{file.name}</div>
                    <div className="mt-0.5 text-xs text-white/55">Ready to upload</div>
                  </div>
                  <MotionButton
                    className="btn"
                    type="button"
                    onClick={() => setFile(null)}
                    disabled={busy}
                    title="Remove file"
                  >
                    <FaTimes />
                    Remove
                  </MotionButton>
                </div>
              </motion.div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <MotionButton className="btn btn-primary" onClick={onUpload} disabled={!file || busy}>
              {busy ? <FaSpinner className="animate-spin" /> : <FaUpload />}
              {busy ? 'Uploading…' : 'Upload & Parse'}
            </MotionButton>
            <MotionButton
              className="btn"
              onClick={startInterview}
              disabled={!parsedText.trim() || busy}
              title="Generate your first resume-based question"
            >
              Start Interview
            </MotionButton>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {parsedText ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <AnimatedCard title="Extracted Topics" subtitle="Detected skills & themes" icon={<FaRegFilePdf />}>
              {topics.length ? (
                <div className="flex flex-wrap gap-2">
                  {topics.map((t) => (
                    <span
                      key={t.label}
                      className="rounded-full border border-white/10 bg-white/10 backdrop-blur px-3 py-1 text-xs text-white/75"
                      title={`mentions: ${t.score}`}
                    >
                      {t.label}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-white/65">No obvious topics detected yet.</div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <MotionButton
                  className="btn"
                  onClick={() => {
                    navigator.clipboard.writeText(parsedText).catch(() => {})
                  }}
                >
                  Copy Resume Text
                </MotionButton>
              </div>
            </AnimatedCard>

            <AnimatedCard title="Resume Preview" subtitle="First ~1200 chars" icon={<FaRegFilePdf />}>
              <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3 text-sm text-white/80">
                {preview}
                {parsedText.length > preview.length ? '…' : ''}
              </div>
            </AnimatedCard>
          </div>
        ) : (
          <div className="mt-4">
            {busy ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <SkeletonBlock />
                <SkeletonBlock />
              </div>
            ) : (
              <div className="text-sm text-white/65">Upload a PDF resume to extract text.</div>
            )}
          </div>
        )}

        <div className="mt-4">
          <AnimatedCard title="Resume-based Interview" subtitle="Chat-style Q&A" icon={<FaRegFilePdf />}>
            <div className="h-[52vh] space-y-3 overflow-auto rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <ChatThread messages={messages} busy={busy} typingLabel="AI is responding…" />
            </div>

            <div className="mt-4 flex gap-3">
              <input
                className="input"
                placeholder={started ? 'Type your answer…' : 'Upload resume, then click Start Interview'}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !busy) sendAnswer()
                }}
                disabled={!started || busy}
              />
              <MotionButton className="btn btn-primary" onClick={sendAnswer} disabled={!started || busy || !answer.trim()}>
                <FaPaperPlane />
                Send
              </MotionButton>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <MotionButton className="btn" onClick={startInterview} disabled={!parsedText.trim() || busy}>
                Start / Next Question
              </MotionButton>
              <MotionButton
                className="btn"
                onClick={() => {
                  setStarted(false)
                  setAskedQuestions([])
                  setCurrentQuestion('')
                  setMessages([{ id: uid(), role: 'assistant', text: 'Session reset. Click “Start Interview”.' }])
                  setLatestEvaluation(null)
                }}
                disabled={busy}
              >
                Reset Session
              </MotionButton>
            </div>

            <div className="mt-4">
              {busy && started && !latestEvaluation ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <SkeletonBlock />
                  <SkeletonBlock />
                  <SkeletonBlock />
                </div>
              ) : null}

              {latestEvaluation ? (
                <motion.div
                  className="grid gap-3 md:grid-cols-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                      <FaCheckCircle />
                      Strengths
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-white/80">
                      {latestEvaluation.strengths?.length ? (
                        latestEvaluation.strengths.slice(0, 6).map((s, i) => (
                          <div key={i} className="rounded-lg border border-white/10 bg-slate-950/20 px-3 py-2">
                            {s}
                          </div>
                        ))
                      ) : (
                        <div className="text-white/60">No strengths returned.</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-rose-100">
                      <FaExclamationTriangle />
                      Weaknesses
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-white/80">
                      {latestEvaluation.improvements?.length ? (
                        latestEvaluation.improvements.slice(0, 6).map((s, i) => (
                          <div key={i} className="rounded-lg border border-white/10 bg-slate-950/20 px-3 py-2">
                            {s}
                          </div>
                        ))
                      ) : (
                        <div className="text-white/60">No weaknesses returned.</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-sky-100">
                      <FaLightbulb />
                      Suggestions
                    </div>
                    <div className="mt-3 space-y-3 text-sm text-white/80">
                      <div className="rounded-lg border border-white/10 bg-slate-950/20 px-3 py-2">
                        <div className="text-xs text-white/60">Suggested answer</div>
                        <div className="mt-1 whitespace-pre-wrap">{latestEvaluation.suggestedAnswer}</div>
                      </div>
                      {latestEvaluation.followUpQuestion ? (
                        <div className="rounded-lg border border-white/10 bg-slate-950/20 px-3 py-2">
                          <div className="text-xs text-white/60">Follow-up</div>
                          <div className="mt-1">{latestEvaluation.followUpQuestion}</div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </div>
          </AnimatedCard>
        </div>
      </motion.section>
    </div>
  )
}
