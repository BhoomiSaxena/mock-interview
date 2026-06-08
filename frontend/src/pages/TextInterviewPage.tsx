import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  FaAmazon,
  FaBuilding,
  FaGoogle,
  FaMicrochip,
  FaPaperPlane,
  FaPlus,
  FaRedo,
  FaSpinner,
  FaStar,
} from 'react-icons/fa'
import AnimatedCard from '../components/AnimatedCard'
import { MotionButton } from '../components/MotionPrimitives'
import ChatThread, { type ChatMessage as ThreadMessage } from '../components/chat/ChatThread'
import { evaluateAnswer, generateQuestion, type AnswerEvaluation } from '../lib/api'
import { getErrorMessage } from '../lib/errors'

type ChatMsg = ThreadMessage

function uid() {
  return Math.random().toString(16).slice(2)
}

export default function TextInterviewPage() {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: uid(),
      role: 'assistant',
      text: 'Ready when you are. Click “New Question” to begin.',
    },
  ])
  const [askedQuestions, setAskedQuestions] = useState<string[]>([])
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const companyCards = useMemo(
    () => [
      { key: 'Google', label: 'Google', icon: <FaGoogle /> },
      { key: 'Amazon', label: 'Amazon', icon: <FaAmazon /> },
      { key: 'Microsoft', label: 'Microsoft', icon: <FaMicrochip /> },
    ],
    []
  )

  async function onNewQuestion() {
    setError(null)
    setBusy(true)
    setEvaluation(null)
    try {
      const q = await generateQuestion({
        askedQuestions,
      })
      setCurrentQuestion(q.question.question)
      setAskedQuestions((prev) => [...prev, q.question.question])
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', text: q.question.question },
      ])
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to generate question'))
    } finally {
      setBusy(false)
    }
  }

  async function onSendAnswer() {
    if (!currentQuestion.trim()) {
      setError('Generate a question first.')
      return
    }
    if (!answer.trim()) return

    const userAnswer = answer.trim()
    setAnswer('')
    setMessages((prev) => [...prev, { id: uid(), role: 'user', text: userAnswer }])

    setBusy(true)
    setError(null)

    try {
      const res = await evaluateAnswer({
        question: currentQuestion,
        answer: userAnswer,
      })
      setEvaluation(res.evaluation)
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          text: `Score: ${res.evaluation.score}/10 — ${res.evaluation.verdict}`,
        },
      ])

      // Ask the next question automatically (ChatGPT-like flow)
      const next = await generateQuestion({
        askedQuestions: [...askedQuestions, currentQuestion].slice(0, 50),
      })
      setCurrentQuestion(next.question.question)
      setAskedQuestions((prev) => [...prev, next.question.question])
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', text: next.question.question },
      ])
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to evaluate answer'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative grid items-start gap-4 lg:grid-cols-[minmax(0,1fr),360px]">
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-[40px] bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-600/10 blur-2xl" />
      <motion.section
        className="glass relative overflow-hidden p-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">Company Interview</div>
            <div className="text-xl font-semibold">Generate questions + practice</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <MotionButton className="btn" onClick={onNewQuestion} disabled={busy || askedQuestions.length === 0}>
              <FaRedo />
              Regenerate Questions
            </MotionButton>
            <MotionButton className="btn btn-primary" onClick={onNewQuestion} disabled={busy}>
              {busy ? <FaSpinner className="animate-spin" /> : <FaPlus />}
              {busy ? 'Generating…' : 'Generate Questions'}
            </MotionButton>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold">Company + Role</div>
            <div className="mt-3 grid gap-3">
              <label className="block">
                <div className="text-xs text-white/60">Company</div>
                <div className="mt-1 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2 ring-0 transition focus-within:border-indigo-400/40 focus-within:ring-2 focus-within:ring-indigo-400/30">
                  <FaBuilding className="text-white/60" />
                  <input
                    className="w-full bg-transparent text-sm text-white/90 outline-none placeholder:text-white/35"
                    placeholder="e.g., Google"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    disabled={busy}
                  />
                </div>
              </label>

              <label className="block">
                <div className="text-xs text-white/60">Role</div>
                <div className="mt-1 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2 ring-0 transition focus-within:border-indigo-400/40 focus-within:ring-2 focus-within:ring-indigo-400/30">
                  <FaMicrochip className="text-white/60" />
                  <input
                    className="w-full bg-transparent text-sm text-white/90 outline-none placeholder:text-white/35"
                    placeholder="e.g., SDE Intern"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={busy}
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold">Popular Companies</div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {companyCards.map((c) => {
                const active = company.trim().toLowerCase() === c.key.toLowerCase()
                return (
                  <motion.button
                    key={c.key}
                    type="button"
                    className={
                      'rounded-2xl border px-3 py-3 text-left transition ' +
                      (active
                        ? 'border-indigo-400/40 bg-white/10'
                        : 'border-white/10 bg-slate-950/30 hover:border-indigo-400/30 hover:bg-white/10')
                    }
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCompany(c.key)}
                    disabled={busy}
                    title={`Set company to ${c.key}`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
                      <span className="text-white/70">{c.icon}</span>
                      <span className="truncate">{c.label}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-white/55">Click to select</div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 h-[56vh] space-y-3 overflow-auto rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <ChatThread messages={messages} busy={busy} typingLabel="AI is thinking…" />
        </div>

        <div className="mt-4 flex gap-3">
          <input
            className="input"
            placeholder="Type your answer…"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !busy) onSendAnswer()
            }}
            disabled={busy}
          />
          <MotionButton className="btn btn-primary" onClick={onSendAnswer} disabled={busy || !answer.trim()}>
            <FaPaperPlane />
            Send
          </MotionButton>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
      </motion.section>

      <div className="space-y-4">
        <AnimatedCard title="Latest Evaluation" subtitle="Strengths + improvements" icon={<FaStar />}>
          {evaluation ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="text-white/70">Score</div>
                <div className="font-semibold">{evaluation.score}/10</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur p-3">
                <div className="text-xs text-white/60">Verdict</div>
                <div className="mt-1 text-white/85">{evaluation.verdict}</div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur p-3">
                  <div className="text-xs text-white/60">Strengths</div>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-white/80">
                    {evaluation.strengths?.slice(0, 6).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur p-3">
                  <div className="text-xs text-white/60">Improvements</div>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-white/80">
                    {evaluation.improvements?.slice(0, 6).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur p-3">
                <div className="text-xs text-white/60">Suggested answer</div>
                <div className="mt-1 text-white/80">{evaluation.suggestedAnswer}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur p-3">
                <div className="text-xs text-white/60">Follow-up</div>
                <div className="mt-1 text-white/80">{evaluation.followUpQuestion}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-white/65">
              Send an answer to see feedback here.
            </div>
          )}
        </AnimatedCard>
      </div>
    </div>
  )
}
