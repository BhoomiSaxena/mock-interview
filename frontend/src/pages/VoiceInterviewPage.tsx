import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  FaMicrophoneAlt,
  FaPlay,
  FaRedo,
  FaRegComments,
  FaStop,
  FaVolumeUp,
} from 'react-icons/fa'
import AnimatedCard from '../components/AnimatedCard'
import { MotionButton } from '../components/MotionPrimitives'
import { evaluateAnswer, generateQuestion, type AnswerEvaluation } from '../lib/api'
import { getErrorMessage } from '../lib/errors'

type SpeechRecognitionAlternativeLike = {
  transcript: string
  confidence?: number
}

type SpeechRecognitionResultLike = {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternativeLike
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

type SpeechRecognitionErrorEventLike = {
  error?: string
}

type SpeechRecognitionLike = {
  start: () => void
  stop: () => void
  abort?: () => void
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    // ignore
  }
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 1
  utterance.pitch = 1
  utterance.volume = 1
  window.speechSynthesis.speak(utterance)
}

function stopSpeaking() {
  if (!('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    // ignore
  }
}

function Waveform({ active }: { active: boolean }) {
  const bars = new Array(14).fill(0)
  return (
    <div className="flex items-end gap-1 h-8">
      {bars.map((_, i) => (
        <motion.span
          key={i}
          className="w-1 rounded-full bg-gradient-to-b from-indigo-200/70 to-purple-200/40"
          animate={
            active
              ? { height: [6, 26, 10, 22, 8], opacity: [0.5, 1, 0.7, 1, 0.6] }
              : { height: 6, opacity: 0.35 }
          }
          transition={
            active
              ? {
                  duration: 1.1,
                  repeat: Infinity,
                  repeatType: 'mirror',
                  delay: i * 0.03,
                  ease: 'easeInOut',
                }
              : { duration: 0.2 }
          }
        />
      ))}
    </div>
  )
}

function ListeningText({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-white/70">
      <span>{active ? 'Listening' : 'Idle'}</span>
      {active ? (
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-white/55"
              animate={{ y: [0, -3, 0], opacity: [0.45, 0.9, 0.45] }}
              transition={{ duration: 0.9, ease: 'easeInOut', repeat: Infinity, delay: i * 0.12 }}
            />
          ))}
        </span>
      ) : null}
    </div>
  )
}

function Spinner() {
  return (
    <motion.div
      className="h-6 w-6 rounded-full border-2 border-white/25 border-t-white/70"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
    />
  )
}

