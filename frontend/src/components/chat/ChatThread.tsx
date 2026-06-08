import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FaCheck, FaRegCopy, FaRobot, FaUser } from 'react-icons/fa'
import TypingDots from '../TypingDots'

export type ChatRole = 'assistant' | 'user'

export type ChatMessage = {
  id: string
  role: ChatRole
  text: string
}

type Segment =
  | { type: 'text'; text: string }
  | { type: 'code'; lang?: string; code: string }

function parseFencedCode(input: string): Segment[] {
  const text = input ?? ''
  const segments: Segment[] = []

  const re = /```([a-zA-Z0-9_+-]*)?\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(text))) {
    const index = match.index
    if (index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, index) })
    }

    const lang = (match[1] || '').trim() || undefined
    const code = (match[2] || '').replace(/\s+$/, '')
    segments.push({ type: 'code', lang, code })

    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) })
  }

  // Normalize: merge adjacent text segments
  const merged: Segment[] = []
  for (const seg of segments) {
    if (seg.type === 'text' && merged.length && merged[merged.length - 1].type === 'text') {
      const prev = merged[merged.length - 1] as { type: 'text'; text: string }
      prev.text += seg.text
    } else {
      merged.push(seg)
    }
  }

  return merged
}

function InlineText({ text }: { text: string }) {
  // Minimal inline-code rendering: split on backticks.
  const parts = useMemo(() => {
    const raw = text ?? ''
    const out: Array<{ type: 'text' | 'code'; value: string }> = []

    const chunks = raw.split('`')
    for (let i = 0; i < chunks.length; i++) {
      const value = chunks[i]
      if (!value) continue
      out.push({ type: i % 2 === 1 ? 'code' : 'text', value })
    }
    return out
  }, [text])

  return (
    <>
      {parts.map((p, idx) =>
        p.type === 'code' ? (
          <code
            key={idx}
            className="rounded-md border border-white/10 bg-slate-950/40 px-1.5 py-0.5 font-mono text-[0.85em] text-white/85"
          >
            {p.value}
          </code>
        ) : (
          <span key={idx} className="whitespace-pre-wrap">
            {p.value}
          </span>
        )
      )}
    </>
  )
}

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(getText())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1100)
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-[11px] text-white/75 backdrop-blur transition hover:bg-white/15"
      title={copied ? 'Copied' : 'Copy'}
    >
      {copied ? <FaCheck className="h-3 w-3" /> : <FaRegCopy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function Avatar({ role }: { role: ChatRole }) {
  if (role === 'assistant') {
    return (
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/25 via-indigo-500/20 to-purple-600/25">
        <FaRobot className="text-white/80" />
      </div>
    )
  }

  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur">
      <FaUser className="text-white/70" />
    </div>
  )
}

function MessageContent({ text }: { text: string }) {
  const segments = useMemo(() => parseFencedCode(text), [text])

  return (
    <div className="space-y-3">
      {segments.map((seg, idx) => {
        if (seg.type === 'code') {
          return (
            <div key={idx} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-3 py-2">
                <div className="text-[11px] text-white/55">{seg.lang ?? 'code'}</div>
                <div className="opacity-0 transition-opacity group-hover:opacity-100">
                  <CopyButton getText={() => seg.code} />
                </div>
              </div>
              <pre className="max-h-[360px] overflow-auto p-3 text-xs text-white/85">
                <code className="font-mono whitespace-pre">{seg.code}</code>
              </pre>
            </div>
          )
        }

        return (
          <div key={idx} className="text-sm leading-relaxed text-white/85">
            <InlineText text={seg.text} />
          </div>
        )
      })}
    </div>
  )
}

function Bubble({ role, text }: { role: ChatRole; text: string }) {
  const isAssistant = role === 'assistant'

  return (
    <div className={isAssistant ? 'flex justify-start' : 'flex justify-end'}>
      <div className={isAssistant ? 'flex max-w-[92%] items-end gap-3' : 'flex max-w-[92%] flex-row-reverse items-end gap-3'}>
        <Avatar role={role} />
        <div className="group relative">
          <div
            className={
              isAssistant
                ? 'rounded-2xl border border-white/10 bg-white/10 backdrop-blur px-4 py-3'
                : 'rounded-2xl border border-white/10 bg-gradient-to-r from-blue-500/22 via-indigo-500/20 to-purple-600/22 px-4 py-3'
            }
          >
            <MessageContent text={text} />
          </div>

          {isAssistant ? (
            <div className="pointer-events-none absolute -top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="pointer-events-auto">
                <CopyButton getText={() => text} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function TypingBubble({ label }: { label: string }) {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[92%] items-end gap-3">
        <Avatar role="assistant" />
        <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur px-4 py-3">
          <TypingDots label={label} />
        </div>
      </div>
    </div>
  )
}

export default function ChatThread({
  messages,
  busy,
  typingLabel,
  className,
}: {
  messages: ChatMessage[]
  busy?: boolean
  typingLabel?: string
  className?: string
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  return (
    <div className={className ?? ''}>
      <div className="space-y-3">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Bubble role={m.role} text={m.text} />
          </motion.div>
        ))}

        {busy ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <TypingBubble label={typingLabel ?? 'AI is thinking…'} />
          </motion.div>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
