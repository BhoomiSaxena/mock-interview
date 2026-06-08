import { motion } from 'framer-motion'

type Particle = {
  key: string
  size: number
  left: string
  top: string
  duration: number
  delay: number
  blurClass: string
  opacityClass: string
}

const particles: Particle[] = [
  { key: 'p1', size: 6, left: '8%', top: '22%', duration: 34, delay: 0, blurClass: 'blur-[1px]', opacityClass: 'opacity-35' },
  { key: 'p2', size: 10, left: '18%', top: '68%', duration: 46, delay: 2, blurClass: 'blur-[2px]', opacityClass: 'opacity-30' },
  { key: 'p3', size: 8, left: '28%', top: '34%', duration: 40, delay: 6, blurClass: 'blur-[1px]', opacityClass: 'opacity-30' },
  { key: 'p4', size: 5, left: '36%', top: '80%', duration: 52, delay: 1, blurClass: 'blur-[1px]', opacityClass: 'opacity-25' },
  { key: 'p5', size: 7, left: '44%', top: '18%', duration: 44, delay: 4, blurClass: 'blur-[2px]', opacityClass: 'opacity-25' },
  { key: 'p6', size: 12, left: '52%', top: '58%', duration: 58, delay: 3, blurClass: 'blur-[2px]', opacityClass: 'opacity-20' },
  { key: 'p7', size: 6, left: '60%', top: '30%', duration: 42, delay: 7, blurClass: 'blur-[1px]', opacityClass: 'opacity-30' },
  { key: 'p8', size: 9, left: '68%', top: '74%', duration: 48, delay: 5, blurClass: 'blur-[2px]', opacityClass: 'opacity-25' },
  { key: 'p9', size: 5, left: '76%', top: '20%', duration: 54, delay: 8, blurClass: 'blur-[1px]', opacityClass: 'opacity-25' },
  { key: 'p10', size: 11, left: '84%', top: '46%', duration: 60, delay: 0.5, blurClass: 'blur-[2px]', opacityClass: 'opacity-20' },
  { key: 'p11', size: 7, left: '92%', top: '66%', duration: 50, delay: 6.5, blurClass: 'blur-[1px]', opacityClass: 'opacity-25' },
  { key: 'p12', size: 6, left: '14%', top: '44%', duration: 56, delay: 9, blurClass: 'blur-[1px]', opacityClass: 'opacity-25' },
  { key: 'p13', size: 9, left: '32%', top: '54%', duration: 62, delay: 2.5, blurClass: 'blur-[2px]', opacityClass: 'opacity-20' },
  { key: 'p14', size: 6, left: '48%', top: '86%', duration: 64, delay: 4.5, blurClass: 'blur-[1px]', opacityClass: 'opacity-20' },
  { key: 'p15', size: 8, left: '70%', top: '10%', duration: 66, delay: 1.5, blurClass: 'blur-[1px]', opacityClass: 'opacity-20' },
  { key: 'p16', size: 10, left: '86%', top: '86%', duration: 68, delay: 7.5, blurClass: 'blur-[2px]', opacityClass: 'opacity-20' },
]

export default function AnimatedBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Animated gradient base (blue → indigo → purple) */}
      <motion.div
        className="absolute -inset-[35%] opacity-80 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700"
        animate={{
          x: [-60, 50, -60],
          y: [-30, 40, -30],
          rotate: [0, 8, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{ duration: 46, ease: 'easeInOut', repeat: Infinity }}
      />

      <motion.div
        className="absolute -inset-[35%] opacity-40 bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-600"
        animate={{
          x: [45, -55, 45],
          y: [35, -25, 35],
          rotate: [0, -10, 0],
          scale: [1.02, 1.12, 1.02],
        }}
        transition={{ duration: 58, ease: 'easeInOut', repeat: Infinity }}
      />

      {/* Subtle vignette / depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/45 to-slate-950/70" />

      {/* Floating blurred circles (glass blobs) */}
      <motion.div
        className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full blur-3xl bg-gradient-to-br from-blue-500/40 via-indigo-500/25 to-purple-600/20"
        animate={{ x: ['-50%', '-52%', '-50%'], y: [-10, 18, -10], scale: [1, 1.04, 1] }}
        transition={{ duration: 48, ease: 'easeInOut', repeat: Infinity }}
      />

      <motion.div
        className="absolute -left-52 top-[18%] h-[520px] w-[520px] rounded-full blur-3xl bg-gradient-to-br from-blue-500/25 via-indigo-500/20 to-purple-600/15"
        animate={{ x: [0, 60, 0], y: [0, -30, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 56, ease: 'easeInOut', repeat: Infinity }}
      />

      <motion.div
        className="absolute -right-56 top-[42%] h-[560px] w-[560px] rounded-full blur-3xl bg-gradient-to-br from-purple-600/22 via-indigo-500/20 to-blue-500/12"
        animate={{ x: [0, -70, 0], y: [0, 40, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 62, ease: 'easeInOut', repeat: Infinity }}
      />

      <motion.div
        className="absolute bottom-[-260px] left-[18%] h-[520px] w-[520px] rounded-full blur-3xl bg-gradient-to-br from-indigo-500/25 via-purple-600/20 to-blue-500/12"
        animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 58, ease: 'easeInOut', repeat: Infinity }}
      />

      {/* Slow moving particles / shapes */}
      <div className="absolute inset-0">
        {particles.map((p, idx) => (
          <motion.div
            key={p.key}
            className={[
              'absolute rounded-full bg-white/70 mix-blend-soft-light',
              p.blurClass,
              p.opacityClass,
            ].join(' ')}
            style={{
              width: p.size,
              height: p.size,
              left: p.left,
              top: p.top,
            }}
            animate={{
              x: [0, idx % 2 === 0 ? 28 : -22, 0],
              y: [0, idx % 3 === 0 ? -34 : 26, 0],
              opacity: [0.18, 0.45, 0.18],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: 'easeInOut',
              repeat: Infinity,
            }}
          />
        ))}
      </div>

      {/* Subtle glow line near the top */}
      <motion.div
        className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-white/12 via-white/5 to-transparent"
        animate={{ opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 10, ease: 'easeInOut', repeat: Infinity }}
      />
    </div>
  )
}