export default function VoiceInterviewPage() {
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [askedQuestions, setAskedQuestions] = useState<string[]>([])

  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [typedAnswer, setTypedAnswer] = useState('')

  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isListening, setIsListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])

  const [autoSpeakQuestion, setAutoSpeakQuestion] = useState(true)

  const [log, setLog] = useState<Array<{ id: string; role: 'ai' | 'user'; text: string }>>([
    {
      id: Math.random().toString(16).slice(2),
      role: 'ai',
      text: 'Click “New Question”, then answer with the mic.',
    },
  ])

  const speechSupported = useMemo(() => Boolean(getSpeechRecognition()), [])

  const micActive = isRecording || isListening
  const micProcessing = busy && !micActive
  const isSpeaking = isListening && Boolean(interim.trim())

  // Refs to avoid stale closures / race conditions
  const transcriptRef = useRef('')
  const interimRef = useRef('')
  const currentQuestionRef = useRef('')
  const askedQuestionsRef = useRef<string[]>([])
  const busyRef = useRef(false)
  const submittingRef = useRef(false)

  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  useEffect(() => {
    interimRef.current = interim
  }, [interim])

  useEffect(() => {
    currentQuestionRef.current = currentQuestion
  }, [currentQuestion])

  useEffect(() => {
    askedQuestionsRef.current = askedQuestions
  }, [askedQuestions])

  useEffect(() => {
    busyRef.current = busy
  }, [busy])

  useEffect(() => {
    if (!currentQuestion) return
    if (!autoSpeakQuestion) return
    speak(currentQuestion)
  }, [currentQuestion, autoSpeakQuestion])

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  function clearAnswerState() {
    setTranscript('')
    setInterim('')
    setTypedAnswer('')
    transcriptRef.current = ''
    interimRef.current = ''
  }

  function getFinalAnswer() {
    const combinedVoice = `${transcriptRef.current} ${interimRef.current}`.trim()
    return (typedAnswer || combinedVoice).trim()
  }

  function startRecording() {
    setError(null)
    setAudioUrl(null)
    audioChunksRef.current = []

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const recorder = new MediaRecorder(stream)
        mediaRecorderRef.current = recorder
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data)
        }
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop())
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const url = URL.createObjectURL(blob)
          setAudioUrl(url)
        }
        recorder.start()
        setIsRecording(true)
      })
      .catch((e) => {
        setError(e?.message || 'Microphone permission denied')
      })
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  function startListening() {
    setError(null)

    const SpeechRec = getSpeechRecognition()
    if (!SpeechRec) {
      setError('Speech recognition is not supported in this browser.')
      return
    }

    const rec = new SpeechRec()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (event) => {
      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        const text = res[0]?.transcript || ''
        if (res.isFinal) finalText += text
        else interimText += text
      }

      if (finalText) {
        setTranscript((prev) => {
          const next = (prev ? `${prev} ${finalText}` : finalText).trim()
          transcriptRef.current = next
          return next
        })
      }

      const nextInterim = interimText.trim()
      interimRef.current = nextInterim
      setInterim(nextInterim)
    }

    rec.onerror = (e) => {
      setError(e.error || 'Speech recognition error')
      setIsListening(false)
    }

    rec.onend = () => {
      setIsListening(false)
      setInterim('')

      // Auto-evaluate after voice input ends
      if (submittingRef.current || busyRef.current) {
        interimRef.current = ''
        return
      }

      const finalAnswer = `${transcriptRef.current} ${interimRef.current}`.trim()
      interimRef.current = ''

      if (finalAnswer && finalAnswer.trim().length > 0) {
        setTypedAnswer(finalAnswer)
        void submitAnswer(finalAnswer)
      }
    }

    recRef.current = rec
    setIsListening(true)
    rec.start()
  }

  function stopListening() {
    try {
      recRef.current?.stop()
    } finally {
      setIsListening(false)
      setInterim('')
      interimRef.current = ''
    }
  }

  function startAnswerCapture() {
    if (!speechSupported) {
      setError('Speech recognition is not supported in this browser.')
      return
    }
    clearAnswerState()
    startRecording()
    startListening()
  }

  function stopAnswerCapture() {
    stopRecording()
    stopListening()
  }

  async function onNewQuestion() {
    setError(null)
    setBusy(true)
    setEvaluation(null)

    try {
      const q = await generateQuestion({ askedQuestions: askedQuestionsRef.current })
      setCurrentQuestion(q.question.question)
      setAskedQuestions((prev) => [...prev, q.question.question])
      setLog((prev) => [
        ...prev,
        { id: Math.random().toString(16).slice(2), role: 'ai', text: q.question.question },
      ])
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to generate question'))
    } finally {
      setBusy(false)
    }
  }

  async function submitAnswer(answerText: string) {
    const finalAnswer = (answerText || '').trim()
    const questionToEval = currentQuestionRef.current

    if (!questionToEval.trim()) {
      setError('Generate a question first.')
      return
    }

    if (!finalAnswer || finalAnswer.trim().length === 0) {
      setError('Record or type an answer first.')
      return
    }

    if (busyRef.current || submittingRef.current) return

    submittingRef.current = true
    setBusy(true)
    setError(null)

    try {
      stopAnswerCapture()

      const res = await evaluateAnswer({
        question: questionToEval,
        answer: finalAnswer,
      })

      setEvaluation(res.evaluation)
      setLog((prev) => [
        ...prev,
        { id: Math.random().toString(16).slice(2), role: 'user', text: finalAnswer },
        {
          id: Math.random().toString(16).slice(2),
          role: 'ai',
          text: `Score: ${res.evaluation.score}/10 — ${res.evaluation.verdict}`,
        },
      ])

      const asked = Array.from(new Set([...askedQuestionsRef.current, questionToEval])).slice(0, 50)
      const next = await generateQuestion({ askedQuestions: asked })

      setCurrentQuestion(next.question.question)
      setAskedQuestions((prev) => {
        const nextArr = [...prev, next.question.question]
        askedQuestionsRef.current = nextArr
        return nextArr
      })

      setLog((prev) => [
        ...prev,
        { id: Math.random().toString(16).slice(2), role: 'ai', text: next.question.question },
      ])

      clearAnswerState()
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to evaluate answer'))
    } finally {
      submittingRef.current = false
      setBusy(false)
    }
  }

  async function onEvaluateClick() {
    const finalAnswer = getFinalAnswer()
    await submitAnswer(finalAnswer)
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr),340px]">
      <motion.section
        className="glass p-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">Voice Interview</div>
            <div className="text-xl font-semibold">Practice delivery + clarity</div>
          </div>
          <MotionButton className="btn btn-primary" onClick={onNewQuestion} disabled={busy}>
            <FaRegComments />
            New Question
          </MotionButton>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 backdrop-blur p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-white/60">Current question</div>
              <div className="mt-2 text-sm text-white/85">
                {currentQuestion || 'Click “New Question” to start.'}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <MotionButton
                className="btn"
                onClick={() => currentQuestion && speak(currentQuestion)}
                disabled={!currentQuestion}
                title="Replay question"
              >
                <FaVolumeUp />
                Replay
              </MotionButton>
              <MotionButton className="btn" onClick={stopSpeaking} title="Stop speaking">
                <FaStop />
                Stop
              </MotionButton>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-white/65">
              <input
                type="checkbox"
                checked={autoSpeakQuestion}
                onChange={(e) => setAutoSpeakQuestion(e.target.checked)}
              />
              Auto-speak questions
            </label>
            <div className="text-xs text-white/55">
              {'speechSynthesis' in window ? 'SpeechSynthesis enabled' : 'SpeechSynthesis unavailable'}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="glass p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Answer Capture</div>
                <div className="mt-1 text-xs text-white/60">Recording + live speech-to-text</div>
              </div>
              <Waveform active={micActive} />
            </div>

            <div className="mt-6 flex flex-col items-center text-center">
              <motion.button
                className={
                  micProcessing
                    ? 'relative grid h-24 w-24 place-items-center rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-xl'
                    : micActive
                      ? 'relative grid h-24 w-24 place-items-center rounded-[28px] border border-rose-400/30 bg-rose-500/15'
                      : 'relative grid h-24 w-24 place-items-center rounded-[28px] border border-white/15 bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-purple-600/20'
                }
                onClick={() => {
                  if (busy) return
                  if (micActive) stopAnswerCapture()
                  else startAnswerCapture()
                }}
                disabled={micProcessing}
                whileHover={{ scale: micProcessing ? 1 : 1.05 }}
                whileTap={{ scale: micProcessing ? 1 : 0.98 }}
                animate={
                  micActive
                    ? {
                        boxShadow: [
                          '0 0 0 0 rgba(244,63,94,0.00)',
                          '0 0 0 14px rgba(244,63,94,0.10)',
                          '0 0 0 0 rgba(244,63,94,0.00)',
                        ],
                      }
                    : {
                        boxShadow: [
                          '0 0 0 0 rgba(236,72,153,0.00)',
                          '0 0 0 10px rgba(236,72,153,0.06)',
                          '0 0 0 0 rgba(236,72,153,0.00)',
                        ],
                      }
                }
                transition={{ duration: micActive ? 1.15 : 2.6, repeat: Infinity, ease: 'easeInOut' }}
                title={micProcessing ? 'Processing' : micActive ? 'Stop' : 'Start'}
              >
                {/* Ripple when speaking */}
                {isSpeaking ? (
                  <>
                    <motion.span
                      className="absolute inset-0 rounded-[28px] border border-pink-400/25"
                      animate={{ scale: [1, 1.6], opacity: [0.35, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                    />
                    <motion.span
                      className="absolute inset-0 rounded-[28px] border border-indigo-300/20"
                      animate={{ scale: [1, 1.8], opacity: [0.25, 0] }}
                      transition={{ duration: 1.35, repeat: Infinity, ease: 'easeOut', delay: 0.25 }}
                    />
                  </>
                ) : null}

                {/* Inner glow */}
                <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br from-white/12 via-transparent to-transparent" />

                {micProcessing ? (
                  <div className="relative grid place-items-center">
                    <Spinner />
                  </div>
                ) : (
                  <FaMicrophoneAlt className={micActive ? 'relative text-rose-200 text-2xl' : 'relative text-white/80 text-2xl'} />
                )}
              </motion.button>

              <div className="mt-3">
                <div className="text-sm font-medium">
                  {micProcessing ? 'Processing…' : micActive ? 'Listening…' : 'Tap to answer'}
                </div>
                <div className="mt-1">
                  <ListeningText active={micActive} />
                </div>
                <div className="mt-1 text-xs text-white/60">
                  {speechSupported ? 'Web Speech API enabled' : 'SpeechRecognition not supported'}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <MotionButton
                  className="btn"
                  onClick={() => {
                    clearAnswerState()
                    setEvaluation(null)
                    setError(null)
                  }}
                  disabled={busy}
                >
                  <FaRedo />
                  Reset
                </MotionButton>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/30 p-3 text-sm text-white/80">
              {transcript || <span className="text-white/60">Transcript will appear here…</span>}
              {interim ? <span className="text-white/50"> {interim}</span> : null}
            </div>

            <div className="mt-3">
              <div className="text-xs text-white/60">Or type your answer (code-friendly)</div>
              <textarea
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs text-white/85 outline-none focus:border-white/25 font-mono min-h-[140px]"
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                placeholder="Type your answer here…"
                disabled={busy}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {audioUrl ? (
                <>
                  <MotionButton
                    className="btn"
                    onClick={() => {
                      const el = document.getElementById('voice-audio') as HTMLAudioElement | null
                      el?.play().catch(() => {})
                    }}
                  >
                    <FaPlay />
                    Play
                  </MotionButton>
                  <a className="btn" href={audioUrl} download="answer.webm">
                    <FaPlay />
                    Download
                  </a>
                </>
              ) : (
                <div className="text-xs text-white/60">Record to enable playback.</div>
              )}
            </div>

            {audioUrl ? <audio id="voice-audio" className="mt-3 w-full" controls src={audioUrl} /> : null}
          </div>

          <div className="glass p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Interview Log</div>
              <div className="text-xs text-white/60">History</div>
            </div>
            <div className="mt-3 h-[360px] space-y-2 overflow-auto rounded-2xl border border-white/10 bg-slate-950/30 p-3">
              {log.map((m) => (
                <motion.div
                  key={m.id}
                  className={m.role === 'ai' ? 'flex justify-start' : 'flex justify-end'}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <div
                    className={
                      m.role === 'ai'
                        ? 'max-w-[85%] rounded-2xl bg-white/10 backdrop-blur px-3 py-2 text-xs text-white/80 border border-white/10'
                        : 'max-w-[85%] rounded-2xl bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-600/20 px-3 py-2 text-xs text-white border border-white/10'
                    }
                  >
                    {m.text}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <MotionButton className="btn btn-primary" onClick={onEvaluateClick} disabled={busy}>
                Evaluate + Next
              </MotionButton>
              <MotionButton className="btn" onClick={() => setLog((prev) => prev.slice(0, 1))} disabled={busy}>
                Clear Log
              </MotionButton>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
      </motion.section>

      <div className="space-y-4">
        <AnimatedCard title="Evaluation" subtitle="Feedback and a follow-up" icon={<FaRegComments />}>
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
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur p-3">
                <div className="text-xs text-white/60">Improvements</div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-white/80">
                  {evaluation.improvements?.slice(0, 7).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur p-3">
                <div className="text-xs text-white/60">Follow-up</div>
                <div className="mt-1 text-white/80">{evaluation.followUpQuestion}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-white/65">Evaluate to see feedback here.</div>
          )}
        </AnimatedCard>
      </div>
    </div>
  )
}
