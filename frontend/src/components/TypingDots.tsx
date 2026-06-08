import { motion } from 'framer-motion'

export default function TypingDots({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-white/45"
          animate={{ y: [0, -4, 0], opacity: [0.45, 0.95, 0.45] }}
          transition={{
            duration: 0.9,
            ease: 'easeInOut',
            repeat: Infinity,
            delay: i * 0.12,
          }}
        />
      ))}
      {label ? <span className="ml-2 text-xs text-white/60">{label}</span> : null}
    </div>
  )
}
